import { requireAuth } from "./_auth.js";

// api/quality-issues.js — CRUD for quality_issues table
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": "Bearer " + supabaseKey,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(supabaseUrl + "/rest/v1/quality_issues?order=created_at.desc&select=*", { headers });
      return res.status(200).json(await r.json());
    }

    if (req.method === "POST") {
      const r = await fetch(supabaseUrl + "/rest/v1/quality_issues", {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    if (req.method === "PATCH") {
      const { id, ...fields } = req.body;
      const r = await fetch(supabaseUrl + "/rest/v1/quality_issues?id=eq." + id, {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify(fields),
      });
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      const r = await fetch(supabaseUrl + "/rest/v1/quality_issues?id=eq." + id, {
        method: "DELETE",
        headers,
      });
      return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
    }

  } catch (e) {
    console.error("Quality Issues API error:", e);
    return res.status(500).json({ error: e.message });
  }
}
