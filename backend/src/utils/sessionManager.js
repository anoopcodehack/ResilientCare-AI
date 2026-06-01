const { v4: uuidv4 } = require("uuid");

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.flaggedEvents = [];
    this.tickets = new Map();
    this.stats = { totalSessions: 0, totalMessages: 0, totalAnomalies: 0, resolvedAnomalies: 0 };
  }

  createSession(metadata = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId, createdAt: Date.now(), lastActivity: Date.now(),
      history: [], flags: [], sentimentHistory: [], status: "active",
      escalated: false, ticket: null,
      metadata: { userAgent: metadata.userAgent || "unknown", ip: metadata.ip || "unknown", ...metadata }
    };
    this.sessions.set(sessionId, session);
    this.stats.totalSessions++;
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === "terminated") return null;
    session.lastActivity = Date.now();
    return session;
  }

  addTurn(sessionId, turn) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.history.push(turn);
    session.lastActivity = Date.now();
    this.stats.totalMessages++;
    if (session.history.length > 100) session.history = session.history.slice(-100);
  }

  addSentiment(sessionId, sentiment) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.sentimentHistory.push({ ...sentiment, timestamp: new Date().toISOString() });
    if (session.sentimentHistory.length > 50) session.sentimentHistory.shift();
  }

  addFlag(sessionId, flag) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.flags.push(flag);
    session.status = flag.validation?.suggestedAction === "BLOCK_AND_ESCALATE" ? "critical" : "flagged";
    this.flaggedEvents.push({ sessionId, ...flag });
    this.stats.totalAnomalies++;
    if (this.flaggedEvents.length > 1000) this.flaggedEvents = this.flaggedEvents.slice(-1000);
  }

  setEscalated(sessionId, ticket) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.escalated = true;
    session.ticket = ticket;
    session.status = "escalated";
    this.tickets.set(ticket.id, { ...ticket, sessionId });
  }

  resolveFlag(sessionId, flagId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const flag = session.flags.find(f => f.id === flagId);
    if (flag) { flag.resolved = true; flag.resolvedAt = new Date().toISOString(); this.stats.resolvedAnomalies++; }
    if (session.flags.every(f => f.resolved)) session.status = "active";
    const gf = this.flaggedEvents.find(f => f.id === flagId);
    if (gf) { gf.resolved = true; gf.resolvedAt = new Date().toISOString(); }
  }

  terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) { session.status = "terminated"; session.terminatedAt = new Date().toISOString(); }
  }

  getAllSessions() {
    return Array.from(this.sessions.values())
      .filter(s => s.status !== "terminated")
      .map(s => ({
        id: s.id, status: s.status, createdAt: s.createdAt, lastActivity: s.lastActivity,
        turnCount: s.history.length, flagCount: s.flags.length,
        unresolvedFlags: s.flags.filter(f => !f.resolved).length,
        escalated: s.escalated, hasTicket: !!s.ticket,
        latestSentiment: s.sentimentHistory[s.sentimentHistory.length - 1]?.sentiment || "neutral",
        metadata: s.metadata
      }));
  }

  getAllTickets() {
    return Array.from(this.tickets.values());
  }

  getFlaggedEvents() { return this.flaggedEvents.slice(-100).reverse(); }
  getActiveCount() { return Array.from(this.sessions.values()).filter(s => s.status === "active").length; }
  getFlaggedCount() { return Array.from(this.sessions.values()).filter(s => ["flagged","critical","escalated"].includes(s.status)).length; }

  getStats() {
    const sessions = Array.from(this.sessions.values());
    return {
      ...this.stats,
      activeSessions: sessions.filter(s => s.status === "active").length,
      flaggedSessions: sessions.filter(s => s.status === "flagged").length,
      criticalSessions: sessions.filter(s => s.status === "critical").length,
      escalatedSessions: sessions.filter(s => s.status === "escalated").length,
      pendingFlags: this.flaggedEvents.filter(f => !f.resolved).length,
      openTickets: Array.from(this.tickets.values()).filter(t => t.status === "open").length
    };
  }
}

module.exports = { SessionManager };
