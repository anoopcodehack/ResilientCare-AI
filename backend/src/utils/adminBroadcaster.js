const WebSocket = require("ws");

/**
 * AdminBroadcaster: Manages WebSocket broadcast to all connected admin clients
 */
class AdminBroadcaster {
  constructor(wss) {
    this.wss = wss;
    this.messageQueue = [];
    this.MAX_QUEUE = 100;
  }

  broadcast(payload) {
    const message = JSON.stringify({
      ...payload,
      _broadcastTime: new Date().toISOString()
    });

    // Queue for clients that connect later
    this.messageQueue.push(message);
    if (this.messageQueue.length > this.MAX_QUEUE) {
      this.messageQueue.shift();
    }

    let delivered = 0;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        delivered++;
      }
    });

    if (payload.type === "ANOMALY_DETECTED") {
      console.log(`[AdminBroadcaster] 🚨 Anomaly broadcast to ${delivered} admin clients`);
    }
  }

  getQueuedMessages(limit = 50) {
    return this.messageQueue.slice(-limit);
  }
}

module.exports = { AdminBroadcaster };
