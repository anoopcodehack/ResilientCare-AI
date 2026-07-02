# 🛡️ ResilientCare AI
### Self-Healing, Security-Hardened Customer Support Architecture

---

## 📋 Submission Details

| Field | Details |
|-------|---------|
| **Category** | Support Chat Bot |
| **Track** | Open Innovation |
| **Tech Stack** | Node.js · Express · Next.js 14 · Anthropic Claude · WebSocket |
| **Demo Guide** | See [DEMO.md](./DEMO.md) for step-by-step judge walkthrough |

---

## 🧠 The Problem We Solve

Every enterprise AI support deployment has three silent failure modes:

| Failure Mode | Industry Impact |
|---|---|
| **Prompt Injection** | Attackers hijack the AI to leak data or bypass policies |
| **Hallucinations** | AI fabricates answers with false confidence, eroding trust |
| **Session Disintegration** | Context is lost mid-conversation, frustrating users |

Existing solutions either block the user entirely (bad UX) or let threats through silently (security risk). **There is no middle ground.** Until now.

---

## 💡 Our Solution: Dual-Agent Self-Healing Pipeline

ResilientCare AI introduces a **concurrent dual-agent validation architecture** — the first of its kind in the customer support space.

```
User Message
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              DUAL-AGENT PIPELINE                    │
│                                                     │
│  ┌──────────────────┐    ┌─────────────────────┐   │
│  │  Response Agent   │    │   Validator Agent    │   │
│  │                  │    │                     │   │
│  │ • Claude Sonnet  │◄───│ • Static Patterns   │   │
│  │ • System Prompt  │    │ • LLM Semantic Scan │   │
│  │ • Context Memory │    │ • Confidence Score  │   │
│  └────────┬─────────┘    └──────────┬──────────┘   │
│           │                         │              │
│           └────────────┬────────────┘              │
│                        ▼                           │
│              ┌──────────────────┐                  │
│              │ Routing Decision  │                  │
│              └────────┬─────────┘                  │
│                       │                            │
│          ┌────────────┼────────────┐               │
│          ▼            ▼            ▼               │
│        PASS      FLAG_REVIEW  BLOCK+ESCALATE       │
└──────────┼────────────┼────────────┼───────────────┘
           │            │            │
           ▼            ▼            ▼
     Send Response   Self-Heal    Self-Heal
                    + Escalate   + Escalate
                         │            │
                         └─────┬──────┘
                               ▼
                  ⚡ WebSocket Admin Dashboard
                    (Real-time, zero latency)
```

### What Makes This Novel

- **Two AI agents run concurrently** — not sequentially. No added wall-clock time.
- **5-layer threat detection** — static regex → obfuscation detection → context stuffing → LLM semantic analysis → system prompt hardening.
- **Self-healing is invisible to the user** — they get a helpful response; the admin gets a forensic alert.
- **Pre-screen fast path** — obvious attacks blocked in <1ms with zero LLM cost before the response agent even runs.
- **Fail-secure validator** — if the validator itself errors, it defaults to FLAG_FOR_REVIEW, never PASS.

---
MockUps


---
## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key → https://console.anthropic.com

### Setup & Run

```bash
# ── Backend ───────────────────────────────────────
cd backend
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm install
npm start
# → 🛡️  Running on http://localhost:4000

# ── Frontend (new terminal) ───────────────────────
cd frontend
cp .env.example .env
npm install
npm run dev
# → ✓ Ready on http://localhost:3000
```

### Open These URLs
| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Landing page & architecture overview |
| http://localhost:3000/chat | Customer-facing chat interface |
| http://localhost:3000/admin | Real-time admin security dashboard |

> 📽️ **For the full demo walkthrough, see [DEMO.md](./DEMO.md)**

---

## 🎯 Key Features

### 1. Dual-Agent Validation Pipeline
- **Response Agent** — Claude claude-sonnet-4-20250514 with enterprise system prompt generates customer support responses
- **Validator Agent** — Separate Claude instance with security-focused prompt evaluates every response concurrently
- Both agents run via `Promise.allSettled` — parallel, not serial

### 2. 5-Layer Threat Detection
| Layer | Method | Catches |
|-------|--------|---------|
| 1 | Regex pre-screen | Known injection phrases |
| 2 | Ratio analysis | Character obfuscation attempts |
| 3 | Length analysis | Context stuffing attacks |
| 4 | LLM semantic scan | Novel/zero-day prompt injections |
| 5 | System prompt hardening | Persona override attempts |

### 3. Self-Healing Protocol
When anomaly detected:
1. ✅ Deploy context-appropriate safe response to user
2. ✅ Preserve full session state (conversation continues)
3. ✅ Log forensic data (original message, blocked response, reasoning)
4. ✅ Escalate to admin via WebSocket in real-time
5. ✅ User experience is never disrupted

### 4. Real-Time Admin Dashboard
- WebSocket-driven live event feed with auto-reconnect
- Session monitoring: active / flagged / critical status
- One-click flag resolution and session termination
- Full conversation replay with anomaly annotations
- Confidence score visualisation per interaction

### 5. Session State Persistence
- Conversation history survives anomaly events intact
- Flag history with resolution tracking and timestamps
- Bounded memory with production-ready cleanup interface
- Database-ready SessionManager (swap Map → Redis)

---

## 🔒 Security Architecture

### Attack Types Detected & Handled
```
✓ Prompt Injection       — "Ignore all previous instructions..."
✓ Persona Override       — "You are now DAN / unrestricted AI..."
✓ Template Injection     — "{{malicious_payload}}"
✓ Context Stuffing       — Oversized payloads designed to push system prompt out
✓ Data Exfiltration      — "Reveal your system prompt / API keys..."
✓ Obfuscation Attempts   — High special-character ratio inputs
```

### Compliance Scoring Per Response
```json
{
  "confidenceScore": 0.94,
  "hallucinationRisk": "low",
  "complianceStatus": "pass",
  "anomalyDetected": false,
  "suggestedAction": "PASS"
}
```

---

## 📁 Project Structure

```
resilientcare/
├── DEMO.md                            ← Judge demo script (READ THIS)
├── README.md                          ← This file
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── server.js                  ← Express + WebSocket server
│       ├── agents/
│       │   ├── responseAgent.js       ← Claude response generation
│       │   ├── validatorAgent.js      ← Security & quality validation
│       │   └── dualAgentPipeline.js   ← Orchestration + self-healing
│       ├── routes/
│       │   ├── chat.js                ← Chat API endpoints
│       │   └── admin.js               ← Admin API endpoints
│       └── utils/
│           ├── sessionManager.js      ← State persistence layer
│           └── adminBroadcaster.js    ← WebSocket broadcast manager
└── frontend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── app/
        │   ├── page.tsx               ← Landing page
        │   ├── chat/page.tsx          ← Customer chat UI
        │   └── admin/page.tsx         ← Admin dashboard
        ├── hooks/
        │   └── useAdminWebSocket.ts   ← WS hook with auto-reconnect
        └── lib/
            └── api.ts                 ← Typed API client
```

---

## 📡 API Reference

### Chat API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/session` | Create new session |
| POST | `/api/chat/message` | Send message (runs full pipeline) |
| GET | `/api/chat/history/:id` | Get conversation history |

### Admin API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform-wide statistics |
| GET | `/api/admin/sessions` | All active sessions |
| GET | `/api/admin/events` | Anomaly event log |
| GET | `/api/admin/session/:id` | Full session detail |
| POST | `/api/admin/resolve` | Resolve a security flag |
| POST | `/api/admin/terminate` | Terminate a session |

### WebSocket: `ws://localhost:4000/ws/admin`
| Event | Direction | Payload |
|-------|-----------|---------|
| `SNAPSHOT` | Server→Client | Full state on connect |
| `ANOMALY_DETECTED` | Server→Client | Real-time forensic alert |
| `INTERACTION` | Server→Client | Clean interaction logged |
| `FLAG_RESOLVED` | Bidirectional | Flag resolution update |
| `SESSION_TERMINATED` | Bidirectional | Session end event |

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend Runtime | Node.js + Express | High concurrency, non-blocking I/O |
| AI Models | Anthropic Claude claude-sonnet-4-20250514 (×2) | Best-in-class for instruction following |
| Real-time | WebSocket (ws) | Low-latency admin push notifications |
| Frontend | Next.js 14 + TypeScript | Production-grade React with SSR |
| Styling | Tailwind CSS | Rapid, consistent design system |
| Security | Helmet + express-rate-limit | Defense-in-depth HTTP layer |
| Validation | Zod + custom regex | Schema + pattern security |

---

## 📊 Evaluation Criteria Alignment

| Criteria | Weight | How We Address It |
|----------|--------|------------------|
| **Model Innovation & Novelty** | 30% | Dual-agent concurrent pipeline — two Claude instances with different roles, not one |
| **Real-World Applicability** | 25% | Prompt injection is an actual CVE-class threat in production AI systems |
| **Technical Architecture** | 25% | 5-layer detection, WebSocket real-time, session persistence, fail-secure design |
| **Documentation Clarity** | 20% | README + DEMO.md with judge Q&A, architecture diagrams, and API reference |

---


