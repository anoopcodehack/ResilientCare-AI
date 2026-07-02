const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TICKET_SYSTEM = `You are a support ticket generation AI.
Respond ONLY with valid JSON, no markdown, no extra text:
{
  "title": "<5-10 word title>",
  "category": "billing"|"technical"|"account"|"general"|"security"|"feedback",
  "priority": "low"|"medium"|"high"|"critical",
  "summary": "<2-3 sentence summary>",
  "customerSentiment": "positive"|"neutral"|"negative"|"frustrated"|"angry",
  "stepsAlreadyTaken": ["step1"],
  "suggestedResolution": "<what support team should do>",
  "requiresHumanAgent": <boolean>,
  "tags": ["tag1","tag2"],
  "estimatedResolutionTime": "<e.g. 1-2 hours>"
}`;

class TicketAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({
     model: "gemini-2.0-flash",
      systemInstruction: TICKET_SYSTEM
    });
  }

  async generate(sessionId, conversationHistory, sentimentHistory = [], flags = []) {
    const startTime = Date.now();
    const convoStr = conversationHistory
      .filter(t => t.content)
      .map(t => `${t.role.toUpperCase()}: ${t.content.substring(0, 300)}`)
      .join("\n");

    const flagSummary = flags.length > 0 ? `\nSECURITY FLAGS: ${flags.map(f => f.anomalyType).join(", ")}` : "";

    try {
      const result = await this.model.generateContent(
        `Generate a support ticket for this conversation:\n\n${convoStr}${flagSummary}`
      );
      const raw = result.response.text().trim().replace(/^```json?\n?|\n?```$/g, "").trim();
      const data = JSON.parse(raw);
      return { id: `TKT-${Date.now().toString(36).toUpperCase()}`, sessionId, createdAt: new Date().toISOString(), status: "open", generationTime: Date.now() - startTime, ...data };
    } catch (error) {
      console.error("[TicketAgent] Error:", error.message);
      return { id: `TKT-${Date.now().toString(36).toUpperCase()}`, sessionId, createdAt: new Date().toISOString(), status: "open", title: "Customer Support Request", category: "general", priority: flags.length > 0 ? "high" : "medium", summary: "Customer contacted support. Manual review required.", customerSentiment: "neutral", stepsAlreadyTaken: [], suggestedResolution: "Review conversation and follow up.", requiresHumanAgent: true, tags: ["auto-generated"], estimatedResolutionTime: "24 hours", generationTime: Date.now() - startTime };
    }
  }
}

module.exports = { TicketAgent };
