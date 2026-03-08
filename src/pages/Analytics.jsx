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
  { name: "Shipping", value: 28, color: "#6366F1" },
  { name: "Refund", value: 22, color: "#EF4444" },
  { name: "Account", value: 18, color: "#8B5CF6" },
  { name: "Sales", value: 16, color: "#10B981" },
  { name: "Exchange", value: 10, color: "#F59E0B" },
  { name: "Technical", value: 6, color: "#3B82F6" },
];

const TEAM_DATA = [
  { name: "You",   resolved: 12, open: 3, color: "#6366F1", max: 15 },
  { name: "Maria", resolved: 9,  open: 2, color: "#F59E0B", max: 15 },
  { name: "James", resolved: 11, open: 1, color: "#10B981", max: 15 },
];

const tooltipStyle = { background: "#fff", border: "1px solid #EAECF0", borderRadius: 8, color: "#0F1117", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" };

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 14, padding: "20px 22px", flex: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: color, letterSpacing: "-0.8px", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{sub}</div>
    </div>
  );
}

function ChartCard({ title, sub, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 14, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1117", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 18 }}>{sub}</div>
      {children}
    </div>
  );
}

export default function Analytics({ tickets }) {
  const open = tickets.filter(t => t.status === "open").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;
  const resolutionRate = Math.round((resolved / tickets.length) * 100);

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: 28, background: "#F5F6FA", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>Analytics Overview</h2>
        <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>Last 7 days · Updates in real time</p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Tickets" value={tickets.length} sub="All time" color="#6366F1" />
        <StatCard label="Open" value={open} sub="Need attention" color="#EF4444" />
        <StatCard label="Resolved" value={resolved} sub="This week" color="#16A34A" />
        <StatCard label="Resolution Rate" value={`${resolutionRate}%`} sub="↑ 4% vs last week" color="#6366F1" />
        <StatCard label="Avg Response" value="2.1h" sub="↓ 18min vs last week" color="#F59E0B" />
      </div>

      {/* Row 1 */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <ChartCard title="Ticket Volume" sub="Opened vs resolved per day">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={VOLUME_DATA} barGap={3}>
                <XAxis dataKey="day" tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "Plus Jakarta Sans" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "Plus Jakarta Sans" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F5F3FF" }} />
                <Bar dataKey="open" name="Opened" fill="#EF4444" radius={[5,5,0,0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "#EF4444", borderRadius: 2, display: "inline-block" }} />Opened</span>
              <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, background: "#10B981", borderRadius: 2, display: "inline-block" }} />Resolved</span>
            </div>
          </ChartCard>
        </div>
        <div style={{ flex: 1 }}>
          <ChartCard title="Avg Response Time" sub="Hours to first reply">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={RESPONSE_DATA}>
                <XAxis dataKey="day" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="hours" name="Hours" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: "#6366F1", r: 3, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <ChartCard title="Tickets by Category" sub="Distribution across tags">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={TAG_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {TAG_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {TAG_DATA.map(t => (
                  <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: "inline-block" }} />
                      <span style={{ fontSize: 12, color: "#374151" }}>{t.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0F1117" }}>{t.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        <div style={{ flex: 1 }}>
          <ChartCard title="Team Performance" sub="Tickets resolved this week">
            {TEAM_DATA.map(m => (
              <div key={m.name} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{m.name[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1117" }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{m.resolved} resolved · <span style={{ color: "#EF4444" }}>{m.open} open</span></span>
                </div>
                <div style={{ height: 7, background: "#F3F4F6", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(m.resolved / m.max) * 100}%`, background: `linear-gradient(90deg, ${m.color}, ${m.color}bb)`, borderRadius: 10, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
