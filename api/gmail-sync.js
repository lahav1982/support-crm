import { requireAuth } from "./_auth.js";
// api/gmail-sync.js — AI triage + bulletproof thread tracking
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // ── 1. Load settings + tokens ───────────────────────────────────────────
    const settingsRes = await fetch(
      supabaseUrl + "/rest/v1/settings?id=eq.1&select=*",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    const s = (await settingsRes.json())?.[0];
    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected" });
    }

    // ── 2. Refresh token if needed ──────────────────────────────────────────
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // ── 3. Load all known tickets with Gmail data ───────────────────────────
    const existingRes = await fetch(
      supabaseUrl + "/rest/v1/tickets?select=id,gmail_message_id,gmail_thread_id,replies,status&gmail_message_id=not.is.null",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    const existingRows = await existingRes.json() || [];

    // Track all message IDs already in DB (to avoid duplicates)
    const importedMessageIds = new Set(existingRows.map(r => r.gmail_message_id));
    // Also collect all reply message IDs that were appended to tickets
    for (const row of existingRows) {
      for (const reply of (row.replies || [])) {
        if (reply.id) importedMessageIds.add(reply.id);
      }
    }

    // Map threadId → ticket row
    const threadToTicket = {};
    for (const row of existingRows) {
      if (row.gmail_thread_id) threadToTicket[row.gmail_thread_id] = row;
    }

    const results = { imported: 0, threadReplies: 0, rejected: 0, skipped: 0, details: [] };

    // ── 4. THREAD SCAN: check every known thread for new replies ───────────
    // This is the key fix — runs regardless of inbox filters, catches all
    // customer replies no matter how Gmail labels or routes them
    const knownThreadIds = Object.keys(threadToTicket);
    for (const threadId of knownThreadIds) {
      const threadRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/threads/" + threadId + "?format=full",
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      if (!threadRes.ok) continue;
      const threadData = await threadRes.json();
      const threadMessages = threadData.messages || [];

      for (const msgData of threadMessages) {
        const msgId = msgData.id;
        if (importedMessageIds.has(msgId)) continue; // already have it

        const parsed = parseGmailMessage(msgData);
        if (!parsed.fromEmail) continue;

        // Skip messages sent by us (they're in the thread but we sent them)
        const labels = msgData.labelIds || [];
        if (labels.includes("SENT")) continue;

        const existingTicket = threadToTicket[threadId];
        const currentReplies = existingTicket.replies || [];
        const newReply = {
          id:        msgId,
          author:    parsed.fromName || parsed.fromEmail,
          body:      parsed.body,
          timestamp: Date.now(),
          fromEmail: parsed.fromEmail,
          isCustomer: true,
        };

        await fetch(supabaseUrl + "/rest/v1/tickets?id=eq." + existingTicket.id, {
          method: "PATCH",
          headers: {
            "Content-Type":  "application/json",
            "apikey":        supabaseKey,
            "Authorization": "Bearer " + supabaseKey,
            "Prefer":        "return=minimal",
          },
          body: JSON.stringify({
            replies: [...currentReplies, newReply],
            status:  existingTicket.status === "resolved" ? "open" : existingTicket.status,
          }),
        });

        // Update in-memory so we don't double-add within same sync
        existingTicket.replies = [...currentReplies, newReply];
        importedMessageIds.add(msgId);

        results.threadReplies++;
        results.details.push({
          subject:  parsed.subject,
          from:     parsed.fromEmail,
          decision: "thread_reply",
          reason:   "Customer reply on existing conversation (ticket #" + existingTicket.id + ")",
        });
      }
    }

    // ── 5. INBOX SCAN: find brand new support emails ────────────────────────
    const keywords = (s.gmail_filter_keywords || "").split(",").map(k => k.trim()).filter(Boolean);
    const domains  = (s.gmail_filter_domains  || "").split(",").map(d => d.trim()).filter(Boolean);

    let gmailQuery = "in:inbox";
    if (keywords.length > 0 || domains.length > 0) {
      const parts = [];
      if (keywords.length > 0) parts.push("(" + keywords.map(k => 'subject:"' + k + '"').join(" OR ") + ")");
      if (domains.length > 0)  parts.push("(" + domains.map(d => "from:@" + d.replace(/^@/, "")).join(" OR ") + ")");
      gmailQuery += " " + (parts.length > 1 ? "(" + parts.join(" OR ") + ")" : parts[0]);
    }
    gmailQuery += " -from:noreply -from:no-reply -from:donotreply -from:notifications -category:promotions -category:social -in:sent -in:drafts";

    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40&q=" + encodeURIComponent(gmailQuery),
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed");

    for (const msg of (listData.messages || [])) {
      if (importedMessageIds.has(msg.id)) { results.skipped++; continue; }

      const msgRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "?format=full",
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      const msgData = await msgRes.json();
      const parsed  = parseGmailMessage(msgData);
      if (!parsed.fromEmail) { results.skipped++; continue; }

      const threadId = msgData.threadId;

      // If it's part of a known thread, thread scan already handled it
      if (threadId && threadToTicket[threadId]) { results.skipped++; continue; }

      // AI triage — classifies as support, sales, or ignore
      // Shopify Inbox emails are included and evaluated by the AI like any other email
      const triage = await triageEmail(parsed, s, anthropicKey);
      results.details.push({
        subject:  parsed.subject,
        from:     parsed.fromEmail,
        decision: triage.type,
        reason:   triage.reason,
        tag:      triage.tag,
        priority: triage.priority,
      });

      if (triage.type === "ignore") { results.rejected++; continue; }

      if (triage.type === "sales") {
        // Route to opportunities table
        await fetch(supabaseUrl + "/rest/v1/opportunities", {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "apikey":        supabaseKey,
            "Authorization": "Bearer " + supabaseKey,
            "Prefer":        "return=minimal",
          },
          body: JSON.stringify({
            customer_name:    parsed.fromName || parsed.fromEmail,
            customer_email:   parsed.fromEmail,
            message:          parsed.body,
            notes:            "",
            estimated_value:  "Unknown",
            stage:            "new",
            source:           "email",
            gmail_message_id: msg.id,
            created_at:       parsed.sentAt,
          }),
        });
        importedMessageIds.add(msg.id);
        results.imported++;
        continue;
      }

      // type === "support" — save to tickets as before
      const saveRes = await fetch(supabaseUrl + "/rest/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer":        "return=representation",
        },
        body: JSON.stringify({
          customer_name:    parsed.fromName || parsed.fromEmail,
          customer_email:   parsed.fromEmail,
          subject:          parsed.subject,
          body:             parsed.body,
          status:           "open",
          priority:         triage.priority || "medium",
          tag:              triage.tag      || "General",
          assigned_to:      1,
          notes:            "",
          replies:          [],
          type:             "email",
          gmail_message_id: msg.id,
          gmail_thread_id:  threadId,
          created_at:       parsed.sentAt,
        }),
      });

      if (saveRes.ok) {
        const saved = await saveRes.json();
        if (saved?.[0] && threadId) threadToTicket[threadId] = { id: saved[0].id, gmail_thread_id: threadId, replies: [] };
      }
      importedMessageIds.add(msg.id);
      results.imported++;
    }

    return res.status(200).json(results);

  } catch (e) {
    console.error("Gmail sync error:", e);
    return res.status(500).json({ error: e.message });
  }
}

// ── AI triage ────────────────────────────────────────────────────────────────
async function triageEmail(parsed, settings, anthropicKey) {
  // ── Hard pre-filters: block known automated/system senders before calling AI ──
  const email   = (parsed.fromEmail || "").toLowerCase();
  const subject = (parsed.subject   || "").toLowerCase();
  const body    = (parsed.body      || "").toLowerCase();

  const IGNORE_SENDERS = [
    "noreply", "no-reply", "do-not-reply", "donotreply",
    "notifications@", "billing@shopify", "billing@stripe",
    "shopify.com", "stripe.com", "paypal.com", "mailer@",
    "automated@", "system@", "accounts@shopify", "partners@shopify",
  ];
  const IGNORE_SUBJECT_PATTERNS = [
    "recurring charge", "subscription approved", "app charge", "billing approved",
    "payment receipt", "your invoice", "order confirmation", "order #",
    "shipment confirmed", "your receipt", "transaction approved",
    "account statement", "verify your email", "reset your password",
  ];

  if (IGNORE_SENDERS.some(s => email.includes(s))) {
    return { type: "ignore", reason: "Automated/system sender", tag: "General", priority: "low" };
  }
  if (IGNORE_SUBJECT_PATTERNS.some(p => subject.includes(p))) {
    return { type: "ignore", reason: "Automated notification or receipt", tag: "General", priority: "low" };
  }

  // ── AI classification for real human emails ───────────────────────────────
  try {
    const companyCtx = settings.company_name
      ? `You manage the inbox for "${settings.company_name}"` + (settings.products ? `, which sells: ${settings.products}` : "") + "."
      : "You manage a customer inbox for an e-commerce store.";

    const prompt = `${companyCtx}

Read this email carefully and classify it. Think step by step before deciding.

From: ${parsed.fromEmail}
Subject: ${parsed.subject}
Body:
${parsed.body.slice(0, 1000)}

---
Choose exactly one type:

"sales" — A real human (not a system) is asking a genuine pre-purchase question. They want to BUY something or need information BEFORE buying. Clear signals:
  ✓ Asking about a specific product, its features, availability, or price
  ✓ Asking about shipping cost, delivery time, or whether you ship to their location
  ✓ Asking about bulk, wholesale, or custom orders
  ✓ Expressing intent to purchase: "I want to order...", "I'm interested in..."
  ✓ Shopify Inbox chat from a customer browsing your store
  ✗ NOT sales: post-purchase questions, complaints, refund requests (those are "support")
  ✗ NOT sales: any automated email, receipt, billing notification, app approval

"support" — A real human who already bought something needs help: wrong/damaged item, missing package, wants a refund or exchange, has a complaint, account problem.

"ignore" — Everything else: automated emails, billing/payment notifications, app approvals, order confirmations, newsletters, receipts, cold outreach, spam, no-reply senders, internal platform emails, subscription charges.

When uncertain between "sales" and "ignore", choose "ignore".
When uncertain between "support" and "ignore", choose "ignore".

Respond ONLY with JSON:
{"type":"support|sales|ignore","reason":"one sentence explaining the decision","tag":"Shipping|Refund|Exchange|Technical|General|Complaint|Billing|Inquiry|Pricing|Wholesale","priority":"high|medium|low"}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    const text = aiData.content?.map(c => c.text || "").join("") || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!["support","sales","ignore"].includes(result.type)) result.type = "ignore";
    return result;
  } catch (e) {
    console.error("Triage AI error:", e);
    return { type: "ignore", reason: "AI triage failed — skipped to be safe", tag: "General", priority: "low" };
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────
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

// ── Parse Gmail message ───────────────────────────────────────────────────────
function parseGmailMessage(msg) {
  const headers = msg.payload?.headers || [];
  const get = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  const from = get("From");
  const emailMatch = from.match(/<(.+?)>/);
  let fromEmail = emailMatch ? emailMatch[1] : from.trim();
  let fromName  = from.replace(/<.+?>/, "").replace(/"/g, "").trim() || fromEmail;

  let body = "";
  function extractBody(part) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      body = Buffer.from(part.body.data, "base64").toString("utf8").slice(0, 2000);
    } else if (part.parts) part.parts.forEach(extractBody);
  }
  extractBody(msg.payload);
  if (!body && msg.snippet) body = msg.snippet;

  body = body.replace(/^>.*$/gm, "").replace(/^On .+wrote:$/gm, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // ── Shopify message parser ────────────────────────────────────────────────
  // Handles two Shopify email formats:
  // 1. Contact form emails (Translation Missing keys)
  // 2. Shopify Inbox chat notifications ("someone sent you a message")

  if (body.includes("Translation Missing") || body.includes("contact form")) {
    const nameMatch  = body.match(/(?:Translation Missing:[^:]+name|name)[:\s]+([^\n]+)/i);
    const bodyMatch  = body.match(/(?:Translation Missing:[^:]+body|message|body)[:\s]+([\s\S]+?)(?:Country Code:|$)/i);
    const emailMatch2 = body.match(/Email[:\s]+([^\s\n]+@[^\s\n]+)/i);
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
    // Shopify Inbox notification — extract just what the customer wrote.
    // Format varies but the message is typically after a line break following
    // "sent you a message" or between dashes/quotes.
    const inboxMatch =
      body.match(/sent you a message[:\s\n]+([\s\S]+?)(?:\n\n|Reply to this|View conversation|--)/i) ||
      body.match(/message:[\s\n]+([\s\S]+?)(?:\n\n|Reply|View|--)/i) ||
      body.match(/[""]([\s\S]{10,})[""]/) ;  // quoted message fallback

    // Extract customer name from subject "New message from David Gomez"
    const nameFromSubject = get("Subject").match(/(?:new message from|message from)\s+(.+)/i)?.[1]?.trim();

    if (inboxMatch?.[1]?.trim()) body = inboxMatch[1].trim();
    if (nameFromSubject) fromName = nameFromSubject;
  }
  // internalDate is ms since epoch — the actual time the email was sent/received
  const sentAt = msg.internalDate
    ? new Date(parseInt(msg.internalDate)).toISOString()
    : new Date().toISOString();

  return { fromEmail, fromName, subject: get("Subject") || "(no subject)", body: body || msg.snippet || "(empty)", sentAt };
}
