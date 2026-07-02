const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SENTIMENT_SYSTEM = `You are a sentiment analysis engine for customer support.
Respond ONLY with valid JSON, no markdown, no extra text:
{
  "sentiment": "positive"|"neutral"|"negative"|"angry"|"frustrated"|"confused"|"satisfied",
  "score": <-1.0 to 1.0>,
  "intensity": "low"|"medium"|"high",
  "emotions": ["emotion1"],
  "urgency": "low"|"medium"|"high"|"critical",
  "escalationRecommended": <boolean>,
  "escalationReason": null or "<reason>"
}`;

const KEYWORDS = {
  angry: ["furious","outraged","disgusting","terrible","horrible","worst","scam","fraud","lawsuit","unacceptable"],
  frustrated: ["frustrated","annoyed","disappointed","useless","waste","keeps happening","never works"],
  positive: ["great","excellent","amazing","perfect","love","fantastic","thank you","helpful","wonderful"],
  confused: ["confused","don't understand","unclear","what does","how do","not sure"]
};

class SentimentAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SENTIMENT_SYSTEM
    });
  }

  quickClassify(message) {
    const lower = message.toLowerCase();
    for (const [sentiment, keywords] of Object.entries(KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) return sentiment;
    }
    return null;
  }

  async analyze(message, conversationHistory = []) {
    const startTime = Date.now();
    const quickResult = this.quickClassify(message);

    if (message.length < 20 && !quickResult) {
      return { sentiment: "neutral", score: 0, intensity: "low", emotions: [], urgency: "low", escalationRecommended: false, escalationReason: null, analysisTime: Date.now() - startTime, method: "QUICK_NEUTRAL" };
    }

    try {
      const prompt = `Analyze this customer message sentiment: "${message}"`;
      const result = await this.model.generateContent(prompt);
      const raw = result.response.text().trim().replace(/^```json?\n?|\n?```$/g, "").trim();
      const parsed = JSON.parse(raw);
      return { ...parsed, analysisTime: Date.now() - startTime, method: "LLM_ANALYSIS" };
    } catch (error) {
      console.error("[SentimentAgent] Error:", error.message);
      const fallback = quickResult || "neutral";
      return {
        sentiment: fallback,
        score: fallback === "angry" ? -0.8 : fallback === "frustrated" ? -0.5 : 0,
        intensity: quickResult ? "medium" : "low",
        emotions: quickResult ? [quickResult] : [],
        urgency: ["angry","frustrated"].includes(fallback) ? "high" : "low",
        escalationRecommended: fallback === "angry",
        escalationReason: fallback === "angry" ? "High anger detected" : null,
        analysisTime: Date.now() - startTime,
        method: "FALLBACK"
      };
    }
  }
}

module.exports = { SentimentAgent };
