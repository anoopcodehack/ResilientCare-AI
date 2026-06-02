// "use client";
// import Link from "next/link";

// export default function HomePage() {
//   return (
//     <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
//       {/* Background grid */}
//       <div className="absolute inset-0" style={{
//         backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`,
//         backgroundSize: "40px 40px"
//       }} />

//       {/* Glow orbs */}
//       <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10"
//         style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)", filter: "blur(60px)" }} />
//       <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-5"
//         style={{ background: "radial-gradient(circle, var(--info), transparent 70%)", filter: "blur(60px)" }} />

//       <div className="relative z-10 text-center max-w-4xl">
//         {/* Badge */}
//         <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full glass border border-primary/20">
//           <span className="status-dot active" />
//           <span className="font-mono text-xs text-primary tracking-widest">DUAL-AGENT VALIDATION ACTIVE</span>
//         </div>

//         {/* Title */}
//         <h1 className="font-display text-5xl md:text-7xl font-800 mb-4 leading-tight tracking-tight">
//           <span style={{ color: "var(--foreground)" }}>Resilient</span>
//           <span style={{ color: "var(--primary)" }}>Care</span>
//           <span className="block text-3xl md:text-4xl mt-2 font-400" style={{ color: "var(--foreground-muted)" }}>
//             Self-Healing AI Support Architecture
//           </span>
//         </h1>

//         <p className="text-base md:text-lg mt-6 mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
//           Enterprise AI that detects prompt injection, prevents hallucinations, and automatically 
//           heals itself — all without disrupting your end users.
//         </p>

//         {/* Architecture pills */}
//         <div className="flex flex-wrap justify-center gap-3 mb-12">
//           {["Response Agent", "Validator Agent", "Self-Healing Protocol", "WebSocket Admin", "Session Persistence"].map(item => (
//             <span key={item} className="px-3 py-1.5 rounded-md text-xs font-mono glass" style={{ color: "var(--foreground-muted)", borderColor: "var(--border)" }}>
//               {item}
//             </span>
//           ))}
//         </div>

//         {/* CTAs */}
//         <div className="flex flex-col sm:flex-row gap-4 justify-center">
//           <Link href="/chat" className="group relative px-8 py-4 rounded-lg font-display font-600 text-base overflow-hidden transition-all duration-300"
//             style={{ background: "var(--primary)", color: "#000" }}>
//             <span className="relative z-10 flex items-center gap-2">
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
//               Customer Chat
//             </span>
//           </Link>
//           <Link href="/admin" className="group px-8 py-4 rounded-lg font-display font-600 text-base transition-all duration-300 glass"
//             style={{ color: "var(--foreground)", borderColor: "var(--border-strong)" }}>
//             <span className="flex items-center gap-2">
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
//               Admin Dashboard
//             </span>
//           </Link>
//         </div>

//         {/* Architecture diagram */}
//         <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
//           {[
//             {
//               icon: "🤖",
//               title: "Response Agent",
//               desc: "Processes user intent using Claude claude-sonnet-4-20250514, maintaining full conversational context with enterprise system prompts.",
//               color: "var(--primary)"
//             },
//             {
//               icon: "🛡️",
//               title: "Validator Agent",
//               desc: "Concurrent LLM + static analysis pipeline evaluates every response for injection attacks, hallucinations, and policy violations.",
//               color: "var(--warning)"
//             },
//             {
//               icon: "🔄",
//               title: "Self-Healing Protocol",
//               desc: "On anomaly detection, deploys safe response, preserves session state, and escalates to admin via WebSocket without end-user disruption.",
//               color: "var(--success)"
//             }
//           ].map(card => (
//             <div key={card.title} className="p-5 rounded-xl glass" style={{ borderLeft: `2px solid ${card.color}` }}>
//               <div className="text-2xl mb-3">{card.icon}</div>
//               <h3 className="font-display font-700 text-base mb-2" style={{ color: card.color }}>{card.title}</h3>
//               <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>{card.desc}</p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </main>
//   );
// }

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function GlitchText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<any>(null);
  function scramble() {
    let i = 0;
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      setDisplay(text.split("").map((c, idx) =>
        idx < i ? text[idx] : c === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)]
      ).join(""));
      if (i >= text.length) clearInterval(ref.current);
      i += 0.5;
    }, 30);
  }
  useEffect(() => { scramble(); return () => clearInterval(ref.current); }, []);
  return <span onMouseEnter={scramble}>{display}</span>;
}

const STEPS = [
  { id: "01", label: "USER INPUT", icon: "→", desc: "Customer message received", color: "#00d4ff" },
  { id: "02", label: "PRE-SCREEN", icon: "⚡", desc: "5-layer static analysis", color: "#7c6fef" },
  { id: "03", label: "DUAL AGENTS", icon: "⊕", desc: "Response + Validator concurrent", color: "#00e599" },
  { id: "04", label: "CONFIDENCE", icon: "◈", desc: "Score vs compliance threshold", color: "#ffb800" },
  { id: "05", label: "SELF-HEAL", icon: "↺", desc: "Safe response deployed silently", color: "#ff3b5c" },
  { id: "06", label: "ESCALATE", icon: "▲", desc: "Admin alerted via WebSocket", color: "#00d4ff" },
];

const FEATURES = [
  { tag: "SECURITY", title: "Prompt Injection Defense", body: "9+ regex patterns + LLM semantic scan. Pre-screen blocks obvious attacks in under 1ms before any LLM cost.", accent: "#ff3b5c" },
  { tag: "INTELLIGENCE", title: "Dual-Agent Validation", body: "Response Agent and Validator Agent run concurrently via Promise.allSettled — not serially. Zero added latency.", accent: "#00d4ff" },
  { tag: "RESILIENCE", title: "Self-Healing Protocol", body: "Anomaly detected → safe response deployed → session preserved → admin alerted. End user sees nothing.", accent: "#00e599" },
  { tag: "ANALYTICS", title: "Real-Time Sentiment", body: "Every message scored for mood, urgency, escalation risk using Claude Haiku for speed and cost efficiency.", accent: "#7c6fef" },
  { tag: "AUTOMATION", title: "Auto Ticket Generation", body: "Claude generates structured support tickets with priority, category, tags, and suggested resolution on escalation.", accent: "#ffb800" },
  { tag: "KNOWLEDGE", title: "RAG Context Injection", body: "Admin-managed knowledge base. Relevant FAQ entries auto-injected into system prompt per conversation turn.", accent: "#00d4ff" },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--c:#00d4ff;--g:#00e599;--p:#7c6fef;--r:#ff3b5c;--o:#ffb800;--bg:#060810;--bg2:#0a0d16;--bd:rgba(255,255,255,0.06);--t:#e2e8f0;--m:#4a5568}
html,body{background:var(--bg);color:var(--t);font-family:'DM Sans',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--c)}
.gbg{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px);background-size:60px 60px}
.scan{position:fixed;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--c),transparent);opacity:.12;pointer-events:none;z-index:999}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:linear-gradient(180deg,rgba(6,8,16,.97) 0%,transparent 100%);border-bottom:1px solid var(--bd);backdrop-filter:blur(12px)}
.logo{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:3px;color:var(--c);text-decoration:none}
.logo span{color:var(--t)}
.nr{display:flex;align-items:center;gap:12px}
.badge{font-family:'Space Mono',monospace;font-size:10px;padding:4px 10px;border-radius:3px;background:rgba(0,229,153,.08);color:var(--g);border:1px solid rgba(0,229,153,.25);letter-spacing:1px;display:flex;align-items:center;gap:6px}
.dot{width:5px;height:5px;border-radius:50%;background:var(--g);animation:pd 1.5s infinite}
@keyframes pd{0%,100%{box-shadow:0 0 0 0 rgba(0,229,153,.4)}50%{box-shadow:0 0 0 6px rgba(0,229,153,0)}}
.btn{font-family:'Space Mono',monospace;font-size:11px;padding:9px 22px;border-radius:3px;text-decoration:none;transition:all .2s;letter-spacing:1px;cursor:pointer;border:none;display:inline-block}
.btn-p{background:var(--c);color:#000;font-weight:700}
.btn-p:hover{background:#00b8e0;transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,212,255,.25)}
.btn-g{background:transparent;color:var(--t);border:1px solid var(--bd)}
.btn-g:hover{border-color:rgba(0,212,255,.4);color:var(--c)}
.hero{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 48px 80px;text-align:center}
.ey{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:4px;color:var(--c);margin-bottom:28px;display:flex;align-items:center;gap:12px}
.title{font-family:'Bebas Neue',sans-serif;font-size:clamp(80px,13vw,168px);line-height:.88;letter-spacing:-2px;color:var(--t);margin-bottom:6px}
.ac{color:var(--c);position:relative}
.ac::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--c),transparent)}
.sub{font-family:'Bebas Neue',sans-serif;font-size:clamp(20px,3.5vw,44px);color:rgba(226,232,240,.25);letter-spacing:6px;margin-bottom:28px}
.desc{font-size:16px;line-height:1.75;color:rgba(226,232,240,.55);max-width:520px;margin:0 auto 44px}
.ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:72px}
.cta{font-family:'Space Mono',monospace;font-size:12px;letter-spacing:2px;padding:15px 38px;border-radius:3px;text-decoration:none;transition:all .3s;border:none;cursor:pointer;display:inline-block}
.cm{background:var(--c);color:#000;font-weight:700}
.cm:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(0,212,255,.3)}
.cs{background:transparent;color:var(--t);border:1px solid rgba(255,255,255,.12)}
.cs:hover{border-color:rgba(0,212,255,.4);color:var(--c)}
.stats{display:flex;gap:52px;justify-content:center;flex-wrap:wrap}
.sv{font-family:'Bebas Neue',sans-serif;font-size:52px;color:var(--c);line-height:1}
.sl{font-family:'Space Mono',monospace;font-size:10px;color:var(--m);letter-spacing:2px;margin-top:4px}
.sec{position:relative;z-index:1;padding:90px 48px}
.sl2{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--c);margin-bottom:12px}
.st{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5.5vw,68px);color:var(--t);margin-bottom:52px;letter-spacing:1px}
.pipe{display:flex;align-items:stretch;overflow-x:auto;padding-bottom:8px}
.ps{flex:1;min-width:130px;padding:22px 18px;border:1px solid var(--bd);border-right:none;transition:all .35s;position:relative;overflow:hidden}
.ps:last-child{border-right:1px solid var(--bd)}
.ps.on{border-color:rgba(0,212,255,.35);background:rgba(0,212,255,.03)}
.ps.on::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--c)}
.pi{font-family:'Space Mono',monospace;font-size:10px;color:var(--m);margin-bottom:14px}
.pic{font-size:22px;margin-bottom:10px;font-family:monospace;transition:color .35s}
.pl{font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:2px;margin-bottom:6px;transition:color .35s}
.pd{font-size:11px;color:var(--m);line-height:1.5}
.code{background:var(--bg2);border:1px solid var(--bd);padding:40px;font-family:'Space Mono',monospace;font-size:12px;line-height:2.1;color:rgba(226,232,240,.45);overflow-x:auto;border-radius:2px}
.kw{color:var(--c)}.str{color:var(--g)}.num{color:var(--o)}.cmt{color:var(--m);font-style:italic}.fn{color:var(--p)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1px;background:var(--bd)}
.feat{background:var(--bg2);padding:36px 32px;transition:background .3s;position:relative;overflow:hidden}
.feat:hover{background:#0c1018}
.feat::before{content:'';position:absolute;top:0;left:0;width:2px;height:0;transition:height .4s}
.ft{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;margin-bottom:18px}
.fn2{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;color:var(--t);margin-bottom:14px;line-height:1.1}
.fb{font-size:13px;line-height:1.7;color:rgba(226,232,240,.5)}
.foot{position:relative;z-index:1;padding:36px 48px;border-top:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-family:'Space Mono',monospace;font-size:11px;color:var(--m)}
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.f0{animation:fu .6s ease both}.f1{animation:fu .6s .1s ease both}.f2{animation:fu .6s .2s ease both}.f3{animation:fu .6s .3s ease both}.f4{animation:fu .6s .4s ease both}.f5{animation:fu .6s .5s ease both}
@media(max-width:768px){.nav{padding:14px 20px}.hero{padding:90px 20px 60px}.sec{padding:60px 20px}.foot{flex-direction:column;text-align:center;padding:28px 20px}}
`;

export default function HomePage() {
  const [active, setActive] = useState(0);
  const [scan, setScan] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % STEPS.length), 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setScan(p => (p + 2) % 100), 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="gbg" />
      <div className="scan" style={{ top: scan + "%" }} />

      <nav className="nav">
        <a href="/" className="logo"><span>Resilient</span>Care</a>
        <div className="nr">
          <span className="badge"><span className="dot" />SYSTEM LIVE</span>
          <Link href="/admin" className="btn btn-g">ADMIN</Link>
          <Link href="/chat" className="btn btn-p">LAUNCH DEMO</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="ey f0">
          <span className="dot" />
          DUAL-AGENT VALIDATION PIPELINE — HACKATHON 2025
          <span className="dot" />
        </div>
        <h1 className="title f1">
          <GlitchText text="RESILIENT" /><span className="ac">CARE</span>
        </h1>
        <p className="sub f2">SELF-HEALING AI SUPPORT ARCHITECTURE</p>
        <p className="desc f3">
          The only customer support platform with concurrent dual-agent validation,
          automatic self-healing, and zero end-user disruption — ever.
        </p>
        <div className="ctas f4">
          <Link href="/chat" className="cta cm">{"→ CUSTOMER CHAT"}</Link>
          <Link href="/admin" className="cta cs">{"⬡ ADMIN DASHBOARD"}</Link>
        </div>
        <div className="stats f5">
          {[["5","THREAT LAYERS"],["3","CONCURRENT AGENTS"],["<1MS","PRE-SCREEN"],["0","USER DISRUPTIONS"]].map(([v,l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div className="sv">{v}</div>
              <div className="sl">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" style={{ borderTop: "1px solid var(--bd)" }}>
        <div className="sl2">{"// EXECUTION MODEL"}</div>
        <div className="st">THE PIPELINE</div>
        <div className="pipe">
          {STEPS.map((s, i) => (
            <div key={s.id} className={"ps" + (active === i ? " on" : "")}>
              <div className="pi">{s.id}</div>
              <div className="pic" style={{ color: active === i ? s.color : "var(--m)" }}>{s.icon}</div>
              <div className="pl" style={{ color: active === i ? s.color : "var(--t)" }}>{s.label}</div>
              <div className="pd">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="code">
          <span className="cmt">{"// DUAL-AGENT PIPELINE — concurrent, zero serial latency"}</span><br />
          <br />
          <span className="kw">const</span> threats = <span className="fn">validator</span>.preScreen(msg); <span className="cmt">{"// <1ms, no LLM cost"}</span><br />
          <span className="kw">if</span> (threats.HIGH) <span className="kw">return</span> <span className="fn">selfHeal</span>(<span className="str">"BLOCK_AND_ESCALATE"</span>);<br />
          <br />
          <span className="kw">const</span> [sentiment, response] = <span className="kw">await</span> Promise.<span className="fn">allSettled</span>([<br />
          &nbsp;&nbsp;<span className="fn">sentimentAgent</span>.analyze(msg),<span className="cmt">{"     // Haiku — fast"}</span><br />
          &nbsp;&nbsp;<span className="fn">responseAgent</span>.process(msg + kb),<span className="cmt">{"  // Sonnet + RAG"}</span><br />
          ]);<br />
          <br />
          <span className="kw">const</span> v = <span className="kw">await</span> <span className="fn">validator</span>.validate(response);<br />
          <span className="kw">if</span> (v.anomaly) <span className="fn">selfHealingProtocol</span>(session); <span className="cmt">{"// user sees nothing"}</span><br />
          <span className="fn">broadcastAdmin</span>(<span className="str">"FORENSIC_ALERT"</span>, {"{"} confidence: <span className="num">0.0</span> {"}"});
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="sl2">{"// CAPABILITIES"}</div>
        <div className="st">BUILT TO WIN</div>
        <div className="grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feat" style={{ ["--a" as any]: f.accent }}
              onMouseEnter={e => { (e.currentTarget.querySelector(".feat-line") as any)?.style && null; }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "2px", height: "0", background: f.accent, transition: "height .4s" }}
                className="feat-line" />
              <div className="ft" style={{ color: f.accent }}>{f.tag}</div>
              <div className="fn2">{f.title}</div>
              <div className="fb">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" style={{ textAlign: "center", borderTop: "1px solid var(--bd)" }}>
        <div className="sl2" style={{ justifyContent: "center", display: "flex" }}>{"// DEMO"}</div>
        <div className="st" style={{ marginBottom: 20 }}>SEE IT IN ACTION</div>
        <p style={{ color: "rgba(226,232,240,.45)", fontSize: 15, marginBottom: 36, lineHeight: 1.8 }}>
          Open chat + admin side by side. Click Attacks.<br />
          Watch the self-healing pipeline fire in real-time.
        </p>
        <div className="ctas">
          <Link href="/chat" className="cta cm">{"→ OPEN CUSTOMER CHAT"}</Link>
          <Link href="/admin" className="cta cs">{"⬡ OPEN ADMIN DASHBOARD"}</Link>
        </div>
      </section>

      <footer className="foot">
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 3, color: "var(--c)" }}>RESILIENTCARE AI</span>
        <span>CATEGORY: SUPPORT CHAT BOT</span>
        <span style={{ color: "var(--g)" }}>● ALL SYSTEMS OPERATIONAL</span>
      </footer>
    </div>
  );
}
