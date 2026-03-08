// api/summarize-ticket.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ticket } = req.body;
  if (!ticket) return res.status(400).json({ error: "Missing ticket data" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const conversation = [
    `Customer: ${ticket.body}`,
    ...(ticket.replies || []).map(r => `${r.author}: ${r.body}`)
  ].join("\n\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: "You are a customer support manager. Given a customer conversation, extract a structured ticket summary. Respond ONLY with valid JSON, no markdown, no explanation.",
        messages: [{
          role: "user",
          content: `Analyze this customer support conversation and return a JSON object with these exact fields:
{
  "subject": "one clear sentence describing the issue",
  "summary": "2-3 sentence summary of the problem and current status",
  "priority": "high | medium | low",
  "tag": "Shipping | Refund | Account | Sales | Exchange | Technical | General",
  "action": "the single most important next action needed"
}

Conversation:
${conversation}`,
        }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message });

    const text = data.content?.map(c => c.text || "").join("") || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Summarize error:", err);
    return res.status(500).json({ error: "Failed to summarize ticket" });
  }
}
