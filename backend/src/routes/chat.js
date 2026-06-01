const express = require("express");
const router = express.Router();
const { DualAgentPipeline } = require("../agents/dualAgentPipeline");
const { TicketAgent } = require("../agents/ticketAgent");
const { analyticsTracker } = require("../utils/analyticsTracker");

let pipeline = null;
const ticketAgent = new TicketAgent();

function getPipeline(req) {
  if (!pipeline) pipeline = new DualAgentPipeline(req.app.locals.sessionManager, req.app.locals.adminBroadcaster);
  return pipeline;
}

router.post("/session", (req, res) => {
  const session = req.app.locals.sessionManager.createSession({ userAgent: req.headers["user-agent"], ip: req.ip });
  analyticsTracker.trackSession();
  res.json({ sessionId: session.id, createdAt: new Date(session.createdAt).toISOString() });
});

router.post("/message", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: "sessionId and message are required" });
  if (typeof message !== "string" || message.trim().length === 0) return res.status(400).json({ error: "Message must be non-empty" });
  if (message.length > 3000) return res.status(400).json({ error: "Message too long (max 3000 chars)" });

  const session = req.app.locals.sessionManager.getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  try {
    const result = await getPipeline(req).process(message.trim(), session);
    res.json({
      response: result.response,
      sessionId: result.sessionId,
      processingTime: result.processingTime,
      confidence: result.confidence,
      sentiment: result.sentiment,
      status: result.status,
      escalated: result.escalated || false
    });
  } catch (error) {
    console.error("[Chat] Pipeline error:", error.message);
    res.status(500).json({ error: "An error occurred. Please try again.", code: "PIPELINE_ERROR" });
  }
});

router.post("/ticket", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const session = req.app.locals.sessionManager.getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const ticket = await ticketAgent.generate(sessionId, session.history, session.sentimentHistory, session.flags);
  req.app.locals.sessionManager.setEscalated(sessionId, ticket);
  analyticsTracker.trackTicket();
  req.app.locals.adminBroadcaster.broadcast({ type: "TICKET_CREATED", sessionId, data: { ticket } });
  res.json({ ticket });
});

router.get("/history/:sessionId", (req, res) => {
  const session = req.app.locals.sessionManager.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ sessionId: session.id, history: session.history, flagCount: session.flags.length, sentimentHistory: session.sentimentHistory });
});

module.exports = router;
