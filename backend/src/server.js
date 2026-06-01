require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");

const chatRouter = require("./routes/chat");
const adminRouter = require("./routes/admin");
const { SessionManager } = require("./utils/sessionManager");
const { AdminBroadcaster } = require("./utils/adminBroadcaster");

const app = express();
const server = http.createServer(app);

// WebSocket server for admin dashboard
const wss = new WebSocket.Server({ server, path: "/ws/admin" });

// Initialize singletons
const sessionManager = new SessionManager();
const adminBroadcaster = new AdminBroadcaster(wss);

// Attach to app locals so routes can access
app.locals.sessionManager = sessionManager;
app.locals.adminBroadcaster = adminBroadcaster;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "10kb" })); // Limit payload size

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

// Routes
app.use("/api/chat", chatRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    activeSessions: sessionManager.getActiveCount(),
    flaggedSessions: sessionManager.getFlaggedCount()
  });
});

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  const clientId = uuidv4();
  console.log(`[WS] Admin client connected: ${clientId}`);

  // Send current state snapshot
  ws.send(JSON.stringify({
    type: "SNAPSHOT",
    data: {
      sessions: sessionManager.getAllSessions(),
      flaggedEvents: sessionManager.getFlaggedEvents(),
      stats: sessionManager.getStats()
    }
  }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "RESOLVE_FLAG") {
        sessionManager.resolveFlag(msg.sessionId, msg.flagId);
        adminBroadcaster.broadcast({
          type: "FLAG_RESOLVED",
          sessionId: msg.sessionId,
          flagId: msg.flagId
        });
      }
      if (msg.type === "TERMINATE_SESSION") {
        sessionManager.terminateSession(msg.sessionId);
        adminBroadcaster.broadcast({
          type: "SESSION_TERMINATED",
          sessionId: msg.sessionId
        });
      }
    } catch (e) {
      console.error("[WS] Invalid message from admin:", e.message);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Admin client disconnected: ${clientId}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🛡️  ResilientCare AI Backend running on port ${PORT}`);
  console.log(`📡  WebSocket admin channel: ws://localhost:${PORT}/ws/admin`);
  console.log(`🔗  API: http://localhost:${PORT}/api\n`);
});

module.exports = { app, server };
