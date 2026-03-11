import { useState, useEffect } from "react";

const SEVERITY_CONFIG = {
  critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#DC2626", label: "Critical" },
  high:     { color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA", dot: "#EA580C", label: "High"     },
  medium:   { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#D97706", label: "Medium"   },
  low:      { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E", label: "Low"      },
};

const URGENCY_CONFIG = {
  "immediate":   { label: "Immediate action",  color: "#DC2626", bg: "#FEF2F2" },
  "this-week":   { label: "This week",          color: "#EA580C", bg: "#FFF7ED" },
  "this-month":  { label: "This month",         color: "#D97706", bg: "#FFFBEB" },
  "monitor":     { label: "Monitor",            color: "#6B7280", bg: "#F3F4F6" },
};

const SENTIMENT_CONFIG = {
  very_negative: { label: "Very Negative", color: "#DC2626", icon: "😡" },
  negative:      { label: "Negative",      color: "#EA580C", icon: "😞" },
  mixed:         { label: "Mixed",         color: "#D97706", icon: "😐" },
  neutral:       { label: "Neutral",       color: "#6B7280", icon: "😶" },
  positive:      { label: "Positive",      color: "#16A34A", icon: "😊" },
};

const TREND_CONFIG = {
  rising:   { icon: "↑", color: "#DC2626", label: "Rising" },
  stable:   { icon: "→", color: "#6B7280", label: "Stable" },
  declining:{ icon: "↓", color: "#16A34A", label: "Declining" },
};

const AREA_ICONS = {
  Shipping: "📦", "Product Quality": "🔧", Billing: "💳", Account: "👤",
  Returns: "↩️", Communication: "💬", Website: "🌐", Packaging: "📫", Other: "📌",
};

export default function Insights({ tickets, onNavigate }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastRun, setLastRun]     = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterArea, setFilterArea]         = useState("all");

  // On mount, try to load cached insights from Supabase
  useEffect(() => {
    loadCached();
  }, []);

  async function loadCached() {
    try {
      const res  = await fetch("/api/insights-load");
      if (res.ok) {
        const cached = await res.json();
        if (cached?.data) {
          setData(cached.data);
          setLastRun(cached.updated_at);
        }
      }
    } catch (e) { /* no cache yet */ }
  }

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res    = await fetch("/api/analyze-insights", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Analysis failed");
      setData(result);
      setLastRun(result.meta?.generatedAt);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const issues = data?.issues || [];
  const summary = data?.summary || {};

  const filteredIssues = issues.filter(issue => {
    if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false;
    if (filterArea !== "all" && issue.affectedArea !== filterArea) return false;
    return true;
  });

  const uniqueAreas = [...new Set(issues.map(i => i.affectedArea).filter(Boolean))];

  const healthScore = summary.healthScore ?? null;
  const healthColor = healthScore >= 75 ? "#16A34A" : healthScore >= 50 ? "#D97706" : "#DC2626";
  const healthLabel = healthScore >= 75 ? "Good" : healthScore >= 50 ? "Needs Attention" : "At Risk";

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F5F6FA", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1.15); opacity: 0; } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .issue-card { transition: box-shadow 0.15s, transform 0.15s; }
        .issue-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .filter-btn { transition: all 0.12s; }
        .filter-btn:hover { background: #F0EFFE !important; color: #6366F1 !important; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 28px 60px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>🔬</span>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F1117", margin: 0, letterSpacing: "-0.5px" }}>Issue Intelligence</h1>
            </div>
            <p style={{ fontSize: 14, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>
              AI-powered analysis of all customer messages · identifies patterns, risks, and opportunities
            </p>
            {lastRun && (
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
                Last analyzed: {new Date(lastRun).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{data?.meta?.source === "cron" ? " · ⏰ auto-synced" : ""}
                {data?.meta?.analyzedCount && ` · ${data.meta.analyzedCount} messages`}
              </p>
            )}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: loading ? "#F3F4F6" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: loading ? "#9CA3AF" : "#fff",
              border: "none", borderRadius: 12, padding: "12px 22px",
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
              transition: "all 0.15s", flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            {loading
              ? <><span style={{ width: 14, height: 14, border: "2px solid #D1D5DB", borderTopColor: "#6366F1", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Analyzing…</>
              : <>{data ? "↻ Re-analyze" : "✦ Run Analysis"}</>
            }
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", marginBottom: 24, color: "#DC2626", fontSize: 14, fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !data && !error && (
          <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeSlideUp 0.4s ease" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F1117", margin: "0 0 8px" }}>No insights yet</h2>
            <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Click <strong>Run Analysis</strong> to have AI scan all your inbox messages and tickets, then surface the top issues, patterns, and product insights.
            </p>
            {tickets.length === 0 && (
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                You don't have any messages yet.{" "}
                <button onClick={() => onNavigate("inbox")} style={{ background: "none", border: "none", color: "#6366F1", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
                  Go to Inbox →
                </button>
              </p>
            )}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ animation: "fadeSlideUp 0.3s ease" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20, border: "1px solid #EAECF0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "#F3F4F6", borderRadius: 10 }} />
                <div>
                  <div style={{ width: 200, height: 14, background: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ width: 140, height: 11, background: "#F9FAFB", borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 70, background: "#F9FAFB", borderRadius: 10 }} />)}
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "20px 0", fontSize: 14, color: "#9CA3AF", fontWeight: 600 }}>
              🤖 AI is reading all your customer messages…
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        {data && !loading && (
          <div style={{ animation: "fadeSlideUp 0.35s ease" }}>

            {/* ── Summary cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>

              {/* Health score */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #EAECF0", gridColumn: "span 1" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Health Score</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthScore ?? "–"}</span>
                  <span style={{ fontSize: 13, color: "#9CA3AF", paddingBottom: 4 }}>/100</span>
                </div>
                <div style={{ marginTop: 10, height: 5, background: "#F3F4F6", borderRadius: 99 }}>
                  <div style={{ height: "100%", width: (healthScore || 0) + "%", background: healthColor, borderRadius: 99, transition: "width 1s ease" }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
              </div>

              {/* Overall sentiment */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #EAECF0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Sentiment</div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{SENTIMENT_CONFIG[summary.overallSentiment]?.icon || "😐"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: SENTIMENT_CONFIG[summary.overallSentiment]?.color || "#6B7280" }}>
                  {SENTIMENT_CONFIG[summary.overallSentiment]?.label || "–"}
                </div>
              </div>

              {/* Biggest risk */}
              <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "18px 20px", border: "1px solid #FECACA" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>🚨 Biggest Risk</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7F1D1D", lineHeight: 1.5 }}>
                  {summary.biggestRisk || "–"}
                </div>
              </div>

              {/* Key win */}
              <div style={{ background: "#F0FDF4", borderRadius: 14, padding: "18px 20px", border: "1px solid #BBF7D0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>✓ What's Working</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#14532D", lineHeight: 1.5 }}>
                  {summary.keyWin || "–"}
                </div>
              </div>
            </div>

            {/* ── Executive summary ── */}
            {summary.executiveSummary && (
              <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #EAECF0", marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 16 }}>✦</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6366F1", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Executive Summary</div>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{summary.executiveSummary}</p>
                </div>
              </div>
            )}

            {/* ── Issue list header + filters ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F1117", margin: 0 }}>Top Issues</h2>
                <span style={{ background: "#F0EFFE", color: "#6366F1", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{filteredIssues.length}</span>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {/* Severity filter */}
                {["all","critical","high","medium","low"].map(s => (
                  <button key={s} className="filter-btn" onClick={() => setFilterSeverity(s)} style={{
                    padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "1.5px solid",
                    borderColor: filterSeverity === s ? "#6366F1" : "#E5E7EB",
                    background: filterSeverity === s ? "#F0EFFE" : "#fff",
                    color: filterSeverity === s ? "#6366F1" : "#6B7280",
                    cursor: "pointer", textTransform: "capitalize",
                  }}>{s === "all" ? "All severity" : s}</button>
                ))}
                {uniqueAreas.length > 0 && (
                  <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={{
                    padding: "5px 10px", fontSize: 12, fontWeight: 600, borderRadius: 7,
                    border: "1.5px solid " + (filterArea !== "all" ? "#6366F1" : "#E5E7EB"),
                    background: filterArea !== "all" ? "#F0EFFE" : "#fff",
                    color: filterArea !== "all" ? "#6366F1" : "#6B7280",
                    cursor: "pointer", outline: "none",
                  }}>
                    <option value="all">All areas</option>
                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* ── Issue cards ── */}
            {filteredIssues.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF", fontSize: 14 }}>
                No issues match the current filters
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredIssues.map((issue, idx) => {
                const sev  = SEVERITY_CONFIG[issue.severity]  || SEVERITY_CONFIG.medium;
                const urg  = URGENCY_CONFIG[issue.urgency]    || URGENCY_CONFIG.monitor;
                const trnd = TREND_CONFIG[issue.trend]        || TREND_CONFIG.stable;
                const sent = SENTIMENT_CONFIG[issue.sentiment]|| SENTIMENT_CONFIG.neutral;
                const isExpanded = expandedId === issue.id;
                const areaIcon = AREA_ICONS[issue.affectedArea] || "📌";

                return (
                  <div
                    key={issue.id || idx}
                    className="issue-card"
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1.5px solid",
                      borderColor: isExpanded ? sev.border : "#EAECF0",
                      boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.03)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Card header — always visible */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                      style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16 }}
                    >
                      {/* Rank + severity dot */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: sev.bg, border: "1.5px solid " + sev.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: sev.color }}>
                          {idx + 1}
                        </div>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sev.dot }} />
                      </div>

                      {/* Main info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#0F1117" }}>{issue.title}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, background: sev.bg, color: sev.color, borderRadius: 6, padding: "2px 8px", border: "1px solid " + sev.border }}>{sev.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: urg.bg, color: urg.color, borderRadius: 6, padding: "2px 8px" }}>{urg.label}</span>
                        </div>
                        <p style={{ fontSize: 13.5, color: "#6B7280", margin: "0 0 10px", lineHeight: 1.55 }}>{issue.description}</p>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <Stat icon={areaIcon} label={issue.affectedArea || "Other"} />
                          <Stat icon={sent.icon} label={sent.label} color={sent.color} />
                          <Stat icon={trnd.icon} label={trnd.label} color={trnd.color} />
                          <Stat icon="📨" label={`${issue.count} message${issue.count !== 1 ? "s" : ""}`} />
                          {issue.percentage > 0 && <Stat icon="%" label={`${issue.percentage}% of total`} />}
                        </div>
                      </div>

                      {/* Volume bar */}
                      <div style={{ flexShrink: 0, width: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: sev.color, lineHeight: 1 }}>{issue.count}</div>
                        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>reports</div>
                        <div style={{ width: "100%", height: 4, background: "#F3F4F6", borderRadius: 99, marginTop: 4 }}>
                          <div style={{ height: "100%", width: Math.min(100, (issue.count / (issues[0]?.count || 1)) * 100) + "%", background: sev.dot, borderRadius: 99 }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{isExpanded ? "▲ less" : "▼ more"}</div>
                      </div>
                    </div>

                    {/* ── Expanded detail ── */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #F3F4F6", padding: "20px 22px", background: "#FAFAFA", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeSlideUp 0.2s ease" }}>

                        {/* Left column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {/* Customer impact */}
                          <DetailBlock icon="👥" title="Customer Impact">
                            <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.6 }}>{issue.customerImpact}</p>
                          </DetailBlock>

                          {/* Trend reason */}
                          <DetailBlock icon={trnd.icon} title={"Trend: " + trnd.label} iconColor={trnd.color}>
                            <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.6 }}>{issue.trendReason}</p>
                          </DetailBlock>

                          {/* Example messages */}
                          {issue.examples?.length > 0 && (
                            <DetailBlock icon="💬" title="Example Messages">
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {issue.examples.map((ex, i) => (
                                  <div key={i} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#6B7280", lineHeight: 1.55, fontStyle: "italic" }}>
                                    "{ex}"
                                  </div>
                                ))}
                              </div>
                            </DetailBlock>
                          )}
                        </div>

                        {/* Right column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {/* Recommendation */}
                          <DetailBlock icon="💡" title="Recommendation" titleColor="#6366F1" bg="#F5F3FF" border="#DDD6FE">
                            <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{issue.recommendation}</p>
                          </DetailBlock>

                          {/* Related tickets */}
                          {issue.relatedTicketIds?.length > 0 && (
                            <DetailBlock icon="🎫" title="Related Messages">
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {issue.relatedTicketIds.map(id => (
                                  <button
                                    key={id}
                                    onClick={() => onNavigate("tickets")}
                                    style={{ background: "#F0EFFE", color: "#6366F1", border: "1px solid #DDD6FE", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    #{id}
                                  </button>
                                ))}
                              </div>
                            </DetailBlock>
                          )}

                          {/* Severity breakdown visual */}
                          <DetailBlock icon="📊" title="Severity Details">
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {[
                                { label: "Severity", value: sev.label, color: sev.color, bg: sev.bg },
                                { label: "Urgency",  value: urg.label, color: urg.color, bg: urg.bg },
                                { label: "Sentiment",value: sent.label,color: sent.color,bg: "#F9FAFB" },
                              ].map(row => (
                                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>{row.label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: row.color, background: row.bg, borderRadius: 5, padding: "2px 8px" }}>{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </DetailBlock>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Footer ── */}
            <div style={{ marginTop: 32, padding: "16px 20px", background: "#fff", borderRadius: 12, border: "1px solid #EAECF0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>
                Analyzed <strong style={{ color: "#374151" }}>{data.meta?.analyzedCount}</strong> messages using <strong style={{ color: "#374151" }}>Claude Sonnet</strong>
                {lastRun && <> · {new Date(lastRun).toLocaleString()}</>}
              </div>
              <button onClick={runAnalysis} style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#6B7280", cursor: "pointer" }}>
                ↻ Re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || "#6B7280" }}>{label}</span>
    </div>
  );
}

function DetailBlock({ icon, title, titleColor, children, bg, border }) {
  return (
    <div style={{ background: bg || "#fff", border: "1.5px solid " + (border || "#E5E7EB"), borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: titleColor || "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}
