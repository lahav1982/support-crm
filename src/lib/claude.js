// lib/claude.js — calls our secure Vercel backend (which calls Anthropic)
export async function generateReply(ticket, businessContext = "") {
  const response = await fetch("/api/generate-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket, businessContext }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate reply");
  }

  return data.reply || "Sorry, could not generate a reply.";
}
