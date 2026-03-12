import { requireAuth } from "./_auth.js";

// api/gmail-update-name.js
// Calls Gmail's sendAs.patch API to set the display name on the account.
// Gmail ignores the From: header in raw messages — the display name MUST be
// set via this API to appear correctly in recipients' inboxes.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { displayName } = req.body;
  if (!displayName?.trim()) return res.status(400).json({ error: "displayName is required" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    // Load Gmail tokens from settings
    const settingsRes = await fetch(supabaseUrl + "/rest/v1/settings?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const settings = await settingsRes.json();
    const s = settings?.[0];

    if (!s?.gmail_connected || !s?.gmail_access_token) {
      return res.status(400).json({ error: "Gmail not connected — connect Gmail first then save settings" });
    }

    // Refresh token if needed
    let accessToken = s.gmail_access_token;
    if (Date.now() > (s.gmail_token_expiry - 60000)) {
      accessToken = await refreshAccessToken(s.gmail_refresh_token, supabaseUrl, supabaseKey);
    }

    const email = s.gmail_email;
    if (!email) return res.status(400).json({ error: "Gmail email not found in settings" });

    // Call Gmail sendAs.patch to update the display name
    // This is the ONLY way to change how your name appears to recipients
    const patchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(email)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + accessToken,
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      }
    );

    const patchData = await patchRes.json();

    if (!patchRes.ok) {
      console.error("[gmail-update-name] Gmail API error:", patchData);
      return res.status(500).json({ error: patchData.error?.message || "Failed to update display name" });
    }

    console.log("[gmail-update-name] Updated displayName to:", patchData.displayName);
    res.status(200).json({ success: true, displayName: patchData.displayName });

  } catch (e) {
    console.error("[gmail-update-name] Error:", e);
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
