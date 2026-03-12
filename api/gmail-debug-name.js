import { requireAuth } from "./_auth.js";

// api/gmail-debug-name.js
// GET  → reads current sendAs settings from Gmail (shows what name Gmail actually has)
// POST → updates the displayName and returns what Gmail confirms back

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
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
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: s.gmail_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(500).json({ error: "Token refresh failed", detail: d });
      accessToken = d.access_token;
    }

    const email = s.gmail_email;

    if (req.method === "GET") {
      // Read all sendAs aliases — shows what Gmail currently has
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs",
        { headers: { "Authorization": "Bearer " + accessToken } }
      );
      const listData = await listRes.json();
      return res.status(200).json({
        gmail_email_in_db: email,
        company_name_in_db: s.company_name,
        sendAs_from_google: listData,
        token_ok: true,
      });
    }

    if (req.method === "POST") {
      const { displayName } = req.body;
      const nameToSet = displayName || s.company_name;
      if (!nameToSet?.trim()) return res.status(400).json({ error: "No displayName provided and no company_name in DB" });

      const patchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken },
          body: JSON.stringify({ displayName: nameToSet.trim() }),
        }
      );
      const patchData = await patchRes.json();
      return res.status(patchRes.status).json({
        attempted_name: nameToSet.trim(),
        gmail_email: email,
        patch_status: patchRes.status,
        google_response: patchData,
      });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
