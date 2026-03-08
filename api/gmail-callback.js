// api/gmail-callback.js — Google redirects here after user approves
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    console.error("Google OAuth error:", error);
    return res.redirect("/?gmail_error=" + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect("/?gmail_error=no_code_returned");
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;
  const supabaseUrl  = process.env.SUPABASE_URL;
  // Use service key if available, fall back to anon key (both work since RLS is off)
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect("/?gmail_error=" + encodeURIComponent("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_REDIRECT_URI in Vercel env vars"));
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.redirect("/?gmail_error=" + encodeURIComponent("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in Vercel env vars"));
  }

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
    if (!tokenRes.ok) {
      throw new Error("Token exchange failed: " + (tokens.error_description || tokens.error || JSON.stringify(tokens)));
    }

    // 2. Get Gmail address from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokens.access_token },
    });
    const profile = await profileRes.json();
    const email = profile.email || "unknown@gmail.com";

    // 3. Save tokens to Supabase settings row (id=1)
    const saveRes = await fetch(supabaseUrl + "/rest/v1/settings", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Prefer":        "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id:                    1,
        gmail_access_token:    tokens.access_token,
        gmail_refresh_token:   tokens.refresh_token || null,
        gmail_token_expiry:    Date.now() + ((tokens.expires_in || 3600) * 1000),
        gmail_email:           email,
        gmail_connected:       true,
      }),
    });

    if (!saveRes.ok) {
      const errText = await saveRes.text();
      throw new Error("Supabase save failed: " + errText);
    }

    console.log("Gmail connected successfully for:", email);
    res.redirect("/?gmail_connected=1");

  } catch (e) {
    console.error("Gmail callback error:", e.message);
    res.redirect("/?gmail_error=" + encodeURIComponent(e.message));
  }
}
