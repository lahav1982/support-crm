import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const VOLUME_DATA = [
  { day: "Mon", open: 4, resolved: 3 },
  { day: "Tue", open: 6, resolved: 5 },
  { day: "Wed", open: 3, resolved: 6 },
  { day: "Thu", open: 8, resolved: 4 },
  { day: "Fri", open: 5, resolved: 7 },
  { day: "Sat", open: 2, resolved: 3 },
  { day: "Sun", open: 1, resolved: 2 },
];

const RESPONSE_DATA = [
  { day: "Mon", hours: 2.1 },
  { day: "Tue", hours: 1.8 },
  { day: "Wed", hours: 3.2 },
  { day: "Thu", hours: 1.4 },
  { day: "Fri", hours: 2.6 },
  { day: "Sat", hours: 4.1 },
  { day: "Sun", hours: 1.9 },
];

const TAG_DATA = [
  { name: "Shipping", value: 28, color: "#3b9fd6" },
  { name: "Refund", value: 22, color: "#e05555" },
  { name: "Account", value: 18, color: "#a855f7" },
  { name: "Sales", value: 16, color: "#4caf7d" },
  { name: "Exchange", value: 10, color: "#f59e2b" },
  { name: "Technical", value: 6, color: "#3b82f6" },
];

const tooltipStyle = { background: "#0d1117", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };

function StatCard({ label, value, sub, color = "#6c63ff" }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: "20px 24px", flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#4a5568" }}>{sub}</div>
    </div>
  );
}

export default function Analytics({ tickets }) {
  const open = tickets.filter(t => t.status === "open").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;
  const resolutionRate = Math.round((resolved / tickets.length) * 100);

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: 28, background: "#0a0e17", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Analytics</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#4a5568" }}>Last 7 days performance overview</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Tickets" value={tickets.length} sub="All time" color="#6c63ff" />
        <StatCard label="Open" value={open} sub="Need attention" color="#e05555" />
        <StatCard label="Resolved" value={resolved} sub="This week" color="#4caf7d" />
        <StatCard label="Resolution Rate" value={`${resolutionRate}%`} sub="↑ 4% vs last week" color="#48c6ef" />
        <StatCard label="Avg Response" value="2.1h" sub="↓ 0.3h vs last week" color="#f59e2b" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        {/* Volume */}
        <div style={{ flex: 2, background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Ticket Volume</div>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 16 }}>New vs resolved per day</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={VOLUME_DATA} barGap={4}>
              <XAxis dataKey="day" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="open" name="Opened" fill="#e05555" radius={[4,4,0,0]} />
              <Bar dataKey="resolved" name="Resolved" fill="#4caf7d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "#e05555" }}>■ Opened</span>
            <span style={{ fontSize: 10, color: "#4caf7d" }}>■ Resolved</span>
          </div>
        </div>

        {/* Response time */}
        <div style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Avg Response Time</div>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 16 }}>Hours per day</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={RESPONSE_DATA}>
              <XAxis dataKey="day" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="hours" name="Hours" stroke="#48c6ef" strokeWidth={2} dot={{ fill: "#48c6ef", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* By category */}
        <div style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Tickets by Category</div>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 16 }}>Distribution by tag</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={TAG_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {TAG_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {TAG_DATA.map(t => (
                <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{t.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team performance */}
        <div style={{ flex: 1, background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>Team Performance</div>
          <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 16 }}>Tickets resolved this week</div>
          {[
            { name: "You", resolved: 12, open: 3, color: "#6c63ff" },
            { name: "Maria", resolved: 9, open: 2, color: "#f59e2b" },
            { name: "James", resolved: 11, open: 1, color: "#10b981" },
          ].map(m => (
            <div key={m.name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{m.name[0]}</div>
                  <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{m.name}</span>
                </div>
                <span style={{ fontSize: 11, color: "#4a5568" }}>{m.resolved} resolved · {m.open} open</span>
              </div>
              <div style={{ height: 6, background: "#161b27", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(m.resolved / 15) * 100}%`, background: m.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
