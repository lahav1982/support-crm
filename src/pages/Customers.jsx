import { useState } from "react";
import { CUSTOMERS, TAG_COLORS } from "../lib/data.js";

export default function Customers({ tickets }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const customerTickets = selected ? tickets.filter(t => t.customerId === selected.id) : [];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* List */}
      <div style={{ width: 300, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 14px 8px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
              <SearchIcon />
            </span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
              style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#0F1117", padding: "9px 12px 9px 34px", fontSize: 15, outline: "none", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = "#6366F1"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
            />
          </div>
        </div>
        <div style={{ padding: "0 14px 6px" }}>
          <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 600 }}>{filtered.length} customers</span>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 8px 8px" }}>
          {filtered.map(c => {
            const isActive = selected?.id === c.id;
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ padding: "11px 12px", borderRadius: 10, cursor: "pointer", background: isActive ? "#F5F3FF" : "transparent", border: isActive ? "1.5px solid #DDD6FE" : "1.5px solid transparent", marginBottom: 2, transition: "all 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${avatarColor(c.name)})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{c.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1117", marginBottom: 1 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {c.openTickets > 0
                      ? <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 6px" }}>{c.openTickets} open</span>
                      : <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 6px" }}>✓ clear</span>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div style={{ flex: 1, overflowY: "auto", background: "#F5F6FA", padding: 28 }}>
          {/* Profile card */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, marginBottom: 20, border: "1px solid #EAECF0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${avatarColor(selected.name)})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 26, flexShrink: 0 }}>{selected.name[0]}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 3px", fontSize: 20, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.3px" }}>{selected.name}</h2>
              <div style={{ fontSize: 15, color: "#6B7280", marginBottom: 2 }}>{selected.email}</div>
              <div style={{ fontSize: 14, color: "#9CA3AF" }}>🏢 {selected.company}</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "Total", value: selected.totalTickets, color: "#6366F1", bg: "#F0EFFE" },
                { label: "Open", value: selected.openTickets, color: selected.openTickets > 0 ? "#EF4444" : "#16A34A", bg: selected.openTickets > 0 ? "#FEF2F2" : "#F0FDF4" },
                { label: "Resolved", value: selected.totalTickets - selected.openTickets, color: "#6B7280", bg: "#F9FAFB" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 64 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Ticket History</div>
          {customerTickets.length === 0 ? (
            <div style={{ color: "#D1D5DB", textAlign: "center", padding: 48, fontSize: 16 }}>No tickets found</div>
          ) : (
            customerTickets.map(t => {
              const tc = TAG_COLORS[t.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
              return (
                <div key={t.id} style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "14px 16px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F1117" }}>{t.subject}</span>
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>{t.date}</span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 14, color: "#6B7280", lineHeight: 1.55 }}>{t.body.slice(0, 120)}…</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ background: tc.bg, color: tc.text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 8px", display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />{t.tag}
                    </span>
                    <span style={{ background: t.status === "resolved" ? "#F0FDF4" : "#FEF2F2", color: t.status === "resolved" ? "#16A34A" : "#EF4444", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 8px" }}>{t.status}</span>
                    {t.replies.length > 0 && <span style={{ fontSize: 12, color: "#9CA3AF", padding: "2px 0" }}>💬 {t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#D1D5DB", fontSize: 16 }}>
          Select a customer to view their profile
        </div>
      )}
    </div>
  );
}

function avatarColor(name) {
  const colors = [
    "#6366F1, #8B5CF6", "#F59E0B, #EF4444", "#10B981, #06B6D4",
    "#EC4899, #8B5CF6", "#F97316, #EAB308", "#14B8A6, #6366F1",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
