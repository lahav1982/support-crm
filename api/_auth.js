// api/_auth.js — shared auth helper imported by all API endpoints
export function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token   = cookies["supportai_auth"];
  const correct = process.env.APP_PASSWORD;

  if (!correct || token !== correct) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function parseCookies(str) {
  return Object.fromEntries(
    str.split(";")
       .filter(Boolean)
       .map(c => {
         const [k, ...v] = c.trim().split("=");
         return [decodeURIComponent(k), decodeURIComponent(v.join("="))];
       })
  );
}
