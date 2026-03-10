import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const r = await fetch(supabaseUrl + "/rest/v1/insights?id=eq.1&select=*", {
      headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey },
    });
    const rows = await r.json();
    if (!rows?.[0]) return res.status(404).json({ error: "No insights yet" });
    return res.status(200).json(rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
