import { requireAuth } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // Fetch all tickets + emails with their replies
    const ticketsRes = await fetch(
      supabaseUrl + "/rest/v1/tickets?select=*&order=created_at.desc&limit=200",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    const tickets = await ticketsRes.json() || [];

    // Fetch settings for company context
    const settingsRes = await fetch(
      supabaseUrl + "/rest/v1/settings?id=eq.1&select=company_name,products",
      { headers: { "apikey": supabaseKey, "Authorization": "Bearer " + supabaseKey } }
    );
    const settings = (await settingsRes.json())?.[0] || {};

    if (tickets.length === 0) {
      return res.status(200).json({ issues: [], meta: { analyzedCount: 0, generatedAt: new Date().toISOString() } });
    }

    // Build a compact representation of all customer messages for the AI
    const messagesSummary = tickets.map(t => {
      const replies = (t.replies || [])
        .filter(r => r.isCustomer || (!r.author?.toLowerCase().includes("you") && !r.fromEmail?.includes(settings.gmail_email)))
        .map(r => r.body?.slice(0, 200))
        .filter(Boolean)
        .join(" | ");

      return [
        "---",
        `ID:${t.id} | Date:${t.created_at?.slice(0,10)} | Tag:${t.tag || "General"} | Priority:${t.priority} | Status:${t.status}`,
        `Subject: ${t.subject}`,
        `Body: ${(t.body || "").slice(0, 300)}`,
        replies ? `Customer follow-ups: ${replies}` : null,
      ].filter(Boolean).join("\n");
    }).join("\n");

    const companyCtx = settings.company_name
      ? `Company: ${settings.company_name}${settings.products ? `. Products/services: ${settings.products}` : ""}.`
      : "A business support inbox.";

    const prompt = `You are a product insights analyst. Analyze the following customer support messages and identify the most important issues, problems, and patterns.

${companyCtx}
Total messages: ${tickets.length}
Date range: ${tickets[tickets.length-1]?.created_at?.slice(0,10)} to ${tickets[0]?.created_at?.slice(0,10)}

MESSAGES:
${messagesSummary}

Analyze these messages deeply and respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "issues": [
    {
      "id": "unique-slug",
      "title": "Short issue title (5-8 words)",
      "description": "2-3 sentence description of the problem pattern",
      "severity": "critical | high | medium | low",
      "count": <number of messages related to this issue>,
      "percentage": <% of total messages>,
      "trend": "rising | stable | declining",
      "trendReason": "one sentence why",
      "affectedArea": "Shipping | Product Quality | Billing | Account | Returns | Communication | Website | Packaging | Other",
      "sentiment": "very_negative | negative | neutral | mixed",
      "examples": ["brief example 1 from actual messages", "brief example 2", "brief example 3"],
      "customerImpact": "one sentence on how this affects customers",
      "recommendation": "Specific, actionable recommendation for the business",
      "urgency": "immediate | this-week | this-month | monitor",
      "relatedTicketIds": [<array of ticket IDs most relevant to this issue, max 5>]
    }
  ],
  "summary": {
    "topProblemArea": "the single biggest problem area",
    "overallSentiment": "positive | mixed | negative | very_negative",
    "healthScore": <0-100, where 100 is perfect customer satisfaction>,
    "keyWin": "one thing going well based on the messages",
    "biggestRisk": "the single most urgent thing that needs fixing",
    "executiveSummary": "3-4 sentence executive summary of the state of customer support"
  }
}

Rules:
- Find 3-8 distinct issue clusters (don't over-fragment)
- Base counts on actual evidence in the messages
- Be specific and actionable, not generic
- Severity: critical = major churn risk, high = frequent pain, medium = notable pattern, low = minor
- Order issues by severity then count (most important first)`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const aiData  = await aiRes.json();
    const rawText = aiData.content?.map(c => c.text || "").join("") || "{}";
    const clean   = rawText.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(clean);

    const result = {
      ...parsed,
      meta: {
        analyzedCount: tickets.length,
        generatedAt:   new Date().toISOString(),
        model:         "claude-sonnet-4-20250514",
      },
    };

    // Persist to Supabase insights table
    await fetch(supabaseUrl + "/rest/v1/insights", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        supabaseKey,
        "Authorization": "Bearer " + supabaseKey,
        "Prefer":        "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: 1, data: result, updated_at: new Date().toISOString() }),
    });

    return res.status(200).json(result);

  } catch (e) {
    console.error("Insights error:", e);
    return res.status(500).json({ error: e.message });
  }
}
