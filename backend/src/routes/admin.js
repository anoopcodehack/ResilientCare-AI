const express = require("express");
const router = express.Router();
const { analyticsTracker } = require("../utils/analyticsTracker");
const { knowledgeBase } = require("../utils/knowledgeBase");

router.get("/stats", (req, res) => res.json(req.app.locals.sessionManager.getStats()));
router.get("/sessions", (req, res) => {
  const sessions = req.app.locals.sessionManager.getAllSessions();
  res.json({ sessions, total: sessions.length });
});
router.get("/events", (req, res) => {
  const events = req.app.locals.sessionManager.getFlaggedEvents();
  res.json({ events, pendingCount: events.filter(e => !e.resolved).length });
});
router.get("/session/:sessionId", (req, res) => {
  const session = req.app.locals.sessionManager.sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});
router.post("/resolve", (req, res) => {
  const { sessionId, flagId } = req.body;
  req.app.locals.sessionManager.resolveFlag(sessionId, flagId);
  req.app.locals.adminBroadcaster.broadcast({ type: "FLAG_RESOLVED", sessionId, flagId });
  res.json({ success: true });
});
router.post("/terminate", (req, res) => {
  const { sessionId } = req.body;
  req.app.locals.sessionManager.terminateSession(sessionId);
  req.app.locals.adminBroadcaster.broadcast({ type: "SESSION_TERMINATED", sessionId });
  res.json({ success: true });
});

// Tickets
router.get("/tickets", (req, res) => {
  const tickets = req.app.locals.sessionManager.getAllTickets();
  res.json({ tickets, total: tickets.length });
});
router.post("/ticket/update", (req, res) => {
  const { ticketId, status } = req.body;
  const ticket = req.app.locals.sessionManager.tickets.get(ticketId);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  res.json({ success: true, ticket });
});

// Analytics
router.get("/analytics", (req, res) => res.json(analyticsTracker.getSummary()));

// Knowledge Base
router.get("/kb", (req, res) => res.json({ entries: knowledgeBase.getAll() }));
router.post("/kb", (req, res) => {
  const { question, answer, category, tags } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "question and answer required" });
  const id = knowledgeBase.add({ question, answer, category: category || "general", tags: tags || [] });
  res.json({ success: true, id });
});
router.delete("/kb/:id", (req, res) => {
  knowledgeBase.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
