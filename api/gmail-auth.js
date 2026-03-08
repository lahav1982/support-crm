// api/gmail-auth.js — starts the Google OAuth flow
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI; // e.g. https://your-app.vercel.app/api/gmail-callback

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: "GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not set in Vercel env vars" });
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ].join(" ");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         scopes,
    access_type:   "offline",   // gets refresh_token
    prompt:        "consent",   // forces refresh_token every time
  });

  const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  res.redirect(authUrl);
}
