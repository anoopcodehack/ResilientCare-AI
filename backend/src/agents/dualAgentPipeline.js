const { ResponseAgent } = require("./responseAgent");
const { ValidatorAgent } = require("./validatorAgent");
const { SentimentAgent } = require("./sentimentAgent");
const { TicketAgent } = require("./ticketAgent");
const { knowledgeBase } = require("../utils/knowledgeBase");
const { analyticsTracker } = require("../utils/analyticsTracker");
const { v4: uuidv4 } = require("uuid");

const responseAgent = new ResponseAgent();
const validatorAgent = new ValidatorAgent();
const sentimentAgent = new SentimentAgent();
const ticketAgent = new TicketAgent();

const SAFE_RESPONSES = {
  PROMPT_INJECTION: "I'm here to help with customer support questions. Could you tell me more about what you need assistance with today?",
  DATA_LEAK: "I want to make sure I'm providing you with the right information. Could you clarify your question so I can assist you better?",
  POLICY_VIOLATION: "I'm only able to assist with customer support-related inquiries. Is there something specific about our products or services I can help you with?",
  HALLUCINATION: "I want to make sure I give you accurate information. Our support team can assist with this — please contact us at support@company.com for detailed guidance.",
  TONE_VIOLATION: "I apologize for any confusion. How can I assist you today?",
  DEFAULT: "I'm here to help! Could you please tell me more about what you need assistance with?"
};

const ESCALATION_THRESHOLD_CONFIDENCE = 0.45;
const ESCALATION_THRESHOLD_TURNS = 8;

class DualAgentPipeline {
  constructor(sessionManager, adminBroadcaster) {
    this.sessionManager = sessionManager;
    this.adminBroadcaster = adminBroadcaster;
  }

  async process(userMessage, session) {
    const pipelineStart = Date.now();
    const sessionContext = {
      turnCount: session.history.length / 2 + 1,
      priorFlags: session.flags.length,
      ageMinutes: (Date.now() - session.createdAt) / 60000
    };

    // Broadcast typing state: pre-screen
    this.adminBroadcaster.broadcast({
      type: "AGENT_STATUS",
      sessionId: session.id,
      data: { stage: "PRE_SCREEN", message: "Pre-screening input..." }
    });

    // PHASE 1: Pre-screen
    const preScreenThreats = validatorAgent.preScreenInput(userMessage);
    const highThreat = preScreenThreats.find(t => t.severity === "HIGH");

    if (highThreat) {
      // Run sentiment even on blocked messages
      const sentiment = await sentimentAgent.analyze(userMessage, session.history);
      analyticsTracker.trackAnomaly(highThreat.type);
      return await this._handleAnomaly(session, userMessage, null, {
        confidenceScore: 0.0, anomalyDetected: true,
        anomalyType: highThreat.type, suggestedAction: "BLOCK_AND_ESCALATE",
        securityFlags: preScreenThreats, reasoning: `Pre-screen blocked: ${highThreat.type}`,
        hallucinationRisk: "low", complianceStatus: "fail"
      }, sentiment, pipelineStart, "PRE_SCREEN_BLOCK");
    }

    // PHASE 2: Run sentiment + response + validator all concurrently
    this.adminBroadcaster.broadcast({
      type: "AGENT_STATUS", sessionId: session.id,
      data: { stage: "PROCESSING", message: "Response Agent generating • Validator Agent analyzing • Sentiment Agent reading mood..." }
    });

    // Get KB context for response agent
    const kbContext = knowledgeBase.getContextString(userMessage);

    const [sentimentResult, responseResult] = await Promise.allSettled([
      sentimentAgent.analyze(userMessage, session.history),
      responseAgent.process(userMessage, session.history, session.id, kbContext)
    ]);

    const sentiment = sentimentResult.status === "fulfilled" ? sentimentResult.value : { sentiment: "neutral", score: 0, urgency: "low", escalationRecommended: false };

    if (responseResult.status === "rejected") {
      throw new Error(`Response agent failed: ${responseResult.reason.message}`);
    }
    const agentResponse = responseResult.value;

    // PHASE 3: Validate
    this.adminBroadcaster.broadcast({
      type: "AGENT_STATUS", sessionId: session.id,
      data: { stage: "VALIDATING", message: "Validator Agent scoring response..." }
    });

    const validation = await validatorAgent.validateResponse(userMessage, agentResponse.response, sessionContext);
    const totalTime = Date.now() - pipelineStart;

    // Track analytics
    analyticsTracker.trackMessage(validation.confidenceScore, sentiment.sentiment);

    // PHASE 4: Check escalation conditions
    const shouldEscalate = this._checkEscalation(session, sentiment, validation, sessionContext);

    if (validation.anomalyDetected || validation.suggestedAction !== "PASS") {
      analyticsTracker.trackAnomaly(validation.anomalyType || "UNKNOWN");
      return await this._handleAnomaly(session, userMessage, agentResponse, validation, sentiment, pipelineStart, "VALIDATOR_FLAG");
    }

    // PHASE 5: Store turn with sentiment
    this.sessionManager.addTurn(session.id, {
      role: "user", content: userMessage,
      timestamp: new Date().toISOString(),
      sentiment: { sentiment: sentiment.sentiment, score: sentiment.score, urgency: sentiment.urgency }
    });
    this.sessionManager.addTurn(session.id, {
      role: "assistant", content: agentResponse.response,
      timestamp: new Date().toISOString(),
      validation: { confidenceScore: validation.confidenceScore, status: "PASS" }
    });

    // Track sentiment in session
    this.sessionManager.addSentiment(session.id, sentiment);

    // PHASE 6: Auto-escalate if needed
    if (shouldEscalate) {
      analyticsTracker.trackEscalation();
      await this._handleEscalation(session, userMessage, sentiment, validation);
    }

    // Broadcast clean interaction
    this.adminBroadcaster.broadcast({
      type: "INTERACTION", sessionId: session.id,
      data: {
        userMessage: userMessage.substring(0, 200),
        confidenceScore: validation.confidenceScore,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        urgency: sentiment.urgency,
        processingTime: totalTime,
        status: "PASS",
        kbContextUsed: kbContext.length > 0
      }
    });

    console.log(`[Pipeline] PASS ${session.id} | conf:${validation.confidenceScore.toFixed(2)} | sentiment:${sentiment.sentiment} | ${totalTime}ms`);

    return {
      response: agentResponse.response,
      confidence: validation.confidenceScore,
      processingTime: totalTime,
      status: shouldEscalate ? "ESCALATED" : "PASS",
      sessionId: session.id,
      sentiment: { sentiment: sentiment.sentiment, score: sentiment.score, urgency: sentiment.urgency },
      escalated: shouldEscalate
    };
  }

  _checkEscalation(session, sentiment, validation, sessionContext) {
    // Escalate if: sentiment agent says so, confidence is very low, or too many turns without resolution
    if (sentiment.escalationRecommended) return true;
    if (validation.confidenceScore < ESCALATION_THRESHOLD_CONFIDENCE) return true;
    if (sessionContext.turnCount >= ESCALATION_THRESHOLD_TURNS) return true;
    if (sentiment.urgency === "critical") return true;
    return false;
  }

  async _handleEscalation(session, userMessage, sentiment, validation) {
    // Generate ticket for escalation
    const ticket = await ticketAgent.generate(
      session.id, session.history,
      session.sentimentHistory || [], session.flags
    );
    analyticsTracker.trackTicket();

    this.sessionManager.setEscalated(session.id, ticket);

    this.adminBroadcaster.broadcast({
      type: "ESCALATION_TRIGGERED", sessionId: session.id,
      priority: sentiment.urgency === "critical" ? "CRITICAL" : "HIGH",
      data: {
        reason: sentiment.escalationRecommended ? "Sentiment-based escalation" : "Confidence threshold breach",
        sentiment: sentiment.sentiment, urgency: sentiment.urgency,
        ticket, timestamp: new Date().toISOString(),
        sessionHistory: session.history.slice(-8)
      }
    });

    console.log(`[Pipeline] 🔺 ESCALATION triggered for session ${session.id} | reason: ${sentiment.sentiment}`);
  }

  async _handleAnomaly(session, userMessage, agentResponse, validation, sentiment, pipelineStart, triggerType) {
    const anomalyType = validation.anomalyType || "UNKNOWN";
    const safeResponse = SAFE_RESPONSES[anomalyType] || SAFE_RESPONSES.DEFAULT;
    const totalTime = Date.now() - pipelineStart;

    const flag = {
      id: uuidv4(), timestamp: new Date().toISOString(),
      anomalyType, triggerType,
      userMessage: userMessage.substring(0, 500),
      originalResponse: agentResponse?.response?.substring(0, 500) || null,
      safeResponseUsed: safeResponse,
      validation, resolved: false
    };

    this.sessionManager.addFlag(session.id, flag);
    this.sessionManager.addTurn(session.id, {
      role: "user", content: userMessage,
      timestamp: new Date().toISOString(), flagged: true,
      sentiment: sentiment ? { sentiment: sentiment.sentiment, score: sentiment.score } : null
    });
    this.sessionManager.addTurn(session.id, {
      role: "assistant", content: safeResponse,
      timestamp: new Date().toISOString(),
      validation: { confidenceScore: validation.confidenceScore, status: "HEALED", anomalyType }
    });

    if (sentiment) this.sessionManager.addSentiment(session.id, sentiment);

    this.adminBroadcaster.broadcast({
      type: "ANOMALY_DETECTED", sessionId: session.id,
      priority: validation.suggestedAction === "BLOCK_AND_ESCALATE" ? "CRITICAL" : "WARNING",
      data: {
        flagId: flag.id, anomalyType, triggerType,
        userMessage: userMessage.substring(0, 300),
        originalResponse: agentResponse?.response?.substring(0, 300) || "BLOCKED_PRE_RESPONSE",
        safeResponseDeployed: safeResponse,
        confidenceScore: validation.confidenceScore,
        securityFlags: validation.securityFlags,
        reasoning: validation.reasoning,
        sentiment: sentiment?.sentiment,
        sessionHistory: session.history.slice(-6),
        processingTime: totalTime,
        timestamp: flag.timestamp
      }
    });

    return {
      response: safeResponse,
      confidence: validation.confidenceScore,
      processingTime: totalTime,
      status: "HEALED",
      sessionId: session.id,
      sentiment: sentiment ? { sentiment: sentiment.sentiment, score: sentiment.score, urgency: sentiment.urgency } : null,
      _internal: { flagId: flag.id }
    };
  }
}

module.exports = { DualAgentPipeline };
