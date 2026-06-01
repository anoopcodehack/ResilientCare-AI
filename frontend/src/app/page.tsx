"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px"
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, var(--info), transparent 70%)", filter: "blur(60px)" }} />

      <div className="relative z-10 text-center max-w-4xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full glass border border-primary/20">
          <span className="status-dot active" />
          <span className="font-mono text-xs text-primary tracking-widest">DUAL-AGENT VALIDATION ACTIVE</span>
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl md:text-7xl font-800 mb-4 leading-tight tracking-tight">
          <span style={{ color: "var(--foreground)" }}>Resilient</span>
          <span style={{ color: "var(--primary)" }}>Care</span>
          <span className="block text-3xl md:text-4xl mt-2 font-400" style={{ color: "var(--foreground-muted)" }}>
            Self-Healing AI Support Architecture
          </span>
        </h1>

        <p className="text-base md:text-lg mt-6 mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
          Enterprise AI that detects prompt injection, prevents hallucinations, and automatically 
          heals itself — all without disrupting your end users.
        </p>

        {/* Architecture pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {["Response Agent", "Validator Agent", "Self-Healing Protocol", "WebSocket Admin", "Session Persistence"].map(item => (
            <span key={item} className="px-3 py-1.5 rounded-md text-xs font-mono glass" style={{ color: "var(--foreground-muted)", borderColor: "var(--border)" }}>
              {item}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/chat" className="group relative px-8 py-4 rounded-lg font-display font-600 text-base overflow-hidden transition-all duration-300"
            style={{ background: "var(--primary)", color: "#000" }}>
            <span className="relative z-10 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Customer Chat
            </span>
          </Link>
          <Link href="/admin" className="group px-8 py-4 rounded-lg font-display font-600 text-base transition-all duration-300 glass"
            style={{ color: "var(--foreground)", borderColor: "var(--border-strong)" }}>
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Admin Dashboard
            </span>
          </Link>
        </div>

        {/* Architecture diagram */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: "🤖",
              title: "Response Agent",
              desc: "Processes user intent using Claude claude-sonnet-4-20250514, maintaining full conversational context with enterprise system prompts.",
              color: "var(--primary)"
            },
            {
              icon: "🛡️",
              title: "Validator Agent",
              desc: "Concurrent LLM + static analysis pipeline evaluates every response for injection attacks, hallucinations, and policy violations.",
              color: "var(--warning)"
            },
            {
              icon: "🔄",
              title: "Self-Healing Protocol",
              desc: "On anomaly detection, deploys safe response, preserves session state, and escalates to admin via WebSocket without end-user disruption.",
              color: "var(--success)"
            }
          ].map(card => (
            <div key={card.title} className="p-5 rounded-xl glass" style={{ borderLeft: `2px solid ${card.color}` }}>
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="font-display font-700 text-base mb-2" style={{ color: card.color }}>{card.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
