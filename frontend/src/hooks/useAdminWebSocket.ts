"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";

export type WsMessage = {
  type: string;
  sessionId?: string;
  data?: any;
  priority?: "CRITICAL" | "WARNING";
  flagId?: string;
  _broadcastTime?: string;
};

export function useAdminWebSocket() {
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/admin`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("[AdminWS] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          setLastEvent(msg);

          if (msg.type === "SNAPSHOT") {
            // Initial snapshot — don't flood messages list
            return;
          }

          setMessages(prev => [msg, ...prev].slice(0, 200));
        } catch (e) {
          console.error("[AdminWS] Parse error", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("[AdminWS] Disconnected, reconnecting in 3s...");
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("[AdminWS] Connection error:", e);
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { messages, connected, lastEvent, send };
}
