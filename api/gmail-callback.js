// api/gmail-callback.js — Google redirects here after user approves
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect("/?gmail_error=" + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect("/?gmail_error=no_code");
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY; // service role key for server-side writes

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokens.error_description || "Token exchange failed");

    // 2. Get user's Gmail address
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokens.access_token },
    });
    const profile = await profileRes.json();

    // 3. Save tokens to Supabase settings row (id=1)
    const saveRes = await fetch(supabaseUrl + "/rest/v1/settings", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Prefer":        "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id:                    1,
        gmail_access_token:    tokens.access_token,
        gmail_refresh_token:   tokens.refresh_token || null,
        gmail_token_expiry:    Date.now() + (tokens.expires_in * 1000),
        gmail_email:           profile.email,
        gmail_connected:       true,
      }),
    });

    if (!saveRes.ok) {
      const err = await saveRes.text();
      throw new Error("Failed to save tokens: " + err);
    }

    // 4. Redirect back to app with success flag
    res.redirect("/?gmail_connected=1");

  } catch (e) {
    console.error("Gmail callback error:", e);
    res.redirect("/?gmail_error=" + encodeURIComponent(e.message));
  }
}
