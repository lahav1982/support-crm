// api/cron-job.js
// Called by Vercel Cron once daily at 11:00 UTC (6am EST)
// Vercel sends GET requests with Authorization: Bearer <CRON_SECRET>
// Hobby plan: 1 cron max per project. Pro plan: multiple crons allowed.

export default async function handler(req, res) {
  // Vercel cron sends GET; also accept POST for manual triggering
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify auth — Vercel sends CRON_SECRET as Bearer token automatically
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error("Cron: unauthorized attempt from", req.headers["x-forwarded-for"] || "unknown");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startTime = Date.now();
  const log = [];

  console.log(`[Cron] Starting scheduled job at ${new Date().toISOString()}`);

  // ── Step 1: Gmail Sync ─────────────────────────────────────────────────────
  try {
    log.push({ step: "gmail-sync", status: "starting" });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Run gmail sync inline (same logic, avoids HTTP call to self which can timeout)
    const syncResult = await runGmailSync(supabaseUrl, supabaseKey, anthropicKey);
    log.push({ step: "gmail-sync", status: "ok", ...syncResult });
    console.log(`[Cron] Gmail sync complete:`, syncResult);
  } catch (e) {
    log.push({ step: "gmail-sync", status: "error", error: e.message });
    console.error("[Cron] Gmail sync failed:", e.message);
    // Don't stop — still run insights even if sync fails
  }

  // ── Step 2: AI Insights Analysis ──────────────────────────────────────────
  try {
    log.push({ step: "insights", status: "starting" });

    const supabaseUrl  = process.env.SUPABASE_URL;
    const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const insightsResult = await runInsightsAnalysis(supabaseUrl, supabaseKey, anthropicKey);
    log.push({ step: "insights", status: "ok", issueCount: insightsResult?.issues?.length ?? 0 });
    console.log(`[Cron] Insights complete: ${insightsResult?.issues?.length ?? 0} issues found`);
  } catch (e) {
    log.push({ step: "insights", status: "error", error: e.message });
    console.error("[Cron] Insights failed:", e.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Cron] Job complete in ${duration}s`);

  return res.status(200).json({
    ok:       true,
    duration: duration + "s",
    ranAt:    new Date().toISOString(),
    log,
  });
}

// ── Gmail Sync (inline copy of the core logic) ─────────────────────────────

async function runGmailSync(supabaseUrl, supabaseKey, anthropicKey) {
  const settingsRes = await fetch(
    supabaseUrl + "/rest/v1/settings?id=eq.1&select=*",
    { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
  );
  const s = (await settingsRes.json())?.[0];
  if (!s?.gmail_connected || !s?.gmail_access_token) {
    return { skipped: true, reason: "Gmail not connected" };
  }

  let accessToken = s.gmail_access_token;
  if (Date.now() > (s.gmail_token_expiry - 60000)) {
    accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
  }

  const existingRes = await fetch(
    supabaseUrl + "/rest/v1/tickets?select=id,gmail_message_id,gmail_thread_id,replies,status&gmail_message_id=not.is.null",
    { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
  );
  const existingRows = await existingRes.json() || [];

  const importedMessageIds = new Set(existingRows.map(r => r.gmail_message_id));
  for (const row of existingRows) {
    for (const reply of (row.replies || [])) {
      if (reply.id) importedMessageIds.add(reply.id);
    }
  }
  const threadToTicket = {};
  for (const row of existingRows) {
    if (row.gmail_thread_id) threadToTicket[row.gmail_thread_id] = row;
  }

  const results = { imported: 0, threadReplies: 0, rejected: 0, skipped: 0 };

  // Thread scan
  for (const threadId of Object.keys(threadToTicket)) {
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    if (!threadRes.ok) continue;
    const threadData  = await threadRes.json();

    for (const msgData of (threadData.messages || [])) {
      if (importedMessageIds.has(msgData.id)) continue;
      if ((msgData.labelIds || []).includes("SENT")) continue;

      const parsed = parseGmailMessage(msgData);
      if (!parsed.fromEmail) continue;

      const existingTicket = threadToTicket[threadId];
      const currentReplies = existingTicket.replies || [];

      await fetch(supabaseUrl + "/rest/v1/tickets?id=eq." + existingTicket.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "return=minimal" },
        body: JSON.stringify({
          replies: [...currentReplies, { id: msgData.id, author: parsed.fromName || parsed.fromEmail, body: parsed.body, timestamp: Date.now(), fromEmail: parsed.fromEmail, isCustomer: true }],
          status: existingTicket.status === "resolved" ? "open" : existingTicket.status,
        }),
      });

      existingTicket.replies = [...currentReplies, { id: msgData.id }];
      importedMessageIds.add(msgData.id);
      results.threadReplies++;
    }
  }

  // Inbox scan for new emails
  const keywords = (s.gmail_filter_keywords || "").split(",").map(k => k.trim()).filter(Boolean);
  const domains  = (s.gmail_filter_domains  || "").split(",").map(d => d.trim()).filter(Boolean);

  let gmailQuery = "in:inbox";
  if (keywords.length > 0) gmailQuery += " (" + keywords.map(k => `subject:"${k}"`).join(" OR ") + ")";
  if (domains.length  > 0) gmailQuery += " (" + domains.map(d  => "from:@" + d.replace(/^@/, "")).join(" OR ") + ")";
  gmailQuery += " -from:noreply -from:no-reply -from:donotreply -from:notifications -category:promotions -category:social -in:sent -in:drafts";

  const listRes  = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40&q=" + encodeURIComponent(gmailQuery),
    { headers: { Authorization: "Bearer " + accessToken } }
  );
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed");

  for (const msg of (listData.messages || [])) {
    if (importedMessageIds.has(msg.id)) { results.skipped++; continue; }

    const msgRes  = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, { headers: { Authorization: "Bearer " + accessToken } });
    const msgData = await msgRes.json();
    const parsed  = parseGmailMessage(msgData);
    if (!parsed.fromEmail) { results.skipped++; continue; }

    const threadId = msgData.threadId;
    if (threadId && threadToTicket[threadId]) { results.skipped++; continue; }

    const triage = await triageEmail(parsed, s, anthropicKey);
    if (triage.type === "ignore") { results.rejected++; continue; }

    if (triage.type === "sales") {
      await fetch(supabaseUrl + "/rest/v1/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "return=minimal" },
        body: JSON.stringify({
          customer_name: parsed.fromName || parsed.fromEmail,
          customer_email: parsed.fromEmail,
          message: parsed.body,
          notes: "", estimated_value: "Unknown", stage: "new", source: "email",
          gmail_message_id: msg.id, created_at: parsed.sentAt,
        }),
      });
      importedMessageIds.add(msg.id);
      results.imported++;
      continue;
    }

    const saveRes = await fetch(supabaseUrl + "/rest/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "return=representation" },
      body: JSON.stringify({
        customer_name: parsed.fromName || parsed.fromEmail, customer_email: parsed.fromEmail,
        subject: parsed.subject, body: parsed.body, status: "open",
        priority: triage.priority || "medium", tag: triage.tag || "General",
        assigned_to: 1, notes: "", replies: [], type: "email",
        gmail_message_id: msg.id, gmail_thread_id: threadId,
        created_at: parsed.sentAt,
      }),
    });

    if (saveRes.ok) {
      const saved = await saveRes.json();
      if (saved?.[0] && threadId) threadToTicket[threadId] = { id: saved[0].id, gmail_thread_id: threadId, replies: [] };
    }
    importedMessageIds.add(msg.id);
    results.imported++;
  }

  return results;
}

// ── Insights Analysis (inline) ─────────────────────────────────────────────

async function runInsightsAnalysis(supabaseUrl, supabaseKey, anthropicKey) {
  const ticketsRes = await fetch(
    supabaseUrl + "/rest/v1/tickets?select=*&order=created_at.desc&limit=200",
    { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
  );
  const tickets = await ticketsRes.json() || [];
  if (tickets.length === 0) return { issues: [] };

  const settingsRes = await fetch(
    supabaseUrl + "/rest/v1/settings?id=eq.1&select=company_name,products",
    { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
  );
  const settings = (await settingsRes.json())?.[0] || {};

  const messagesSummary = tickets.map(t => [
    "---",
    `ID:${t.id} | Date:${t.created_at?.slice(0,10)} | Tag:${t.tag||"General"} | Priority:${t.priority} | Status:${t.status}`,
    `Subject: ${t.subject}`,
    `Body: ${(t.body||"").slice(0,300)}`,
  ].join("\n")).join("\n");

  const companyCtx = settings.company_name
    ? `Company: ${settings.company_name}${settings.products ? `. Products: ${settings.products}` : ""}.`
    : "A business support inbox.";

  const prompt = `You are a product insights analyst. Analyze these customer support messages and identify top issues.

${companyCtx}
Total: ${tickets.length} messages

${messagesSummary}

Respond ONLY with valid JSON:
{"issues":[{"id":"slug","title":"Short title","description":"2-3 sentences","severity":"critical|high|medium|low","count":0,"percentage":0,"trend":"rising|stable|declining","trendReason":"one sentence","affectedArea":"Shipping|Product Quality|Billing|Account|Returns|Communication|Website|Packaging|Other","sentiment":"very_negative|negative|neutral|mixed","examples":["example1","example2"],"customerImpact":"one sentence","recommendation":"actionable recommendation","urgency":"immediate|this-week|this-month|monitor","relatedTicketIds":[]}],"summary":{"topProblemArea":"area","overallSentiment":"positive|mixed|negative|very_negative","healthScore":0,"keyWin":"one thing going well","biggestRisk":"biggest risk","executiveSummary":"3-4 sentences"}}`;

  const aiRes  = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });
  const aiData = await aiRes.json();
  const text   = aiData.content?.map(c => c.text || "").join("") || "{}";
  const result = JSON.parse(text.replace(/```json|```/g, "").trim());

  const final = { ...result, meta: { analyzedCount: tickets.length, generatedAt: new Date().toISOString(), source: "cron" } };

  await fetch(supabaseUrl + "/rest/v1/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: 1, data: final, updated_at: new Date().toISOString() }),
  });

  return final;
}

// ── Shared helpers ─────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken, supabaseUrl, supabaseKey) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error("Token refresh failed: " + data.error);
  await fetch(supabaseUrl + "/rest/v1/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ id: 1, gmail_access_token: data.access_token, gmail_token_expiry: Date.now() + ((data.expires_in || 3600) * 1000) }),
  });
  return data.access_token;
}

async function triageEmail(parsed, settings, anthropicKey) {
  try {
    const companyCtx = s?.company_name ? "This is the inbox for " + s.company_name + (s.products ? ", which sells: " + s.products : "") + "." : "This is a customer support inbox.";
    const prompt = `${companyCtx}

Classify this email into exactly one of three categories. Be conservative — when in doubt, use "ignore".

From: ${parsed.fromEmail}
Subject: ${parsed.subject}
Body:
${parsed.body.slice(0, 800)}

CATEGORY RULES:

"sales" — ONLY if a real person is clearly asking a pre-purchase question about buying something. Must show genuine buying intent. Examples that qualify:
- "How much does X cost?" / "Do you ship to [country]?" / "Is X available?"
- "I'd like to order [product], how do I...?"
- "Do you do bulk/wholesale orders?"
- "What's included in the [product]?" when clearly from a prospective buyer
- Shopify Inbox chat messages from customers asking about products
EXCLUDE from "sales": automated Shopify emails, order confirmations, app charge approvals, billing notifications, payment receipts, subscription updates, anything from noreply/automated senders, anything that is clearly a system notification.

"support" — existing customer with a problem they need help with: wrong item, missing delivery, refund request, complaint, exchange, account issue.

"ignore" — everything else: newsletters, receipts, automated notifications, app approvals, billing alerts, cold outreach, spam, internal emails, anything from an automated/noreply sender.

Respond ONLY with valid JSON, no markdown:
{"type":"support|sales|ignore","reason":"one sentence","tag":"Shipping|Refund|Account|Exchange|Technical|General|Complaint|Billing|Inquiry|Pricing|Wholesale","priority":"high|medium|low"}`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content: prompt }] }),
    });
    const d    = await r.json();
    const text = d.content?.map(c => c.text || "").join("") || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { type: "support", reason: "AI triage failed — imported by default", tag: "General", priority: "medium" };
  }
}

function parseGmailMessage(msg) {
  const headers = msg.payload?.headers || [];
  const get     = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  const from    = get("From");
  const m       = from.match(/<(.+?)>/);
  let fromEmail = m ? m[1] : from.trim();
  let fromName  = from.replace(/<.+?>/, "").replace(/"/g, "").trim() || fromEmail;
  let body = "";
  function extract(part) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) body = Buffer.from(part.body.data, "base64").toString("utf8").slice(0, 2000);
    else if (part.parts) part.parts.forEach(extract);
  }
  extract(msg.payload);
  if (!body && msg.snippet) body = msg.snippet;
  body = body.replace(/^>.*$/gm,"").replace(/\r\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();

  // ── Shopify message parser ────────────────────────────────────────────────
  if (body.includes("Translation Missing") || body.includes("contact form")) {
    const nameMatch  = body.match(/(?:Translation Missing:[^:]+name|name)[:\s]+([^
]+)/i);
    const bodyMatch  = body.match(/(?:Translation Missing:[^:]+body|message|body)[:\s]+([\s\S]+?)(?:Country Code:|$)/i);
    const emailMatch2 = body.match(/Email[:\s]+([^\s
]+@[^\s
]+)/i);
    const extractedName  = nameMatch?.[1]?.trim();
    const extractedEmail = emailMatch2?.[1]?.trim();
    const extractedBody  = bodyMatch?.[1]?.trim();
    if (extractedBody) {
      body = extractedBody;
      if (extractedName)  fromName  = extractedName;
      if (extractedEmail) fromEmail = extractedEmail;
    }
  } else if (
    body.toLowerCase().includes("sent you a message") ||
    body.toLowerCase().includes("shopify inbox") ||
    get("From").toLowerCase().includes("shopify.com")
  ) {
    const inboxMatch =
      body.match(/sent you a message[:\s
]+([\s\S]+?)(?:

|Reply to this|View conversation|--)/i) ||
      body.match(/message:[\s
]+([\s\S]+?)(?:

|Reply|View|--)/i);
    const nameFromSubject = get("Subject").match(/(?:new message from|message from)\s+(.+)/i)?.[1]?.trim();
    if (inboxMatch?.[1]?.trim()) body = inboxMatch[1].trim();
    if (nameFromSubject) fromName = nameFromSubject;
  }

  const sentAt = msg.internalDate
    ? new Date(parseInt(msg.internalDate)).toISOString()
    : new Date().toISOString();
  return { fromEmail, fromName, subject: get("Subject") || "(no subject)", body: body || msg.snippet || "(empty)", sentAt };
}
