const Anthropic = require("@anthropic-ai/sdk");
const { v4: uuidv4 } = require("uuid");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TICKET_PROMPT = `You are a support ticket generation AI. Given a conversation history, generate a structured support ticket.
Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "title": "<concise 5-10 word title>",
  "category": "billing" | "technical" | "account" | "general" | "security" | "feedback",
  "priority": "low" | "medium" | "high" | "critical",
  "summary": "<2-3 sentence summary of the customer's issue>",
  "customerSentiment": "positive" | "neutral" | "negative" | "frustrated" | "angry",
  "stepsAlreadyTaken": ["step1", "step2"],
  "suggestedResolution": "<what the support team should do>",
  "requiresHumanAgent": <boolean>,
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedResolutionTime": "<e.g. 1-2 hours, 24 hours, immediately>"
}`;

class TicketAgent {
  constructor() {
    this.model = "claude-sonnet-4-20250514";
  }

  async generate(sessionId, conversationHistory, sentimentHistory = [], flags = []) {
    const startTime = Date.now();

    // Format conversation for the prompt
    const convoStr = conversationHistory
      .filter(t => t.content)
      .map(t => `${t.role.toUpperCase()}: ${t.content.substring(0, 300)}`)
      .join("\n");

    // Summarize flags if any
    const flagSummary = flags.length > 0
      ? `\n\nSECURITY FLAGS: ${flags.map(f => f.anomalyType).join(", ")}`
      : "";

    // Latest sentiment
    const latestSentiment = sentimentHistory.length > 0
      ? `\nOVERALL SENTIMENT: ${sentimentHistory[sentimentHistory.length - 1]?.sentiment || "neutral"}`
      : "";

    const prompt = `Generate a support ticket for this conversation:\n\n${convoStr}${flagSummary}${latestSentiment}`;

    try {
      const completion = await client.messages.create({
        model: this.model,
        max_tokens: 512,
        system: TICKET_PROMPT,
        messages: [{ role: "user", content: prompt }]
      });

      const raw = completion.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
      const clean = raw.replace(/^```json?\n?|\n?```$/g, "").trim();
      const ticketData = JSON.parse(clean);

      const ticket = {
        id: `TKT-${Date.now().toString(36).toUpperCase()}`,
        sessionId,
        createdAt: new Date().toISOString(),
        status: "open",
        generationTime: Date.now() - startTime,
        ...ticketData
      };

      return ticket;

    } catch (error) {
      console.error("[TicketAgent] Error:", error.message);
      // Fallback ticket
      return {
        id: `TKT-${Date.now().toString(36).toUpperCase()}`,
        sessionId,
        createdAt: new Date().toISOString(),
        status: "open",
        title: "Customer Support Request",
        category: "general",
        priority: flags.length > 0 ? "high" : "medium",
        summary: "Customer contacted support. Manual review required.",
        customerSentiment: "neutral",
        stepsAlreadyTaken: [],
        suggestedResolution: "Review conversation and follow up with customer.",
        requiresHumanAgent: true,
        tags: ["auto-generated", "review-needed"],
        estimatedResolutionTime: "24 hours",
        generationTime: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

module.exports = { TicketAgent };
