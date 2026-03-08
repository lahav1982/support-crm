// api/logout.js — clears the auth cookie
export default function handler(req, res) {
  res.setHeader("Set-Cookie", [
    "supportai_auth=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/",
  ]);
  res.status(200).json({ ok: true });
}
