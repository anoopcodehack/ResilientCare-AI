const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SENTIMENT_PROMPT = `You are a sentiment analysis engine for a customer support system.
Analyze the customer message and respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative" | "angry" | "frustrated" | "confused" | "satisfied",
  "score": <-1.0 to 1.0>,
  "intensity": "low" | "medium" | "high",
  "emotions": ["emotion1", "emotion2"],
  "urgency": "low" | "medium" | "high" | "critical",
  "escalationRecommended": <boolean>,
  "escalationReason": <null or string>
}
Be precise. Angry/frustrated customers with high urgency should have escalationRecommended: true.`;

// Fast keyword-based pre-classifier to avoid LLM call for obvious cases
const SENTIMENT_KEYWORDS = {
  angry: ["furious", "outraged", "disgusting", "terrible", "horrible", "worst", "scam", "fraud", "lawsuit", "unacceptable", "ridiculous"],
  frustrated: ["frustrated", "annoyed", "disappointed", "useless", "waste", "again", "still not", "keeps happening", "never works"],
  positive: ["great", "excellent", "amazing", "perfect", "love", "fantastic", "thank you", "helpful", "wonderful", "awesome"],
  confused: ["confused", "don't understand", "unclear", "what does", "how do", "not sure", "help me understand"]
};

class SentimentAgent {
  constructor() {
    this.model = "claude-haiku-4-5-20251001"; // Use Haiku for speed/cost on sentiment
    this.cache = new Map(); // Simple message hash cache
  }

  quickClassify(message) {
    const lower = message.toLowerCase();
    for (const [sentiment, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return sentiment;
      }
    }
    return null;
  }

  async analyze(message, conversationHistory = []) {
    const startTime = Date.now();

    // Quick classify first
    const quickResult = this.quickClassify(message);

    // For very short or clearly neutral messages, skip LLM
    if (message.length < 20 && !quickResult) {
      return {
        sentiment: "neutral",
        score: 0,
        intensity: "low",
        emotions: [],
        urgency: "low",
        escalationRecommended: false,
        escalationReason: null,
        analysisTime: Date.now() - startTime,
        method: "QUICK_NEUTRAL"
      };
    }

    try {
      // Include last 2 turns for context
      const contextStr = conversationHistory.slice(-4)
        .map(t => `${t.role}: ${t.content?.substring(0, 100)}`)
        .join("\n");

      const prompt = `${contextStr ? `Prior context:\n${contextStr}\n\n` : ""}Customer message: "${message}"`;

      const completion = await client.messages.create({
        model: this.model,
        max_tokens: 256,
        system: SENTIMENT_PROMPT,
        messages: [{ role: "user", content: prompt }]
      });

      const raw = completion.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
      const clean = raw.replace(/^```json?\n?|\n?```$/g, "").trim();
      const result = JSON.parse(clean);

      return {
        ...result,
        analysisTime: Date.now() - startTime,
        method: "LLM_ANALYSIS"
      };

    } catch (error) {
      console.error("[SentimentAgent] Error:", error.message);
      // Fallback using quick classify
      const fallbackSentiment = quickResult || "neutral";
      return {
        sentiment: fallbackSentiment,
        score: fallbackSentiment === "angry" ? -0.8 : fallbackSentiment === "frustrated" ? -0.5 : 0,
        intensity: quickResult ? "medium" : "low",
        emotions: quickResult ? [quickResult] : [],
        urgency: ["angry", "frustrated"].includes(fallbackSentiment) ? "high" : "low",
        escalationRecommended: fallbackSentiment === "angry",
        escalationReason: fallbackSentiment === "angry" ? "High anger detected via keyword analysis" : null,
        analysisTime: Date.now() - startTime,
        method: "FALLBACK"
      };
    }
  }
}

module.exports = { SentimentAgent };
