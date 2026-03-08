// api/gmail-sync.js — fetches new unread emails from Gmail, saves to Supabase tickets
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    // 1. Load tokens from Supabase
    const settingsRes = await fetch(supabaseUrl + "/rest/v1/settings?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const settings = await settingsRes.json();
    const s = settings?.[0];

    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected" });
    }

    // 2. Refresh access token if expired
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // 3. Fetch unread emails from Gmail (last 50)
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread+in:inbox",
      { headers: { Authorization: "Bearer " + accessToken } }
    );
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error(listData.error?.message || "Gmail list failed");

    const messages = listData.messages || [];
    const imported = [];

    for (const msg of messages) {
      // Check if already imported (avoid duplicates)
      const existing = await fetch(
        supabaseUrl + "/rest/v1/tickets?gmail_message_id=eq." + msg.id + "&select=id",
        { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
      );
      const existingData = await existing.json();
      if (existingData?.length > 0) continue;

      // Fetch full message
      const msgRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + msg.id + "?format=full",
        { headers: { Authorization: "Bearer " + accessToken } }
      );
      const msgData = await msgRes.json();

      const parsed = parseGmailMessage(msgData);
      if (!parsed.from || !parsed.subject) continue;

      // Save to Supabase as a ticket
      await fetch(supabaseUrl + "/rest/v1/tickets", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Prefer":        "return=minimal",
        },
        body: JSON.stringify({
          customer_name:       parsed.fromName || parsed.fromEmail,
          customer_email:      parsed.fromEmail,
          subject:             parsed.subject,
          body:                parsed.body,
          status:              "open",
          priority:            "medium",
          tag:                 "General",
          assigned_to:         1,
          notes:               "",
          replies:             [],
          type:                "email",
          gmail_message_id:    msg.id,
          gmail_thread_id:     msgData.threadId,
        }),
      });

      // Mark as read in Gmail
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

    res.status(200).json({ imported: imported.length, subjects: imported });

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

  // Update stored token
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

  // Extract body text
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

  // Fallback to snippet
  if (!body && msg.snippet) body = msg.snippet;

  // Clean up email reply chains (strip > quoted lines)
  body = body
    .replace(/^>.*$/gm, "")
    .replace(/^On .+ wrote:$/gm, "")
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
