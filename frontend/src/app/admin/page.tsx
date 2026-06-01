"use client";
import { useState, useEffect, useCallback } from "react";
import { useAdminWebSocket } from "@/hooks/useAdminWebSocket";
import { getAdminStats, getAdminSessions, getAdminEvents, getSessionDetail,
  resolveFlag, terminateSession, getTickets, updateTicket, getAnalytics,
  getKnowledgeBase, addKBEntry, deleteKBEntry } from "@/lib/api";
import Link from "next/link";

type Tab = "overview" | "sessions" | "events" | "tickets" | "analytics" | "kb" | "live";

const SENTIMENT_EMOJI: Record<string,string> = { positive:"😊",satisfied:"😊",neutral:"😐",confused:"🤔",frustrated:"😤",negative:"😞",angry:"😠" };

function ConfBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--surface-3)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value/max)*100,100)}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [kb, setKb] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [replayIndex, setReplayIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string,string>>({});
  const [newKbQ, setNewKbQ] = useState(""); const [newKbA, setNewKbA] = useState("");
  const { messages: wsMessages, connected, lastEvent } = useAdminWebSocket();

  const fetchAll = useCallback(async () => {
    try {
      const [s, sess, ev, tk, an, k] = await Promise.all([
        getAdminStats(), getAdminSessions(), getAdminEvents(),
        getTickets(), getAnalytics(), getKnowledgeBase()
      ]);
      setStats(s); setSessions(sess.sessions || []); setEvents(ev.events || []);
      setTickets(tk.tickets || []); setAnalytics(an); setKb(k.entries || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "ANOMALY_DETECTED" || lastEvent.type === "ESCALATION_TRIGGERED" || lastEvent.type === "TICKET_CREATED") {
      fetchAll();
      setLiveAlerts(prev => [lastEvent, ...prev].slice(0,50));
    }
    if (lastEvent.type === "AGENT_STATUS") {
      setAgentStatuses(prev => ({ ...prev, [lastEvent.sessionId!]: lastEvent.data?.message }));
      setTimeout(() => setAgentStatuses(prev => { const n={...prev}; delete n[lastEvent.sessionId!]; return n; }), 5000);
    }
    if (["INTERACTION","FLAG_RESOLVED","SESSION_TERMINATED"].includes(lastEvent.type)) fetchAll();
  }, [lastEvent, fetchAll]);

  const statusColor = (s:string) => ({active:"var(--success)",flagged:"var(--warning)",critical:"var(--danger)",escalated:"var(--info)",terminated:"var(--muted)"}[s]||"var(--muted)");
  const confColor = (v:number) => v>0.7?"var(--success)":v>0.4?"var(--warning)":"var(--danger)";
  const priorityColor = (p:string) => ({critical:"var(--danger)",high:"var(--warning)",medium:"var(--info)",low:"var(--success)"}[p]||"var(--muted)");

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "sessions", label: "Sessions", badge: stats?.flaggedSessions + stats?.criticalSessions + stats?.escalatedSessions || 0 },
    { key: "events", label: "Events", badge: stats?.pendingFlags || 0 },
    { key: "tickets", label: "Tickets", badge: stats?.openTickets || 0 },
    { key: "analytics", label: "Analytics" },
    { key: "kb", label: "Knowledge Base" },
    { key: "live", label: "Live Feed", badge: liveAlerts.filter(a => !a._seen).length },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 glass-strong border-b sticky top-0 z-50" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display font-700 text-xl" style={{ color: "var(--primary)" }}>ResilientCare</Link>
          <span className="badge badge-danger">ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono">
            <span className={`status-dot ${connected?"active":"critical"}`} />
            <span style={{ color: "var(--foreground-muted)" }}>{connected?"WS LIVE":"RECONNECTING"}</span>
          </div>
          {(stats?.pendingFlags > 0) && (
            <span className="px-2 py-1 rounded text-xs font-mono animate-pulse" style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
              {stats.pendingFlags} FLAGS
            </span>
          )}
          <Link href="/chat" className="text-xs px-3 py-1.5 rounded glass font-mono" style={{ color: "var(--foreground-muted)" }}>← User View</Link>
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 p-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {[
            { label: "Sessions", value: stats.totalSessions, color: "var(--primary)" },
            { label: "Active", value: stats.activeSessions, color: "var(--success)" },
            { label: "Flagged", value: stats.flaggedSessions, color: "var(--warning)" },
            { label: "Critical", value: stats.criticalSessions, color: "var(--danger)" },
            { label: "Escalated", value: stats.escalatedSessions, color: "var(--info)" },
            { label: "Messages", value: stats.totalMessages, color: "var(--primary)" },
            { label: "Anomalies", value: stats.totalAnomalies, color: "var(--warning)" },
            { label: "Tickets", value: stats.openTickets, color: "var(--info)" },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-lg text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="font-mono font-600 text-lg" style={{ color: s.color }}>{s.value ?? 0}</div>
              <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 px-4 pt-3 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-600 uppercase tracking-widest rounded-t whitespace-nowrap transition-all"
            style={{ background: activeTab===t.key?"var(--surface-2)":"transparent", color: activeTab===t.key?"var(--foreground)":"var(--muted)", borderBottom: activeTab===t.key?"2px solid var(--primary)":"2px solid transparent" }}>
            {t.label}
            {(t.badge||0) > 0 && <span className="px-1 rounded text-xs" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="max-w-5xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* Anomaly breakdown */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Anomaly Types</h3>
                {analytics?.anomalyBreakdown?.length > 0 ? analytics.anomalyBreakdown.map((a:any) => (
                  <div key={a.type} className="mb-2">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span style={{ color: "var(--foreground-muted)" }}>{a.type}</span>
                    </div>
                    <ConfBar value={a.count} max={Math.max(...analytics.anomalyBreakdown.map((x:any)=>x.count),1)} color="var(--danger)" />
                  </div>
                )) : <p className="text-xs" style={{ color: "var(--muted)" }}>No anomalies yet</p>}
              </div>

              {/* Sentiment breakdown */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Sentiment Distribution</h3>
                {analytics?.sentimentBreakdown?.length > 0 ? analytics.sentimentBreakdown.map((s:any) => (
                  <div key={s.sentiment} className="mb-2 flex items-center gap-2">
                    <span className="text-sm">{SENTIMENT_EMOJI[s.sentiment]||"😐"}</span>
                    <div className="flex-1">
                      <ConfBar value={s.count} max={Math.max(...analytics.sentimentBreakdown.map((x:any)=>x.count),1)} color="var(--info)" />
                    </div>
                    <span className="text-xs font-mono w-16" style={{ color: "var(--muted)" }}>{s.sentiment}</span>
                  </div>
                )) : <p className="text-xs" style={{ color: "var(--muted)" }}>No sentiment data yet</p>}
              </div>

              {/* Pipeline stats */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Pipeline Stats</h3>
                {[
                  { label: "Messages", value: analytics?.totalMessages || 0 },
                  { label: "Escalations", value: analytics?.totalEscalations || 0 },
                  { label: "Tickets Created", value: analytics?.ticketsGenerated || 0 },
                  { label: "Detection Rate", value: stats?.totalMessages ? `${((stats.totalAnomalies/stats.totalMessages)*100).toFixed(1)}%` : "0%" },
                  { label: "Resolution Rate", value: stats?.totalAnomalies ? `${((stats.resolvedAnomalies/stats.totalAnomalies)*100).toFixed(0)}%` : "100%" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xs font-mono" style={{ color: "var(--foreground-muted)" }}>{item.label}</span>
                    <span className="text-xs font-mono font-600" style={{ color: "var(--primary)" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active agent statuses */}
            {Object.keys(agentStatuses).length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--primary-dim)", border: "1px solid rgba(0,212,255,0.3)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>⚡ Active Agent Processing</h3>
                {Object.entries(agentStatuses).map(([sid, msg]) => (
                  <div key={sid} className="text-xs font-mono flex items-center gap-2">
                    <span className="status-dot active" />
                    <span style={{ color: "var(--muted)" }}>{sid.substring(0,8)}...</span>
                    <span style={{ color: "var(--primary)" }}>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hourly chart */}
            {analytics?.hourlyTrend && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Hourly Activity (Last 12h)</h3>
                <div className="flex items-end gap-1 h-16">
                  {analytics.hourlyTrend.map((h:any, i:number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div className="w-full rounded-t transition-all" title={`${h.hour}: ${h.messages} msgs, ${h.anomalies} anomalies`}
                        style={{ height: `${Math.max((h.messages / Math.max(...analytics.hourlyTrend.map((x:any)=>x.messages),1)) * 56, 2)}px`, background: h.anomalies > 0 ? "var(--warning)" : "var(--primary)", opacity: 0.8 }} />
                      {i % 3 === 0 && <span className="text-xs font-mono" style={{ color: "var(--muted)", fontSize: "9px" }}>{h.hour}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--muted)" }}><span className="w-3 h-2 rounded" style={{ background: "var(--primary)", display: "inline-block" }} />Normal</span>
                  <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--muted)" }}><span className="w-3 h-2 rounded" style={{ background: "var(--warning)", display: "inline-block" }} />Anomalies</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SESSIONS */}
        {activeTab === "sessions" && (
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-700 mt-2 mb-3">Sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-sm font-mono text-center py-10" style={{ color: "var(--muted)" }}>No sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.id} onClick={async () => { const d = await getSessionDetail(s.id); setSelectedSession(d); setReplayIndex(-1); }}
                      className="p-3 rounded-xl cursor-pointer hover:opacity-80 transition-all"
                      style={{ background: selectedSession?.id===s.id?"var(--surface-3)":"var(--surface-2)", border: `1px solid ${s.unresolvedFlags>0?"var(--warning)":"var(--border)"}`, borderLeft: `3px solid ${statusColor(s.status)}` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-600" style={{ color: "var(--foreground)" }}>{s.id.substring(0,12)}...</span>
                          <span className="badge" style={{ background: "rgba(0,0,0,0.3)", color: statusColor(s.status) }}>{s.status.toUpperCase()}</span>
                          {s.latestSentiment && s.latestSentiment !== "neutral" && <span className="text-sm">{SENTIMENT_EMOJI[s.latestSentiment]}</span>}
                          {s.escalated && <span className="badge badge-info">ESCALATED</span>}
                          {s.hasTicket && <span className="badge badge-success">🎫 TICKET</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "var(--muted)" }}>
                          {s.unresolvedFlags > 0 && <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>{s.unresolvedFlags} flags</span>}
                          <span>{s.turnCount} turns</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Session detail + replay */}
            {selectedSession && (
              <div className="w-96 flex-shrink-0 p-4 rounded-xl overflow-y-auto" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", maxHeight: "calc(100vh - 220px)" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-700">Session Detail</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setReplayIndex(replayIndex < 0 ? 0 : -1)}
                      className="text-xs px-2 py-1 rounded font-mono"
                      style={{ background: replayIndex >= 0 ? "var(--info-dim)" : "var(--surface-3)", color: replayIndex >= 0 ? "var(--info)" : "var(--muted)", border: `1px solid ${replayIndex >= 0 ? "var(--info)" : "var(--border)"}` }}>
                      {replayIndex >= 0 ? "Exit Replay" : "▶ Replay"}
                    </button>
                    <button onClick={() => { terminateSession(selectedSession.id); setSelectedSession(null); fetchAll(); }}
                      className="text-xs px-2 py-1 rounded font-mono" style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid var(--danger)" }}>End</button>
                  </div>
                </div>

                {/* Replay controls */}
                {replayIndex >= 0 && (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: "var(--info-dim)", border: "1px solid var(--info)" }}>
                    <p className="text-xs font-mono mb-2" style={{ color: "var(--info)" }}>▶ SESSION REPLAY — Turn {replayIndex+1} of {selectedSession.history?.length || 0}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setReplayIndex(Math.max(0, replayIndex-1))} disabled={replayIndex===0}
                        className="text-xs px-2 py-1 rounded font-mono" style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>◀ Prev</button>
                      <button onClick={() => setReplayIndex(Math.min((selectedSession.history?.length||1)-1, replayIndex+1))}
                        disabled={replayIndex>=(selectedSession.history?.length||1)-1}
                        className="text-xs px-2 py-1 rounded font-mono" style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>Next ▶</button>
                      <button onClick={() => setReplayIndex(-1)} className="text-xs px-2 py-1 rounded font-mono" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>Done</button>
                    </div>
                  </div>
                )}

                {/* Sentiment timeline */}
                {selectedSession.sentimentHistory?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--muted)" }}>Sentiment Timeline</h4>
                    <div className="flex gap-1 flex-wrap">
                      {selectedSession.sentimentHistory.slice(-10).map((s:any, i:number) => (
                        <span key={i} title={s.sentiment} className="text-lg">{SENTIMENT_EMOJI[s.sentiment]||"😐"}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flags */}
                {selectedSession.flags?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>Security Flags</h4>
                    {selectedSession.flags.map((flag:any) => (
                      <div key={flag.id} className="p-2.5 rounded-lg mb-2" style={{ background: "var(--surface)", border: `1px solid ${flag.resolved?"var(--border)":"var(--danger)"}` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`badge ${flag.resolved?"badge-success":"badge-danger"}`}>{flag.anomalyType}</span>
                          {!flag.resolved && (
                            <button onClick={() => { resolveFlag(selectedSession.id, flag.id); fetchAll(); getSessionDetail(selectedSession.id).then(setSelectedSession); }}
                              className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "var(--success-dim)", color: "var(--success)" }}>Resolve</button>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>{flag.userMessage?.substring(0,80)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ticket */}
                {selectedSession.ticket && (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: "var(--info-dim)", border: "1px solid var(--info)" }}>
                    <h4 className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--info)" }}>🎫 {selectedSession.ticket.id}</h4>
                    <p className="text-xs font-600" style={{ color: "var(--foreground)" }}>{selectedSession.ticket.title}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--foreground-muted)" }}>{selectedSession.ticket.summary}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className="badge" style={{ background: "rgba(0,0,0,0.3)", color: priorityColor(selectedSession.ticket.priority) }}>{selectedSession.ticket.priority}</span>
                      <span className="badge badge-muted">{selectedSession.ticket.category}</span>
                    </div>
                  </div>
                )}

                {/* Conversation / Replay */}
                <h4 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                  {replayIndex >= 0 ? `Replay — Turn ${replayIndex + 1}` : "Conversation"}
                </h4>
                <div className="space-y-1.5">
                  {(replayIndex >= 0
                    ? selectedSession.history?.slice(0, replayIndex + 1)
                    : selectedSession.history?.slice(-12)
                  )?.map((turn:any, i:number) => (
                    <div key={i} className="p-2 rounded text-xs"
                      style={{ background: turn.flagged?"var(--danger-dim)":"var(--surface)", borderLeft: `2px solid ${turn.role==="user"?"var(--primary)":"var(--muted)"}`, color: "var(--foreground-muted)" }}>
                      <span className="font-mono font-600 uppercase" style={{ color: turn.role==="user"?"var(--primary)":"var(--muted)" }}>{turn.role}: </span>
                      {turn.content?.substring(0,150)}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {turn.flagged && <span className="badge badge-danger">FLAGGED</span>}
                        {turn.sentiment && <span className="text-sm">{SENTIMENT_EMOJI[turn.sentiment.sentiment]||""}</span>}
                        {turn.validation?.status === "HEALED" && <span className="badge badge-warning">HEALED</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENTS */}
        {activeTab === "events" && (
          <div className="max-w-4xl">
            <h2 className="font-display text-xl font-700 mt-2 mb-4">Anomaly Event Log</h2>
            {events.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--muted)" }}>
                <div className="text-4xl mb-3">🛡️</div>
                <p className="font-mono text-sm">No anomalies. Try demo attacks in chat!</p>
              </div>
            ) : events.map(ev => (
              <div key={ev.id} className="p-4 rounded-xl mb-3" style={{ background: "var(--surface-2)", border: `1px solid ${ev.resolved?"var(--border)":"var(--danger)"}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`badge ${ev.resolved?"badge-muted":"badge-danger"}`}>{ev.anomalyType||"UNKNOWN"}</span>
                      <span className="badge badge-info">{ev.triggerType||"N/A"}</span>
                      <span className="text-xs font-mono" style={{ color: confColor(ev.confidenceScore||0) }}>conf:{((ev.confidenceScore||0)*100).toFixed(0)}%</span>
                      {ev.resolved && <span className="badge badge-success">RESOLVED</span>}
                    </div>
                    <p className="text-xs font-mono mb-1" style={{ color: "var(--muted)" }}>Session: {ev.sessionId?.substring(0,16)}...</p>
                    {ev.userMessage && <div className="p-2 rounded text-xs font-mono mt-1" style={{ background: "var(--surface)", color: "var(--foreground-muted)" }}>"{ev.userMessage.substring(0,150)}"</div>}
                    {ev.reasoning && <p className="text-xs mt-1.5" style={{ color: "var(--foreground-muted)" }}>🔍 {ev.reasoning}</p>}
                  </div>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--muted)" }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}</span>
                </div>
                {!ev.resolved && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => { resolveFlag(ev.sessionId, ev.id); fetchAll(); }}
                      className="text-xs px-3 py-1.5 rounded font-mono font-600"
                      style={{ background: "var(--success-dim)", color: "var(--success)", border: "1px solid var(--success)" }}>✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TICKETS */}
        {activeTab === "tickets" && (
          <div className="max-w-4xl">
            <h2 className="font-display text-xl font-700 mt-2 mb-4">Support Tickets</h2>
            {tickets.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--muted)" }}>
                <div className="text-4xl mb-3">🎫</div>
                <p className="font-mono text-sm">No tickets yet. Use the Ticket button in chat.</p>
              </div>
            ) : tickets.map(t => (
              <div key={t.id} className="p-4 rounded-xl mb-3" style={{ background: "var(--surface-2)", border: `1px solid ${t.status==="open"?"var(--info)":"var(--border)"}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono font-600 text-sm" style={{ color: "var(--info)" }}>{t.id}</span>
                      <span className="badge" style={{ background: "rgba(0,0,0,0.3)", color: priorityColor(t.priority) }}>{t.priority?.toUpperCase()}</span>
                      <span className="badge badge-muted">{t.category}</span>
                      <span className={`badge ${t.status==="open"?"badge-warning":"badge-success"}`}>{t.status?.toUpperCase()}</span>
                      {t.requiresHumanAgent && <span className="badge badge-danger">NEEDS HUMAN</span>}
                    </div>
                    <p className="text-sm font-600 mb-1" style={{ color: "var(--foreground)" }}>{t.title}</p>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--foreground-muted)" }}>{t.summary}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {t.tags?.map((tag:string) => <span key={tag} className="badge badge-muted">{tag}</span>)}
                    </div>
                    <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>ETA: {t.estimatedResolutionTime} • Sentiment: {SENTIMENT_EMOJI[t.customerSentiment]||"😐"} {t.customerSentiment}</p>
                    {t.suggestedResolution && <div className="mt-2 p-2 rounded text-xs" style={{ background: "var(--success-dim)", color: "var(--success)" }}>💡 {t.suggestedResolution}</div>}
                  </div>
                </div>
                {t.status === "open" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <button onClick={() => { updateTicket(t.id, "in_progress"); fetchAll(); }}
                      className="text-xs px-3 py-1.5 rounded font-mono" style={{ background: "var(--warning-dim)", color: "var(--warning)", border: "1px solid var(--warning)" }}>→ In Progress</button>
                    <button onClick={() => { updateTicket(t.id, "resolved"); fetchAll(); }}
                      className="text-xs px-3 py-1.5 rounded font-mono" style={{ background: "var(--success-dim)", color: "var(--success)", border: "1px solid var(--success)" }}>✓ Resolve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="max-w-5xl">
            <h2 className="font-display text-xl font-700 mt-2 mb-4">Analytics Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confidence trend */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Confidence Score Trend</h3>
                {analytics?.confidenceTrend?.length > 0 ? (
                  <div className="flex items-end gap-0.5 h-20">
                    {analytics.confidenceTrend.slice(-40).map((c:any, i:number) => (
                      <div key={i} className="flex-1 rounded-t" title={`${(c.confidence*100).toFixed(0)}%`}
                        style={{ height: `${c.confidence*100}%`, minHeight: "2px", background: confColor(c.confidence), opacity: 0.8 }} />
                    ))}
                  </div>
                ) : <p className="text-xs" style={{ color: "var(--muted)" }}>Send messages to populate</p>}
              </div>

              {/* Hourly trend */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Message Volume (12h)</h3>
                {analytics?.hourlyTrend && (
                  <div className="flex items-end gap-1 h-20">
                    {analytics.hourlyTrend.map((h:any, i:number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-t" style={{ height: `${Math.max((h.messages/Math.max(...analytics.hourlyTrend.map((x:any)=>x.messages),1))*72,2)}px`, background: h.anomalies>0?"var(--warning)":"var(--primary)", opacity:0.8 }} />
                        {i%3===0 && <span style={{ fontSize:"8px", color:"var(--muted)" }}>{h.hour}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anomaly breakdown chart */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Attack Type Breakdown</h3>
                {analytics?.anomalyBreakdown?.length > 0 ? analytics.anomalyBreakdown.map((a:any, i:number) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span style={{ color: "var(--foreground-muted)" }}>{a.type}</span>
                      <span style={{ color: "var(--danger)" }}>{a.count}</span>
                    </div>
                    <ConfBar value={a.count} max={Math.max(...analytics.anomalyBreakdown.map((x:any)=>x.count),1)} color="var(--danger)" />
                  </div>
                )) : <p className="text-xs" style={{ color: "var(--muted)" }}>No attacks detected yet</p>}
              </div>

              {/* Sentiment chart */}
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Customer Sentiment Mix</h3>
                {analytics?.sentimentBreakdown?.length > 0 ? analytics.sentimentBreakdown.map((s:any, i:number) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span>{SENTIMENT_EMOJI[s.sentiment]||"😐"}</span>
                    <div className="flex-1">
                      <ConfBar value={s.count} max={Math.max(...analytics.sentimentBreakdown.map((x:any)=>x.count),1)} color="var(--info)" />
                    </div>
                    <span className="text-xs font-mono w-20" style={{ color: "var(--muted)" }}>{s.sentiment}</span>
                  </div>
                )) : <p className="text-xs" style={{ color: "var(--muted)" }}>No sentiment data</p>}
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE */}
        {activeTab === "kb" && (
          <div className="max-w-4xl">
            <h2 className="font-display text-xl font-700 mt-2 mb-1">Knowledge Base</h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>Entries are automatically injected into the Response Agent's context when relevant.</p>
            {/* Add entry */}
            <div className="p-4 rounded-xl mb-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <h3 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Add New Entry</h3>
              <div className="space-y-2">
                <input value={newKbQ} onChange={e => setNewKbQ(e.target.value)} placeholder="Question / Topic"
                  className="w-full px-3 py-2 rounded text-sm bg-transparent outline-none" style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                <textarea value={newKbA} onChange={e => setNewKbA(e.target.value)} placeholder="Answer / Resolution" rows={3}
                  className="w-full px-3 py-2 rounded text-sm bg-transparent outline-none resize-none" style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                <button onClick={async () => { if(!newKbQ||!newKbA) return; await addKBEntry({ question: newKbQ, answer: newKbA }); setNewKbQ(""); setNewKbA(""); fetchAll(); }}
                  disabled={!newKbQ||!newKbA}
                  className="px-4 py-2 rounded text-sm font-mono font-600" style={{ background: "var(--primary)", color: "#000" }}>
                  + Add to Knowledge Base
                </button>
              </div>
            </div>
            {/* Entries list */}
            <div className="space-y-2">
              {kb.map(entry => (
                <div key={entry.id} className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-info">{entry.category}</span>
                        {entry.tags?.slice(0,3).map((t:string) => <span key={t} className="badge badge-muted">{t}</span>)}
                      </div>
                      <p className="text-sm font-600 mb-1" style={{ color: "var(--foreground)" }}>Q: {entry.question}</p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-muted)" }}>A: {entry.answer}</p>
                    </div>
                    <button onClick={() => { deleteKBEntry(entry.id); fetchAll(); }}
                      className="text-xs px-2 py-1 rounded font-mono flex-shrink-0" style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIVE FEED */}
        {activeTab === "live" && (
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mt-2 mb-4">
              <h2 className="font-display text-xl font-700">Live WebSocket Feed</h2>
              <span className={`badge ${connected?"badge-success":"badge-danger"}`}>{connected?"● LIVE":"● DISCONNECTED"}</span>
            </div>
            <div className="space-y-2 font-mono">
              {wsMessages.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "var(--muted)" }}>No events yet. Send a message in chat.</p>
              ) : wsMessages.map((msg, i) => (
                <div key={i} className="p-3 rounded-lg text-xs animate-fade-in"
                  style={{ background: msg.type==="ANOMALY_DETECTED"?"var(--danger-dim)":msg.type==="ESCALATION_TRIGGERED"?"var(--warning-dim)":"var(--surface-2)", border: `1px solid ${msg.type==="ANOMALY_DETECTED"?"var(--danger)":msg.type==="ESCALATION_TRIGGERED"?"var(--warning)":"var(--border)"}`, color: "var(--foreground-muted)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${msg.type==="ANOMALY_DETECTED"?"badge-danger":msg.type==="ESCALATION_TRIGGERED"?"badge-warning":msg.type==="INTERACTION"?"badge-success":"badge-info"}`}>{msg.type}</span>
                    {msg.priority && <span className="badge badge-warning">{msg.priority}</span>}
                    <span style={{ color: "var(--muted)" }}>{msg._broadcastTime ? new Date(msg._broadcastTime).toLocaleTimeString() : ""}</span>
                  </div>
                  {msg.sessionId && <div style={{ color: "var(--muted)" }}>Session: {msg.sessionId.substring(0,16)}...</div>}
                  {msg.data?.anomalyType && <div style={{ color: "var(--danger)" }}>Anomaly: {msg.data.anomalyType}</div>}
                  {msg.data?.sentiment && <div>Sentiment: {SENTIMENT_EMOJI[msg.data.sentiment]} {msg.data.sentiment}</div>}
                  {msg.data?.userMessage && <div className="mt-0.5">"{msg.data.userMessage.substring(0,100)}"</div>}
                  {msg.data?.reasoning && <div className="mt-0.5" style={{ color: "var(--muted)" }}>Reason: {msg.data.reasoning.substring(0,120)}</div>}
                  {msg.data?.ticket && <div className="mt-0.5" style={{ color: "var(--info)" }}>🎫 Ticket: {msg.data.ticket.id} — {msg.data.ticket.title}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
