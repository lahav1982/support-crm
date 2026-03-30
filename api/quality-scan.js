import { requireAuth } from "./_auth.js";

// api/quality-scan.js
// Scans ALL historical Gmail messages (not just inbox) for quality/defect issues.
// Pages through entire mailbox using nextPageToken until exhausted.
// Designed to be run once — deduplication prevents re-importing known messages.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // ── Load Gmail tokens ──────────────────────────────────────────────────
    const settingsRes = await fetch(supabaseUrl + "/rest/v1/settings?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const settings = await settingsRes.json();
    const s = settings?.[0];

    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected" });
    }

    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // ── Load all already-imported message IDs ─────────────────────────────
    const [ticketsRes, oppsRes, qualityRes] = await Promise.all([
      fetch(supabaseUrl + "/rest/v1/tickets?select=gmail_message_id&gmail_message_id=not.is.null",
        { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }),
      fetch(supabaseUrl + "/rest/v1/opportunities?select=gmail_message_id&gmail_message_id=not.is.null",
        { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }),
      fetch(supabaseUrl + "/rest/v1/quality_issues?select=gmail_message_id&gmail_message_id=not.is.null",
        { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }),
    ]);

    const importedIds = new Set();
    for (const row of (await ticketsRes.json())  || []) { if (row.gmail_message_id) importedIds.add(row.gmail_message_id); }
    for (const row of (await oppsRes.json())     || []) { if (row.gmail_message_id) importedIds.add(row.gmail_message_id); }
    for (const row of (await qualityRes.json())  || []) { if (row.gmail_message_id) importedIds.add(row.gmail_message_id); }

    // ── Quality-specific Gmail search query ───────────────────────────────
    // Search all mail (no inbox filter) for quality/defect related keywords.
    // Exclude sent/drafts/automated to avoid false positives.
    const qualityQuery = [
      "(",
        "broken OR cracked OR damaged OR defective OR",
        '"broken pot" OR "cracked pot" OR "broken planter" OR "damaged plant" OR',
        '"poor quality" OR "fell apart" OR "snapped" OR "arrived broken" OR',
        '"wrong item" OR "missing parts" OR "not as described" OR "manufacturing defect" OR',
        '"not what i expected" OR "disappointing quality" OR "looks fake" OR "looks cheap"',
      ")",
      "-in:sent -in:drafts -in:spam",
      "-from:noreply -from:no-reply -from:notifications -from:donotreply",
      "-category:promotions -category:social",
    ].join(" ");

    // ── Page through ALL matching Gmail messages ───────────────────────────
    const results = { scanned: 0, imported: 0, skipped: 0, pages: 0 };
    let pageToken = null;
    const MAX_PAGES = 50; // safety cap — 500 results max per run

    do {
      const url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=" +
        encodeURIComponent(qualityQuery) + (pageToken ? "&pageToken=" + pageToken : "");

      const listRes  = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
      const listData = await listRes.json();

      if (!listRes.ok) {
        console.error("[quality-scan] Gmail list error:", listData.error?.message);
        break;
      }

      results.pages++;
      const messages = listData.messages || [];
      pageToken = listData.nextPageToken || null;

      for (const msg of messages) {
        results.scanned++;

        if (importedIds.has(msg.id)) { results.skipped++; continue; }

        // Fetch full message
        const msgRes  = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "?format=full",
          { headers: { Authorization: "Bearer " + accessToken } }
        );
        const msgData = await msgRes.json();
        const parsed  = parseGmailMessage(msgData);
        if (!parsed.fromEmail) { results.skipped++; continue; }

        // AI triage — focused on quality detection
        const triage = await triageForQuality(parsed, s, anthropicKey);

        if (triage.type !== "quality") { results.skipped++; continue; }

        // Save to quality_issues
        await fetch(supabaseUrl + "/rest/v1/quality_issues", {
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
            subject:          parsed.subject,
            message:          parsed.body,
            defect_type:      triage.defectType || "other",
            status:           "open",
            notes:            "",
            source:           "email",
            gmail_message_id: msg.id,
            created_at:       parsed.sentAt,
          }),
        });

        importedIds.add(msg.id);
        results.imported++;
      }

    } while (pageToken && results.pages < MAX_PAGES);

    return res.status(200).json({
      success: true,
      ...results,
      message: `Deep scan complete. Scanned ${results.scanned} emails across ${results.pages} page(s). Found ${results.imported} quality issue${results.imported !== 1 ? "s" : ""}.`,
    });

  } catch (e) {
    console.error("[quality-scan] Error:", e);
    return res.status(500).json({ error: e.message });
  }
}

// ── Focused quality triage ────────────────────────────────────────────────────
// Narrower prompt — we already pre-filtered by keywords, just confirm it's real
async function triageForQuality(parsed, settings, anthropicKey) {
  const email   = (parsed.fromEmail || "").toLowerCase();
  const localPart = email.split("@")[0] || "";

  const IGNORE_LOCAL = ["noreply","no-reply","do-not-reply","donotreply","no_reply","notifications","automated","system","mailer-daemon","postmaster","billing","invoices","receipts","payments"];
  if (IGNORE_LOCAL.includes(localPart)) return { type: "ignore" };

  try {
    const companyCtx = settings.company_name
      ? `You manage customer emails for "${settings.company_name}"` + (settings.products ? `, which sells: ${settings.products}` : "") + "."
      : "You manage customer emails for an e-commerce store that sells artificial plants and trees.";

    const prompt = `${companyCtx}

This email was flagged by a keyword search as potentially containing a product quality complaint. Confirm whether it is a genuine quality issue.

From: ${parsed.fromEmail}
Subject: ${parsed.subject}
Body:
${parsed.body.slice(0, 800)}

Is this a genuine customer complaint about physical product quality or damage? Examples:
✓ Broken pot or planter
✓ Damaged, wilting, or poor quality plant/tree
✓ Item arrived damaged or broken in transit
✓ Missing parts or accessories
✓ Product does not match description physically
✓ Poor craftsmanship, materials falling apart

Answer "quality" only if a real customer is describing a real physical product problem.
Answer "ignore" if it is automated, promotional, unrelated, or the keyword match was incidental.

Respond ONLY with JSON:
{"type":"quality|ignore","defectType":"broken_pot|damaged_plant|wrong_item|missing_parts|quality_poor|other","reason":"one sentence"}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    const text   = aiData.content?.map(c => c.text || "").join("") || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!["quality","ignore"].includes(result.type)) result.type = "ignore";
    return result;
  } catch (e) {
    return { type: "ignore", reason: "AI error" };
  }
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
  body = body.replace(/^>.*$/gm, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const sentAt = msg.internalDate
    ? new Date(parseInt(msg.internalDate)).toISOString()
    : new Date().toISOString();

  return { fromEmail, fromName, subject: get("Subject") || "(no subject)", body: body || msg.snippet || "(empty)", sentAt };
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
  if (!r.ok) throw new Error("Token refresh failed");
  await fetch(supabaseUrl + "/rest/v1/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({ id: 1, gmail_access_token: data.access_token, gmail_token_expiry: Date.now() + ((data.expires_in || 3600) * 1000) }),
  });
  return data.access_token;
}
