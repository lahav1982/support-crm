// api/gmail-sync.js — AI-powered email triage: pulls only support-related emails
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // 1. Load settings + tokens
    const settingsRes = await fetch(supabaseUrl + "/rest/v1/settings?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const settings = await settingsRes.json();
    const s = settings?.[0];

    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected" });
    }

    // 2. Refresh token if close to expiry
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // 3. Build Gmail query
    // Start with manual filters if set (narrows the pool before AI triage)
    const keywords = (s.gmail_filter_keywords || "").split(",").map(k => k.trim()).filter(Boolean);
    const domains  = (s.gmail_filter_domains  || "").split(",").map(d => d.trim()).filter(Boolean);

    let gmailQuery = "in:inbox";
    if (keywords.length > 0 || domains.length > 0) {
      const parts = [];
      if (keywords.length > 0) {
        const kParts = keywords.map(k => 'subject:"' + k + '"');
        parts.push(kParts.length === 1 ? kParts[0] : "(" + kParts.join(" OR ") + ")");
      }
      if (domains.length > 0) {
        const dParts = domains.map(d => "from:@" + d.replace(/^@/, ""));
        parts.push(dParts.length === 1 ? dParts[0] : "(" + dParts.join(" OR ") + ")");
      }
      gmailQuery += " " + (parts.length > 1 ? "(" + parts.join(" OR ") + ")" : parts[0]);
    }
    // Always exclude sent/drafts/spam and automated mailers
    gmailQuery += " -from:noreply -from:no-reply -from:donotreply -from:notifications -category:promotions -category:social -in:sent -in:drafts";

    // 4. Fetch up to 30 recent emails matching query
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30&q=" + encodeURIComponent(gmailQuery),
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed");

    const messages = listData.messages || [];
    if (messages.length === 0) {
      return res.status(200).json({ imported: 0, rejected: 0, skipped: 0, details: [] });
    }

    // 5. For each message, skip already-imported ones, then fetch + AI triage
    const results = { imported: 0, rejected: 0, skipped: 0, details: [] };

    // Get all already-imported gmail_message_ids in one query
    const existingRes = await fetch(
      supabaseUrl + "/rest/v1/tickets?select=gmail_message_id&gmail_message_id=not.is.null",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    const existingRows = await existingRes.json();
    const importedIds = new Set((existingRows || []).map(r => r.gmail_message_id));

    for (const msg of messages) {
      // Skip already imported
      if (importedIds.has(msg.id)) {
        results.skipped++;
        continue;
      }

      // Fetch full message
      const msgRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "?format=full",
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      const msgData = await msgRes.json();
      const parsed = parseGmailMessage(msgData);
      if (!parsed.fromEmail) { results.skipped++; continue; }

      // 6. AI triage — decide if this is a customer support email
      const triage = await triageEmail(parsed, s, anthropicKey);

      results.details.push({
        subject: parsed.subject,
        from: parsed.fromEmail,
        decision: triage.isSupport ? "imported" : "rejected",
        reason: triage.reason,
        tag: triage.tag,
        priority: triage.priority,
      });

      if (!triage.isSupport) {
        results.rejected++;
        continue;
      }

      // 7. Save to Supabase
      await fetch(supabaseUrl + "/rest/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify({
          customer_name:     parsed.fromName || parsed.fromEmail,
          customer_email:    parsed.fromEmail,
          subject:           parsed.subject,
          body:              parsed.body,
          status:            "open",
          priority:          triage.priority || "medium",
          tag:               triage.tag      || "General",
          assigned_to:       1,
          notes:             "",
          replies:           [],
          type:              "email",
          gmail_message_id:  msg.id,
          gmail_thread_id:   msgData.threadId,
        }),
      });

      results.imported++;
    }

    return res.status(200).json(results);

  } catch (e) {
    console.error("Gmail sync error:", e);
    return res.status(500).json({ error: e.message });
  }
}

// ── AI triage: is this a customer support email? ─────────────────────────────
async function triageEmail(parsed, settings, anthropicKey) {
  try {
    const companyContext = settings.company_name
      ? "This is the support inbox for a company called " + settings.company_name + 
        (settings.products ? ", which sells: " + settings.products : "") + "."
      : "This is a customer support inbox.";

    const prompt = `${companyContext}

You are triaging an email to decide if it belongs in the customer support inbox.

Email From: ${parsed.fromEmail}
Subject: ${parsed.subject}
Body (first 600 chars):
${parsed.body.slice(0, 600)}

Classify this email. Respond ONLY with a valid JSON object, no markdown:
{
  "isSupport": true or false,
  "reason": "one short sentence explaining why",
  "tag": "Shipping | Refund | Account | Sales | Exchange | Technical | General | Complaint | Billing",
  "priority": "high | medium | low"
}

isSupport should be TRUE if the email is:
- A customer asking about an order, delivery, product, refund, exchange, complaint, billing issue, account problem, or any real question/request needing a response
- A real human email that needs attention from support staff

isSupport should be FALSE if the email is:
- A newsletter, promotion, or marketing email
- An automated notification (shipping updates, receipts, system alerts)
- Spam or cold outreach
- Internal team communication
- A no-reply or automated sender`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001", // fast + cheap for triage
        max_tokens: 150,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const text = aiData.content?.map(c => c.text || "").join("") || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (e) {
    console.error("Triage error for", parsed.subject, e.message);
    // On AI failure, default to importing the email so nothing gets lost
    return { isSupport: true, reason: "AI triage failed — imported by default", tag: "General", priority: "medium" };
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────
async function refreshAccessToken(refreshToken, supabaseUrl, supabaseKey) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error("Token refresh failed: " + data.error);

  await fetch(supabaseUrl + "/rest/v1/settings", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        supabaseKey,
      "Authorization": "Bearer " + supabaseKey,
      "Prefer":        "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id:                 1,
      gmail_access_token: data.access_token,
      gmail_token_expiry: Date.now() + ((data.expires_in || 3600) * 1000),
    }),
  });
  return data.access_token;
}

// ── Parse Gmail message ───────────────────────────────────────────────────────
function parseGmailMessage(msg) {
  const headers = msg.payload?.headers || [];
  const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  const from = get("From");
  const emailMatch = from.match(/<(.+?)>/);
  const fromEmail = emailMatch ? emailMatch[1] : from.trim();
  const fromName  = from.replace(/<.+?>/, "").replace(/"/g, "").trim() || fromEmail;

  let body = "";
  function extractBody(part) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      body = Buffer.from(part.body.data, "base64").toString("utf8").slice(0, 2000);
    } else if (part.parts) {
      for (const p of part.parts) extractBody(p);
    }
  }
  extractBody(msg.payload);
  if (!body && msg.snippet) body = msg.snippet;

  body = body
    .replace(/^>.*$/gm, "")
    .replace(/^On .+wrote:$/gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    fromEmail,
    fromName,
    subject: get("Subject") || "(no subject)",
    body:    body || msg.snippet || "(empty)",
  };
}
