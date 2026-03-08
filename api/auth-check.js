// api/auth-check.js — called on app load to verify the cookie is still valid
export default function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token   = cookies["supportai_auth"];
  const correct = process.env.APP_PASSWORD;

  if (!correct) return res.status(500).json({ error: "APP_PASSWORD not configured" });
  if (token === correct) return res.status(200).json({ ok: true });

  return res.status(401).json({ ok: false });
}

function parseCookies(str) {
  return Object.fromEntries(
    str.split(";").map(c => c.trim().split("=").map(decodeURIComponent))
  );
}
