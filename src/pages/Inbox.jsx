import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { generateReply } from "../lib/claude.js";
import { updateTicket } from "../lib/supabase.js";

export default function Inbox({ tickets, setTickets, businessContext }) {
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState(tickets[0] || null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = tickets.filter(t => tab === "all" ? true : t.status === tab);

  async function handleGenerate() {
    setLoading(true); setDraft(""); setSent(false);
    try { setDraft(await generateReply(selected, businessContext)); }
    catch { setDraft("Error connecting to AI. Please try again."); }
    setLoading(false);
  }

  async function handleSend() {
    if (!draft.trim()) return;
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    const newReplies = [...(selected.replies || []), reply];

    setSaving(true);
    await updateTicket(selected.id, { status: "resolved", replies: newReplies });
    setSaving(false);

    const updated = { ...selected, status: "resolved", replies: newReplies };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
    setSent(true);
    setDraft("");
  }

  async function handleAssign(val) {
    const assignedTo = Number(val);
    await updateTicket(selected.id, { assignedTo });
    const updated = { ...selected, assignedTo };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  }

  async function handlePriority(priority) {
    await updateTicket(selected.id, { priority });
    const updated = { ...selected, priority };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  }

  async function handleNote(notes) {
    // Update local state immediately for responsiveness
    const updated = { ...selected, notes };
    setSelected(updated);
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
  }

  async function handleNoteBlur() {
    // Save to Supabase when user stops typing
    await updateTicket(selected.id, { notes: selected.notes });
  }

  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" } : null;
  const pri = selected ? PRIORITY_COLORS[selected.priority] || {} : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Ticket list */}
      <div style={{ width: 290, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", padding: "12px 12px 0", gap: 4 }}>
          {["open", "resolved", "all"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: tab === t ? 700 : 500, color: tab === t ? "#6366F1" : "#9CA3AF", background: tab === t ? "#F0EFFE" : "transparent", border: "none", borderRadius: 7, cursor: "pointer", textTransform: "capitalize", transition: "all 0.1s" }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: "8px 6px 4px 12px", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 8px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#9CA3AF", fontSize: 13 }}>
              No {tab === "all" ? "" : tab} tickets
            </div>
          ) : filtered.map(ticket => {
            const tc = TAG_COLORS[ticket.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
            const isActive = selected?.id === ticket.id;
            return (
              <div key={ticket.id} onClick={() => { setSelected(ticket); setDraft(""); setSent(false); }}
                style={{ padding: "12px", borderRadius: 10, cursor: "pointer", background: isActive ? "#F5F3FF" : "transparent", border: isActive ? "1.5px solid #DDD6FE" : "1.5px solid transparent", marginBottom: 3, transition: "all 0.1s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
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
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>{selected.customerName?.[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selected.customerName}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selected.customerEmail}</span>
                    <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{selected.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {saving && <span style={{ fontSize: 11, color: "#9CA3AF" }}>Saving…</span>}
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
            {selected.replies?.length > 0 && (
              <div style={{ padding: "14px 24px", borderBottom: "1px solid #EAECF0", background: "#FAFAFA" }}>
                {selected.replies.map((r, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", marginBottom: 6, borderLeft: "3px solid #6366F1", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
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
                  style={{ background: loading ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: loading ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: loading ? "none" : "0 2px 8px rgba(99,102,241,0.3)" }}>
                  {loading
                    ? <><span style={{ width: 12, height: 12, border: "2px solid #9CA3AF", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Generating…</>
                    : <>✦ Generate AI Reply</>}
                </button>
              </div>
              {sent ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
                  <span style={{ color: "#16A34A", fontWeight: 700, fontSize: 14 }}>Reply saved & ticket resolved</span>
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>Saved to Supabase — visible to your whole team.</span>
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
                    <button onClick={handleSend} disabled={!draft.trim() || saving}
                      style={{ background: draft.trim() ? "#0F1117" : "#E5E7EB", color: draft.trim() ? "#fff" : "#9CA3AF", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>
                      {saving ? "Saving…" : "Send & Resolve →"}
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
                    style={{ flex: 1, padding: "6px 0", fontSize: 10, fontWeight: 700, borderRadius: 7, border: selected.priority === p ? "none" : "1.5px solid #E5E7EB", background: selected.priority === p ? PRIORITY_COLORS[p].bg : "#fff", color: selected.priority === p ? PRIORITY_COLORS[p].text : "#9CA3AF", cursor: "pointer", textTransform: "capitalize" }}>{p}</button>
                ))}
              </div>
            </MetaSection>

            <MetaSection label="Internal Notes">
              <textarea value={selected.notes || ""} onChange={e => handleNote(e.target.value)} onBlur={handleNoteBlur}
                placeholder="Private note — saved automatically when you click away..."
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9CA3AF" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style={{ fontSize: 13 }}>Select a ticket to get started</span>
        </div>
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
