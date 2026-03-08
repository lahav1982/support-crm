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
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "inherit" }}>
      {/* List */}
      <div style={{ width: 340, borderRight: "1px solid #1e2433", display: "flex", flexDirection: "column", background: "#0d1117" }}>
        <div style={{ padding: "16px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search customers..."
            style={{ width: "100%", background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", padding: "9px 12px", fontSize: 12, outline: "none", fontFamily: "inherit" }}
            onFocus={e => e.target.style.borderColor = "#6c63ff"}
            onBlur={e => e.target.style.borderColor = "#1e2433"}
          />
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map(c => {
            const isActive = selected?.id === c.id;
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ padding: "14px 16px", borderBottom: "1px solid #1a1f2e", cursor: "pointer", background: isActive ? "#161b27" : "transparent", borderLeft: isActive ? "3px solid #6c63ff" : "3px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#4a5568" }}>{c.company}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, paddingLeft: 44 }}>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>📧 {c.totalTickets} tickets</span>
                  {c.openTickets > 0 && <span style={{ fontSize: 10, color: "#e05555", fontWeight: 700 }}>● {c.openTickets} open</span>}
                  <span style={{ fontSize: 10, color: "#4a5568" }}>· {c.lastSeen}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div style={{ flex: 1, overflowY: "auto", background: "#0a0e17", padding: 28 }}>
          {/* Profile header */}
          <div style={{ background: "#0d1117", borderRadius: 12, padding: 24, marginBottom: 20, border: "1px solid #1e2433", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 24 }}>{selected.name[0]}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>{selected.name}</h2>
              <div style={{ fontSize: 13, color: "#4a5568", marginBottom: 4 }}>{selected.email}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>🏢 {selected.company}</div>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
              <div style={{ background: "#161b27", borderRadius: 8, padding: "10px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#6c63ff" }}>{selected.totalTickets}</div>
                <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase" }}>Total</div>
              </div>
              <div style={{ background: "#161b27", borderRadius: 8, padding: "10px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: selected.openTickets > 0 ? "#e05555" : "#4caf7d" }}>{selected.openTickets}</div>
                <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase" }}>Open</div>
              </div>
              <div style={{ background: "#161b27", borderRadius: 8, padding: "10px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>{selected.totalTickets - selected.openTickets}</div>
                <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase" }}>Resolved</div>
              </div>
            </div>
          </div>

          {/* Ticket history */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Ticket History</div>
          {customerTickets.length === 0 ? (
            <div style={{ color: "#2d3748", textAlign: "center", padding: 40 }}>No tickets found</div>
          ) : (
            customerTickets.map(t => {
              const tc = TAG_COLORS[t.tag] || { bg: "#1e2433", text: "#94a3b8", dot: "#64748b" };
              return (
                <div key={t.id} style={{ background: "#0d1117", border: "1px solid #1e2433", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{t.subject}</span>
                    <span style={{ fontSize: 10, color: "#4a5568" }}>{t.date}</span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#4a5568", lineHeight: 1.5 }}>{t.body.slice(0, 120)}...</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ background: tc.bg + "22", color: tc.dot, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px", border: `1px solid ${tc.dot}33` }}>{t.tag}</span>
                    <span style={{ background: t.status === "resolved" ? "#0d2a1a" : "#2a1a1a", color: t.status === "resolved" ? "#4caf7d" : "#e05555", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>{t.status}</span>
                    {t.replies.length > 0 && <span style={{ fontSize: 10, color: "#4a5568" }}>💬 {t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#2d3748", fontSize: 14 }}>
          Select a customer to view their profile
        </div>
      )}
    </div>
  );
}
