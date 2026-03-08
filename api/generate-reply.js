// api/generate-reply.js
// Vercel serverless function — keeps your Anthropic API key secure on the server

export default async function handler(req, res) {
  // Allow requests from your app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ticket, businessContext } = req.body;

  if (!ticket) return res.status(400).json({ error: "Missing ticket data" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in Vercel environment variables" });

  const systemPrompt = [
    "You are a professional customer support agent.",
    "Be warm, helpful, empathetic, and solution-focused.",
    "Keep replies concise (3-5 sentences).",
    "Always acknowledge the customer's concern, provide a clear action or solution, and end with an offer to help further.",
    businessContext ? `\nBusiness context:\n${businessContext}` : "",
  ].filter(Boolean).join(" ");

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
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Write a customer support reply to this email:\n\nFrom: ${ticket.customerName} (${ticket.customerEmail})\nSubject: ${ticket.subject}\nMessage: ${ticket.body}\n\nWrite only the email body. Start directly with the response.`,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Anthropic API error" });
    }

    const text = data.content?.map(c => c.text || "").join("") || "";
    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("Claude API error:", err);
    return res.status(500).json({ error: "Failed to generate reply" });
  }
}
