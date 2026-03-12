import { requireAuth } from "./_auth.js";
// api/gmail-send.js — sends a reply through Gmail, threaded correctly
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, body, threadId, messageId, senderName: reqSenderName } = req.body;
  if (!to || !body) return res.status(400).json({ error: "Missing to or body" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    // 1. Load tokens
    const settingsRes = await fetch(supabaseUrl + "/rest/v1/settings?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const settings = await settingsRes.json();
    const s = settings?.[0];

    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected" });
    }

    // 2. Refresh if needed
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    // 3. Build RFC 2822 email
    const replySubject = subject.startsWith("Re:") ? subject : "Re: " + subject;
    const senderName  = reqSenderName || s.company_name || "Support";
    const senderEmail = s.gmail_email  || "";
    const fromHeader  = "From: " + senderName + " <" + senderEmail + ">";
    console.log("[gmail-send] From header:", fromHeader);

    const emailLines = [
      fromHeader,
      "To: " + to,
      "Subject: " + replySubject,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
    ];
    if (threadId) emailLines.push("In-Reply-To: " + (messageId || ""));
    emailLines.push("", body);

    const raw = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 4. Send via Gmail API
    const sendBody = { raw };
    if (threadId) sendBody.threadId = threadId;

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   "Bearer " + accessToken,
      },
      body: JSON.stringify(sendBody),
    });

    const sendData = await sendRes.json();
    if (!sendRes.ok) throw new Error(sendData.error?.message || "Gmail send failed");

    res.status(200).json({ success: true, messageId: sendData.id });

  } catch (e) {
    console.error("Gmail send error:", e);
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
  if (!r.ok) throw new Error("Token refresh failed");

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
