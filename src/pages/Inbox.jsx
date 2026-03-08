import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { generateReply } from "../lib/claude.js";

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

  function handleAssign(val) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, assignedTo: Number(val) } : t));
    setSelected(prev => ({ ...prev, assignedTo: Number(val) }));
  }

  function handlePriority(priority) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, priority } : t));
    setSelected(prev => ({ ...prev, priority }));
  }

  function handleNote(note) {
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, notes: note } : t));
    setSelected(prev => ({ ...prev, notes: note }));
  }

  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" } : null;
  const pri = selected ? PRIORITY_COLORS[selected.priority] || {} : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Ticket list */}
      <div style={{ width: 290, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column" }}>
        {/* Tabs */}
        <div style={{ display: "flex", padding: "12px 12px 0", gap: 4 }}>
          {["open", "resolved", "all"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: tab === t ? 700 : 500, color: tab === t ? "#6366F1" : "#9CA3AF", background: tab === t ? "#F0EFFE" : "transparent", border: "none", borderRadius: 7, cursor: "pointer", textTransform: "capitalize", transition: "all 0.1s" }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
          {filtered.map(ticket => {
            const tc = TAG_COLORS[ticket.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
            const isActive = selected?.id === ticket.id;
            return (
              <div key={ticket.id} onClick={() => { setSelected(ticket); setDraft(""); setSent(false); }}
                style={{ padding: "12px 12px", borderRadius: 10, cursor: "pointer", background: isActive ? "#F5F3FF" : "transparent", border: isActive ? "1.5px solid #DDD6FE" : "1.5px solid transparent", marginBottom: 3, transition: "all 0.1s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: "#0F1117" }}>{ticket.customerName}</span>
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>{ticket.time}</span>
                </div>
                <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.subject}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 8 }}>{ticket.body.slice(0, 52)}…</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />{ticket.tag}
                  </span>
                  <span style={{ background: PRIORITY_COLORS[ticket.priority]?.bg, color: PRIORITY_COLORS[ticket.priority]?.text, fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px" }}>{ticket.priority}</span>
                  {ticket.status === "resolved" && <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px" }}>✓ resolved</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main email view */}
      {selected ? (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F5F6FA" }}>
            {/* Email header */}
            <div style={{ background: "#fff", padding: "18px 24px", borderBottom: "1px solid #EAECF0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F1117", marginBottom: 8, letterSpacing: "-0.3px" }}>{selected.subject}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>{selected.customerName[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selected.customerName}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selected.customerEmail}</span>
                    <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{selected.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ background: tag.bg, color: tag.text, fontSize: 11, fontWeight: 600, borderRadius: 7, padding: "4px 10px" }}>{selected.tag}</span>
                  <span style={{ background: pri.bg, color: pri.text, fontSize: 11, fontWeight: 600, borderRadius: 7, padding: "4px 10px", textTransform: "capitalize" }}>{selected.priority}</span>
                </div>
              </div>
            </div>

            {/* Email body */}
            <div style={{ padding: "20px 24px", background: "#fff", borderBottom: "1px solid #EAECF0", maxHeight: 150, overflowY: "auto" }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#374151", lineHeight: 1.75 }}>{selected.body}</p>
            </div>

            {/* Previous replies */}
            {selected.replies.length > 0 && (
              <div style={{ padding: "14px 24px", borderBottom: "1px solid #EAECF0", background: "#FAFAFA" }}>
                {selected.replies.map(r => (
                  <div key={r.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", marginBottom: 6, borderLeft: "3px solid #6366F1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 5 }}><span style={{ color: "#6366F1", fontWeight: 700 }}>{r.author}</span> replied</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 24px", background: "#F5F6FA", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Write Reply</span>
                <button onClick={handleGenerate} disabled={loading}
                  style={{ background: loading ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: loading ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 2px 8px rgba(99,102,241,0.3)", transition: "all 0.15s" }}>
                  {loading
                    ? <><span style={{ width: 12, height: 12, border: "2px solid #9CA3AF", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Generating…</>
                    : <><SparkleIcon />Generate AI Reply</>}
                </button>
              </div>
              {sent ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
                  <span style={{ color: "#16A34A", fontWeight: 700, fontSize: 14 }}>Reply sent & ticket resolved</span>
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>The customer has been notified.</span>
                </div>
              ) : (
                <>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)}
                    placeholder="Click 'Generate AI Reply' or type your response..."
                    style={{ flex: 1, minHeight: 140, resize: "none", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: "#0F1117", background: "#fff", outline: "none", lineHeight: 1.7, fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    onFocus={e => e.target.style.borderColor = "#6366F1"}
                    onBlur={e => e.target.style.borderColor = "#E5E7EB"}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 8 }}>
                    <button onClick={() => setDraft("")} style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Clear</button>
                    <button onClick={handleSend} disabled={!draft.trim()}
                      style={{ background: draft.trim() ? "#0F1117" : "#E5E7EB", color: draft.trim() ? "#fff" : "#9CA3AF", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
                      Send & Resolve →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta panel */}
          <div style={{ width: 240, background: "#fff", borderLeft: "1px solid #EAECF0", padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 22 }}>
            <MetaSection label="Assigned To">
              <select value={selected.assignedTo} onChange={e => handleAssign(e.target.value)}
                style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#0F1117", padding: "8px 10px", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </MetaSection>

            <MetaSection label="Priority">
              <div style={{ display: "flex", gap: 5 }}>
                {["high", "medium", "low"].map(p => (
                  <button key={p} onClick={() => handlePriority(p)}
                    style={{ flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700, borderRadius: 7, border: selected.priority === p ? "none" : "1.5px solid #E5E7EB", background: selected.priority === p ? PRIORITY_COLORS[p].bg : "#fff", color: selected.priority === p ? PRIORITY_COLORS[p].text : "#9CA3AF", cursor: "pointer", textTransform: "capitalize", transition: "all 0.1s" }}>{p}</button>
                ))}
              </div>
            </MetaSection>

            <MetaSection label="Internal Notes">
              <textarea value={selected.notes} onChange={e => handleNote(e.target.value)}
                placeholder="Private note (not sent to customer)..."
                style={{ width: "100%", minHeight: 88, resize: "none", background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, color: "#374151", padding: "10px", fontSize: 12, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </MetaSection>

            <MetaSection label="Customer">
              <div style={{ background: "#F9FAFB", borderRadius: 9, padding: 12, border: "1px solid #EAECF0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1117", marginBottom: 2 }}>{selected.customerName}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>{selected.customerEmail}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Category: <span style={{ color: tag.text, fontWeight: 600 }}>{selected.tag}</span></div>
              </div>
            </MetaSection>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#D1D5DB", fontSize: 14 }}>Select a ticket to get started</div>
      )}
    </div>
  );
}

function MetaSection({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function SparkleIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
