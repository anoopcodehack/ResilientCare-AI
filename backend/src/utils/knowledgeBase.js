/**
 * KnowledgeBase: Simple in-memory RAG-style context store
 * Admin can add FAQ entries, and the Response Agent gets relevant context injected
 */
class KnowledgeBase {
  constructor() {
    this.entries = new Map();
    this.loadDefaults();
  }

  loadDefaults() {
    const defaults = [
      {
        id: "kb-001",
        category: "billing",
        question: "How do I cancel my subscription?",
        answer: "You can cancel your subscription anytime from Account Settings > Billing > Cancel Subscription. Cancellation takes effect at the end of your current billing period. No refunds for partial months.",
        tags: ["cancel", "subscription", "billing", "refund"]
      },
      {
        id: "kb-002",
        category: "account",
        question: "How do I reset my password?",
        answer: "Visit the login page and click 'Forgot Password'. Enter your email address and we'll send a reset link within 5 minutes. Check your spam folder if you don't receive it.",
        tags: ["password", "reset", "login", "account"]
      },
      {
        id: "kb-003",
        category: "billing",
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans. All payments are processed securely via Stripe.",
        tags: ["payment", "credit card", "billing", "stripe"]
      },
      {
        id: "kb-004",
        category: "technical",
        question: "Why is the app running slowly?",
        answer: "Try clearing your browser cache (Ctrl+Shift+Delete), disabling browser extensions, or switching to Chrome/Firefox. If issues persist, check our status page at status.company.com.",
        tags: ["slow", "performance", "bug", "browser", "cache"]
      },
      {
        id: "kb-005",
        category: "account",
        question: "How do I upgrade my plan?",
        answer: "Go to Account Settings > Billing > Upgrade Plan. Changes take effect immediately and you'll be charged a prorated amount for the remainder of your billing cycle.",
        tags: ["upgrade", "plan", "billing", "pro"]
      },
      {
        id: "kb-006",
        category: "technical",
        question: "How do I export my data?",
        answer: "Navigate to Settings > Data & Privacy > Export Data. You'll receive a download link via email within 24 hours containing all your data in JSON/CSV format.",
        tags: ["export", "data", "download", "privacy", "GDPR"]
      },
      {
        id: "kb-007",
        category: "general",
        question: "What are your support hours?",
        answer: "Our AI support is available 24/7. Human agents are available Monday-Friday, 9 AM - 6 PM IST. For urgent issues, use the priority support option in your dashboard.",
        tags: ["hours", "support", "human", "availability"]
      }
    ];

    defaults.forEach(entry => {
      this.entries.set(entry.id, { ...entry, createdAt: new Date().toISOString(), active: true });
    });
  }

  // Simple keyword-based retrieval (production would use embeddings)
  search(query, limit = 3) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);

    const scored = [];
    for (const entry of this.entries.values()) {
      if (!entry.active) continue;
      let score = 0;
      const searchable = `${entry.question} ${entry.answer} ${entry.tags.join(" ")} ${entry.category}`.toLowerCase();

      queryWords.forEach(word => {
        if (searchable.includes(word)) score += 1;
        if (entry.tags.some(t => t.toLowerCase().includes(word))) score += 2;
        if (entry.question.toLowerCase().includes(word)) score += 3;
      });

      if (score > 0) scored.push({ ...entry, score });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  // Format for system prompt injection
  getContextString(query) {
    const results = this.search(query);
    if (results.length === 0) return "";

    return `\n\nRELEVANT KNOWLEDGE BASE ARTICLES:\n${results.map(r =>
      `Q: ${r.question}\nA: ${r.answer}`
    ).join("\n\n")}`;
  }

  add(entry) {
    const id = `kb-${Date.now()}`;
    this.entries.set(id, { id, ...entry, createdAt: new Date().toISOString(), active: true });
    return id;
  }

  update(id, updates) {
    const entry = this.entries.get(id);
    if (!entry) return false;
    this.entries.set(id, { ...entry, ...updates, updatedAt: new Date().toISOString() });
    return true;
  }

  delete(id) {
    return this.entries.delete(id);
  }

  getAll() {
    return Array.from(this.entries.values());
  }
}

// Singleton
const knowledgeBase = new KnowledgeBase();
module.exports = { KnowledgeBase, knowledgeBase };
