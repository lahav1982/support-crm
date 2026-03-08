// api/login.js — verifies password, sets secure HTTP-only cookie
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body || {};
  const correct = process.env.APP_PASSWORD;

  if (!correct) {
    return res.status(500).json({ error: "APP_PASSWORD environment variable is not set in Vercel." });
  }
  if (!password || password !== correct) {
    // Small delay to slow brute-force attempts
    return setTimeout(() => res.status(401).json({ error: "Incorrect password." }), 800);
  }

  // Secure, HTTP-only cookie — JS cannot read or steal this
  res.setHeader("Set-Cookie",
    "supportai_auth=" + correct + "; HttpOnly; Secure; SameSite=Strict; Max-Age=" + (60 * 60 * 24 * 7) + "; Path=/"
  );
  res.status(200).json({ ok: true });
}
