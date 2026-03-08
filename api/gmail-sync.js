// api/gmail-sync.js — fetches emails matching keyword/domain filters, saves to Supabase
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

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

    // 2. Refresh token if expired
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // 3. Build Gmail search query from saved filters
    const keywords = (s.gmail_filter_keywords || "").split(",").map(k => k.trim()).filter(Boolean);
    const domains  = (s.gmail_filter_domains  || "").split(",").map(d => d.trim()).filter(Boolean);

    // If no filters set, refuse to pull everything
    if (keywords.length === 0 && domains.length === 0) {
      return res.status(400).json({
        error: "No filters configured. Please set at least one keyword or domain in Settings before syncing.",
        noFilters: true,
      });
    }

    // Build Gmail query string: (subject:keyword1 OR subject:keyword2) OR (from:@domain1 OR from:@domain2)
    const parts = [];
    if (keywords.length > 0) {
      const kParts = keywords.map(k => 'subject:"' + k + '"');
      parts.push(kParts.length === 1 ? kParts[0] : "(" + kParts.join(" OR ") + ")");
    }
    if (domains.length > 0) {
      const dParts = domains.map(d => "from:@" + d.replace(/^@/, ""));
      parts.push(dParts.length === 1 ? dParts[0] : "(" + dParts.join(" OR ") + ")");
    }
    const gmailQuery = "is:unread in:inbox " + (parts.length > 1 ? "(" + parts.join(" OR ") + ")" : parts[0]);

    console.log("Gmail query:", gmailQuery);

    // 4. Fetch matching emails
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=" + encodeURIComponent(gmailQuery),
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed");

    const messages = listData.messages || [];
    const imported = [];
    const skipped  = [];

    for (const msg of messages) {
      // Skip duplicates
      const existingRes = await fetch(
        supabaseUrl + "/rest/v1/tickets?gmail_message_id=eq." + msg.id + "&select=id",
        { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
      );
      const existing = await existingRes.json();
      if (existing?.length > 0) { skipped.push(msg.id); continue; }

      // Fetch full message
      const msgRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "?format=full",
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      const msgData = await msgRes.json();
      const parsed = parseGmailMessage(msgData);
      if (!parsed.fromEmail || !parsed.subject) continue;

      // Save to Supabase
      await fetch(supabaseUrl + "/rest/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify({
          customer_name:      parsed.fromName || parsed.fromEmail,
          customer_email:     parsed.fromEmail,
          subject:            parsed.subject,
          body:               parsed.body,
          status:             "open",
          priority:           "medium",
          tag:                "General",
          assigned_to:        1,
          notes:              "",
          replies:            [],
          type:               "email",
          gmail_message_id:   msg.id,
          gmail_thread_id:    msgData.threadId,
        }),
      });

      // Mark as read
      await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "/modify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        }
      );

      imported.push(parsed.subject);
    }

    res.status(200).json({
      imported: imported.length,
      skipped: skipped.length,
      query: gmailQuery,
      subjects: imported,
    });

  } catch (e) {
    console.error("Gmail sync error:", e);
    res.status(500).json({ error: e.message });
  }
}

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
      gmail_token_expiry: Date.now() + (data.expires_in * 1000),
    }),
  });
  return data.access_token;
}

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
    body:    body || "(empty email)",
  };
}
