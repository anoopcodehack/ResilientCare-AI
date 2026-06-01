const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

export const createSession = () => req("/api/chat/session", { method: "POST" });
export const sendMessage = (sessionId: string, message: string) => req("/api/chat/message", { method: "POST", body: JSON.stringify({ sessionId, message }) });
export const generateTicket = (sessionId: string) => req("/api/chat/ticket", { method: "POST", body: JSON.stringify({ sessionId }) });
export const getAdminStats = () => req("/api/admin/stats");
export const getAdminSessions = () => req("/api/admin/sessions");
export const getAdminEvents = () => req("/api/admin/events");
export const getSessionDetail = (id: string) => req(`/api/admin/session/${id}`);
export const resolveFlag = (sessionId: string, flagId: string) => req("/api/admin/resolve", { method: "POST", body: JSON.stringify({ sessionId, flagId }) });
export const terminateSession = (sessionId: string) => req("/api/admin/terminate", { method: "POST", body: JSON.stringify({ sessionId }) });
export const getTickets = () => req("/api/admin/tickets");
export const updateTicket = (ticketId: string, status: string) => req("/api/admin/ticket/update", { method: "POST", body: JSON.stringify({ ticketId, status }) });
export const getAnalytics = () => req("/api/admin/analytics");
export const getKnowledgeBase = () => req("/api/admin/kb");
export const addKBEntry = (data: any) => req("/api/admin/kb", { method: "POST", body: JSON.stringify(data) });
export const deleteKBEntry = (id: string) => req(`/api/admin/kb/${id}`, { method: "DELETE" });
