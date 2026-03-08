// lib/claude.js — AI reply generation
export async function generateReply(ticket, businessContext = "") {
  const system = `You are a professional customer support agent. Be warm, helpful, empathetic, and solution-focused. Keep replies concise (3-5 sentences). Always acknowledge the customer's concern, provide a clear action or solution, and end with an offer to help further.${businessContext ? `\n\nBusiness context: ${businessContext}` : ""}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{
        role: "user",
        content: `Write a customer support reply to this email:\n\nFrom: ${ticket.customerName} (${ticket.customerEmail})\nSubject: ${ticket.subject}\nMessage: ${ticket.body}\n\nWrite only the email body. Start directly with the response.`,
      }],
    }),
  });
  const data = await response.json();
  return data.content?.map(c => c.text || "").join("") || "Sorry, could not generate a reply.";
}
