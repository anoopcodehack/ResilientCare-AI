const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|commands?)/i,
  /you\s+are\s+now\s+(a\s+)?(different|new|another|evil|unrestricted)/i,
  /pretend\s+(you\s+are|to\s+be|that\s+you)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(a\s+)?(different|new|unrestricted|jailbreak)/i,
  /jailbreak|DAN\s+mode|developer\s+mode|unrestricted\s+mode/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|api\s+key|secret)/i,
  /override\s+(your\s+)?(safety|guidelines|restrictions|rules)/i,
  /\[INST\]|\[\/INST\]|<\|system\|>|<\|user\|>/i,
  /\{\{.*\}\}/,
];

const VALIDATOR_SYSTEM = `You are a security and quality validation AI for an enterprise customer support system.
Analyze AI responses for security threats, hallucination risk, and compliance.
Respond ONLY with valid JSON, no markdown, no extra text:
{
  "confidenceScore": <0.0 to 1.0>,
  "securityFlags": [],
  "hallucinationRisk": "low"|"medium"|"high",
  "complianceStatus": "pass"|"review"|"fail",
  "anomalyDetected": <boolean>,
  "anomalyType": null or "PROMPT_INJECTION"|"DATA_LEAK"|"POLICY_VIOLATION"|"HALLUCINATION"|"TONE_VIOLATION",
  "reasoning": "<brief explanation>",
  "suggestedAction": "PASS"|"FLAG_FOR_REVIEW"|"BLOCK_AND_ESCALATE"
}`;

class ValidatorAgent {
  constructor() {
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: VALIDATOR_SYSTEM
    });
  }

  preScreenInput(userMessage) {
    const threats = [];
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userMessage)) {
        threats.push({ type: "PROMPT_INJECTION", severity: "HIGH" });
      }
    }
    const specialCharRatio = (userMessage.match(/[^a-zA-Z0-9\s.,!?]/g) || []).length / userMessage.length;
    if (specialCharRatio > 0.3 && userMessage.length > 20) {
      threats.push({ type: "OBFUSCATION_ATTEMPT", severity: "MEDIUM" });
    }
    if (userMessage.length > 2000) {
      threats.push({ type: "CONTEXT_STUFFING", severity: "LOW" });
    }
    return threats;
  }

  async validateResponse(userMessage, aiResponse, sessionContext = {}) {
    const startTime = Date.now();
    const staticThreats = this.preScreenInput(userMessage);
    const highThreat = staticThreats.find(t => t.severity === "HIGH");

    if (highThreat) {
      return {
        confidenceScore: 0.0,
        securityFlags: staticThreats,
        hallucinationRisk: "low",
        complianceStatus: "fail",
        anomalyDetected: true,
        anomalyType: "PROMPT_INJECTION",
        reasoning: `Static analysis detected: ${highThreat.type}`,
        suggestedAction: "BLOCK_AND_ESCALATE",
        validationTime: Date.now() - startTime,
        method: "STATIC_ANALYSIS"
      };
    }

    try {
      const prompt = `Validate this customer support interaction:

USER MESSAGE: "${userMessage.substring(0, 500)}"
AI RESPONSE: "${aiResponse.substring(0, 1000)}"
SESSION CONTEXT: Turn ${sessionContext.turnCount || 1}, Prior flags: ${sessionContext.priorFlags || 0}

Return JSON validation result only.`;

      const result = await this.model.generateContent(prompt);
      const raw = result.response.text().trim().replace(/^```json?\n?|\n?```$/g, "").trim();
      const parsed = JSON.parse(raw);

      if (staticThreats.length > 0) {
        parsed.securityFlags = [...(parsed.securityFlags || []), ...staticThreats];
        parsed.anomalyDetected = true;
        if (!parsed.anomalyType) parsed.anomalyType = staticThreats[0].type;
        if (parsed.suggestedAction === "PASS") parsed.suggestedAction = "FLAG_FOR_REVIEW";
      }

      return { ...parsed, validationTime: Date.now() - startTime, method: "LLM_ANALYSIS" };

    } catch (error) {
      console.error("[ValidatorAgent] Error:", error.message);
      return {
        confidenceScore: 0.5,
        securityFlags: staticThreats,
        hallucinationRisk: "medium",
        complianceStatus: "review",
        anomalyDetected: staticThreats.length > 0,
        anomalyType: staticThreats.length > 0 ? staticThreats[0].type : null,
        reasoning: `Validator error: ${error.message}`,
        suggestedAction: "FLAG_FOR_REVIEW",
        validationTime: Date.now() - startTime,
        method: "FALLBACK"
      };
    }
  }
}

module.exports = { ValidatorAgent };
