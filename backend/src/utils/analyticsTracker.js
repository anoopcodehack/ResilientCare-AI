/**
 * AnalyticsTracker: Tracks all metrics for the admin analytics dashboard
 */
class AnalyticsTracker {
  constructor() {
    this.hourlyBuckets = new Map(); // "YYYY-MM-DD-HH" => metrics
    this.anomalyTypes = new Map();
    this.sentimentCounts = new Map();
    this.confidenceHistory = [];
    this.resolutionTimes = [];
    this.ticketsGenerated = 0;
    this.escalations = 0;
    this.totalMessages = 0;
    this.totalSessions = 0;
  }

  getBucketKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}-${String(date.getHours()).padStart(2,'0')}`;
  }

  getBucket(key) {
    if (!this.hourlyBuckets.has(key)) {
      this.hourlyBuckets.set(key, {
        messages: 0, anomalies: 0, escalations: 0,
        avgConfidence: 0, confidenceSum: 0, confidenceCount: 0,
        sentiments: {}, sessions: 0
      });
    }
    return this.hourlyBuckets.get(key);
  }

  trackMessage(confidence, sentiment) {
    this.totalMessages++;
    const bucket = this.getBucket(this.getBucketKey());
    bucket.messages++;
    bucket.confidenceSum += confidence;
    bucket.confidenceCount++;
    bucket.avgConfidence = bucket.confidenceSum / bucket.confidenceCount;

    if (sentiment) {
      bucket.sentiments[sentiment] = (bucket.sentiments[sentiment] || 0) + 1;
      this.sentimentCounts.set(sentiment, (this.sentimentCounts.get(sentiment) || 0) + 1);
    }

    this.confidenceHistory.push({ time: new Date().toISOString(), confidence });
    if (this.confidenceHistory.length > 500) this.confidenceHistory.shift();
  }

  trackAnomaly(anomalyType) {
    const bucket = this.getBucket(this.getBucketKey());
    bucket.anomalies++;
    this.anomalyTypes.set(anomalyType, (this.anomalyTypes.get(anomalyType) || 0) + 1);
  }

  trackEscalation() {
    this.escalations++;
    const bucket = this.getBucket(this.getBucketKey());
    bucket.escalations++;
  }

  trackSession() {
    this.totalSessions++;
    const bucket = this.getBucket(this.getBucketKey());
    bucket.sessions++;
  }

  trackTicket() {
    this.ticketsGenerated++;
  }

  // Get last N hours of data for charts
  getHourlyTrend(hours = 24) {
    const result = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      const key = this.getBucketKey(d);
      const bucket = this.hourlyBuckets.get(key) || { messages: 0, anomalies: 0, avgConfidence: 0, escalations: 0 };
      result.push({
        hour: `${String(d.getHours()).padStart(2,'0')}:00`,
        date: d.toISOString(),
        messages: bucket.messages,
        anomalies: bucket.anomalies,
        escalations: bucket.escalations,
        avgConfidence: Math.round((bucket.avgConfidence || 0) * 100)
      });
    }
    return result;
  }

  getAnomalyBreakdown() {
    return Array.from(this.anomalyTypes.entries()).map(([type, count]) => ({ type, count }));
  }

  getSentimentBreakdown() {
    return Array.from(this.sentimentCounts.entries()).map(([sentiment, count]) => ({ sentiment, count }));
  }

  getConfidenceTrend(limit = 50) {
    return this.confidenceHistory.slice(-limit);
  }

  getSummary() {
    return {
      totalMessages: this.totalMessages,
      totalSessions: this.totalSessions,
      totalEscalations: this.escalations,
      ticketsGenerated: this.ticketsGenerated,
      anomalyBreakdown: this.getAnomalyBreakdown(),
      sentimentBreakdown: this.getSentimentBreakdown(),
      hourlyTrend: this.getHourlyTrend(12),
      confidenceTrend: this.getConfidenceTrend()
    };
  }
}

const analyticsTracker = new AnalyticsTracker();
module.exports = { AnalyticsTracker, analyticsTracker };
