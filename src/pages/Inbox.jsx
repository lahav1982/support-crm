import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { generateReply } from "../lib/claude.js";

const S = {
  root: { display: "flex", height: "100%", overflow: "hidden", fontFamily: "inherit" },
  sidebar: { width: 300, borderRight: "1px solid #1e2433", display: "flex", flexDirection: "column", overflow: "hidden", background: "#0d1117" },
  tabs: { display: "flex", borderBottom: "1px solid #1e2433", padding: "0 12px" },
  tab: (active) => ({ flex: 1, padding: "12px 0", fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#e2e8f0" : "#4a5568", background: "none", border: "none", borderBottom: active ? "2px solid #6c63ff" : "2px solid transparent", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: -1 }),
  list: { overflowY: "auto", flex: 1 },
  item: (active) => ({ padding: "14px 16px", borderBottom: "1px solid #1a1f2e", cursor: "pointer", background: active ? "#161b27" : "transparent", borderLeft: active ? "3px solid #6c63ff" : "3px solid transparent", transition: "all 0.12s" }),
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0a0e17" },
  emailHeader: { background: "#0d1117", padding: "20px 28px", borderBottom: "1px solid #1e2433" },
  emailBody: { padding: "24px 28px", background: "#080c13", borderBottom: "1px solid #1e2433", maxHeight: 160, overflowY: "auto" },
  replyArea: { flex: 1, display: "flex", flexDirection: "column", padding: "20px 28px", overflow: "auto" },
  meta: { width: 260, borderLeft: "1px solid #1e2433", background: "#0d1117", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 },
};

export default function Inbox({ tickets, setTickets, businessContext }) {
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState(tickets[0]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const filtered = tickets.filter(t => tab === "all" ? true : t.status === tab);

  async function handleGenerate() {
    setLoading(true); setDraft(""); setSent(false);
    try { setDraft(await generateReply(selected, businessContext)); }
    catch { setDraft("Error connecting to AI. Please try again."); }
    setLoading(false);
  }

  function handleSend() {
    if (!draft.trim()) return;
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: "resolved", replies: [...t.replies, reply] } : t));
    setSelected(prev => ({ ...prev, status: "resolved", replies: [...prev.replies, reply] }));
    setSent(true); setDraft("");
  }

  function handleAssign(assignTo) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, assignedTo: Number(assignTo) } : t));
    setSelected(prev => ({ ...prev, assignedTo: Number(assignTo) }));
  }

  function handlePriority(priority) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, priority } : t));
    setSelected(prev => ({ ...prev, priority }));
  }

  function handleNote(note) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, notes: note } : t));
    setSelected(prev => ({ ...prev, notes: note }));
  }

  function selectTicket(ticket) {
    setSelected(ticket); setDraft(""); setSent(false);
  }

  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#1e2433", text: "#94a3b8", dot: "#64748b" } : null;
  const pri = selected ? PRIORITY_COLORS[selected.priority] || {} : null;
  const assignee = TEAM.find(m => m.id === selected?.assignedTo);

  return (
    <div style={S.root}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.tabs}>
          {["open", "resolved", "all"].map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div style={S.list}>
          {filtered.map(ticket => {
            const tc = TAG_COLORS[ticket.tag] || { bg: "#1e2433", text: "#94a3b8", dot: "#64748b" };
            const isActive = selected?.id === ticket.id;
            return (
              <div key={ticket.id} style={S.item(isActive)} onClick={() => selectTicket(ticket)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#e2e8f0" }}>{ticket.customerName}</span>
                  <span style={{ fontSize: 10, color: "#4a5568" }}>{ticket.time}</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.subject}</div>
                <div style={{ fontSize: 10, color: "#4a5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 8 }}>{ticket.body.slice(0, 55)}...</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ background: tc.bg + "22", color: tc.dot, fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px", border: `1px solid ${tc.dot}44` }}>{ticket.tag}</span>
                  <span style={{ background: PRIORITY_COLORS[ticket.priority]?.bg + "22", color: PRIORITY_COLORS[ticket.priority]?.text, fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px" }}>{ticket.priority}</span>
                  {ticket.status === "resolved" && <span style={{ background: "#0d2a1a", color: "#4caf7d", fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px" }}>✓ done</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main */}
      {selected ? (
        <>
          <div style={S.main}>
            {/* Header */}
            <div style={S.emailHeader}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{selected.subject}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{selected.customerName[0]}</div>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{selected.customerName} <span style={{ color: "#4a5568" }}>&lt;{selected.customerEmail}&gt;</span></span>
                    <span style={{ fontSize: 11, color: "#2d3748" }}>· {selected.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: tag.bg + "22", color: tag.dot, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px", border: `1px solid ${tag.dot}44` }}>{selected.tag}</span>
                  <span style={{ background: pri.bg + "22", color: pri.text, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px" }}>{selected.priority}</span>
                </div>
              </div>
            </div>

            {/* Email body */}
            <div style={S.emailBody}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#94a3b8", lineHeight: 1.7 }}>{selected.body}</p>
            </div>

            {/* Previous replies */}
            {selected.replies.length > 0 && (
              <div style={{ padding: "16px 28px", borderBottom: "1px solid #1e2433", background: "#080c13" }}>
                {selected.replies.map(r => (
                  <div key={r.id} style={{ background: "#0d1117", borderRadius: 8, padding: "12px 16px", marginBottom: 8, borderLeft: "3px solid #6c63ff" }}>
                    <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 6 }}><span style={{ color: "#6c63ff", fontWeight: 700 }}>{r.author}</span> replied</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply area */}
            <div style={S.replyArea}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reply</span>
                <button onClick={handleGenerate} disabled={loading} style={{ background: loading ? "#1e2433" : "linear-gradient(135deg,#6c63ff,#48c6ef)", color: loading ? "#4a5568" : "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                  {loading ? <><span style={{ width: 12, height: 12, border: "2px solid #4a5568", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Generating...</> : "✦ AI Reply"}
                </button>
              </div>
              {sent ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#0d2a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
                  <span style={{ color: "#4caf7d", fontWeight: 700 }}>Reply sent & ticket resolved</span>
                </div>
              ) : (
                <>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)}
                    placeholder="Generate an AI reply or type your own..."
                    style={{ flex: 1, minHeight: 140, resize: "none", border: "1px solid #1e2433", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#e2e8f0", background: "#0d1117", outline: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                    onFocus={e => e.target.style.borderColor = "#6c63ff"}
                    onBlur={e => e.target.style.borderColor = "#1e2433"}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 8 }}>
                    <button onClick={() => setDraft("")} style={{ background: "none", border: "1px solid #1e2433", borderRadius: 8, padding: "8px 16px", fontSize: 12, color: "#4a5568", cursor: "pointer" }}>Clear</button>
                    <button onClick={handleSend} disabled={!draft.trim()} style={{ background: draft.trim() ? "#6c63ff" : "#1e2433", color: draft.trim() ? "#fff" : "#4a5568", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>Send & Resolve ↑</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta sidebar */}
          <div style={S.meta}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Assigned To</div>
              <select value={selected.assignedTo} onChange={e => handleAssign(e.target.value)}
                style={{ width: "100%", background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", padding: "8px 10px", fontSize: 12, outline: "none", cursor: "pointer" }}>
                {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Priority</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["high", "medium", "low"].map(p => (
                  <button key={p} onClick={() => handlePriority(p)} style={{ flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700, borderRadius: 6, border: selected.priority === p ? "none" : "1px solid #1e2433", background: selected.priority === p ? PRIORITY_COLORS[p].bg + "44" : "transparent", color: selected.priority === p ? PRIORITY_COLORS[p].text : "#4a5568", cursor: "pointer", textTransform: "capitalize" }}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Internal Notes</div>
              <textarea value={selected.notes} onChange={e => handleNote(e.target.value)}
                placeholder="Add a private note..."
                style={{ width: "100%", minHeight: 90, resize: "none", background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#94a3b8", padding: "10px", fontSize: 12, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = "#6c63ff"}
                onBlur={e => e.target.style.borderColor = "#1e2433"}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Customer</div>
              <div style={{ background: "#161b27", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>{selected.customerName}</div>
                <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 8 }}>{selected.customerEmail}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Tag: <span style={{ color: tag.dot }}>{selected.tag}</span></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#2d3748" }}>Select a ticket</div>
      )}
    </div>
  );
}
