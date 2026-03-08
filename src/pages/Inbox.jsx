import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { generateReply } from "../lib/claude.js";
import { updateTicket, createTicket, rowToTicket } from "../lib/supabase.js";

export default function Inbox({ tickets, setTickets, businessContext, onNavigate }) {
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState(
    tickets.filter(t => t.type !== "ticket")[0] || null
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const [showSummarizer, setShowSummarizer] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  // Inbox only shows emails (not converted tickets)
  const emailTickets = tickets.filter(t => t.type !== "ticket");
  const filtered = emailTickets.filter(t => tab === "all" ? true : t.status === tab);

  function selectTicket(ticket) {
    setSelected(ticket); setDraft(""); setReplySent(false);
    setShowSummarizer(false); setSummary(null); setTicketCreated(false);
  }

  async function handleGenerate() {
    setLoading(true); setDraft("");
    try { setDraft(await generateReply(selected, businessContext)); }
    catch (e) { setDraft(`Error: ${e.message}`); }
    setLoading(false);
  }

  async function handleSendReply() {
    if (!draft.trim() || saving) return;
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    const newReplies = [...(selected.replies || []), reply];
    setSaving(true);
    await updateTicket(selected.id, { replies: newReplies });
    setSaving(false);
    const updated = { ...selected, replies: newReplies };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated); setDraft("");
    setReplySent(true); setTimeout(() => setReplySent(false), 2500);
  }

  async function handleSendAndResolve() {
    if (!draft.trim() || saving) return;
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    const newReplies = [...(selected.replies || []), reply];
    setSaving(true);
    await updateTicket(selected.id, { status: "resolved", replies: newReplies });
    setSaving(false);
    const updated = { ...selected, status: "resolved", replies: newReplies };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated); setDraft("");
    setReplySent(true); setTimeout(() => setReplySent(false), 2500);
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
    const updated = { ...selected, notes };
    setSelected(updated);
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
  }

  async function handleNoteBlur() {
    await updateTicket(selected.id, { notes: selected.notes });
  }

  async function handleSummarize() {
    setShowSummarizer(true); setSummarizing(true);
    setSummary(null); setTicketCreated(false);
    try {
      const res = await fetch("/api/summarize-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data);
    } catch (e) { setSummary({ error: e.message }); }
    setSummarizing(false);
  }

  async function handleCreateTicket() {
    if (!summary || summary.error) return;
    setCreatingTicket(true);
    try {
      const newTicket = {
        customerId:    selected.customerId,
        customerName:  selected.customerName,
        customerEmail: selected.customerEmail,
        subject:       summary.subject,
        body:          summary.summary,
        status:        "open",
        priority:      summary.priority || "medium",
        tag:           summary.tag || "General",
        assignedTo:    selected.assignedTo || 1,
        notes:         `Action needed: ${summary.action}\n\nCreated from conversation #${selected.id}`,
        replies:       [],
        type:          "ticket",
      };
      const rows = await createTicket(newTicket);
      if (rows?.[0]) {
        const created = rowToTicket(rows[0]);
        setTickets(prev => [created, ...prev]);
      }
      setTicketCreated(true);
    } catch (e) { console.error("Create ticket error:", e); }
    setCreatingTicket(false);
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
              style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: tab === t ? 700 : 500, color: tab === t ? "#6366F1" : "#9CA3AF", background: tab === t ? "#F0EFFE" : "transparent", border: "none", borderRadius: 7, cursor: "pointer", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 6px 4px 12px", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{filtered.length} email{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 8px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#9CA3AF", fontSize: 13 }}>No {tab === "all" ? "" : tab} emails</div>
          ) : filtered.map(ticket => {
            const tc = TAG_COLORS[ticket.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
            const isActive = selected?.id === ticket.id;
            return (
              <div key={ticket.id} onClick={() => selectTicket(ticket)}
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

      {/* Main panel */}
      {selected ? (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F5F6FA" }}>

            {/* Header */}
            <div style={{ background: "#fff", padding: "16px 24px", borderBottom: "1px solid #EAECF0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F1117", marginBottom: 7, letterSpacing: "-0.3px" }}>{selected.subject}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>{selected.customerName?.[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selected.customerName}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selected.customerEmail}</span>
                    <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{selected.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {saving && <span style={{ fontSize: 11, color: "#9CA3AF" }}>Saving…</span>}
                  <button onClick={handleSummarize}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: showSummarizer ? "#F0EFFE" : "#F9FAFB", color: showSummarizer ? "#6366F1" : "#6B7280", border: `1.5px solid ${showSummarizer ? "#DDD6FE" : "#E5E7EB"}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    <TicketIcon />Convert to Ticket
                  </button>
                  <span style={{ background: tag.bg, color: tag.text, fontSize: 11, fontWeight: 600, borderRadius: 7, padding: "4px 10px" }}>{selected.tag}</span>
                  <span style={{ background: pri.bg, color: pri.text, fontSize: 11, fontWeight: 600, borderRadius: 7, padding: "4px 10px", textTransform: "capitalize" }}>{selected.priority}</span>
                </div>
              </div>
            </div>

            {/* Summarizer panel */}
            {showSummarizer && (
              <div style={{ background: "#F5F3FF", borderBottom: "1px solid #DDD6FE", padding: "16px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.06em" }}>✦ AI Ticket Summary</span>
                  <button onClick={() => { setShowSummarizer(false); setSummary(null); setTicketCreated(false); }}
                    style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                {summarizing && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6B7280", fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, border: "2px solid #DDD6FE", borderTopColor: "#6366F1", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Analyzing conversation…
                  </div>
                )}
                {summary && !summary.error && !summarizing && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, background: "#fff", borderRadius: 9, padding: "12px 14px", border: "1px solid #E5E7EB" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Subject</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1117" }}>{summary.subject}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ background: "#fff", borderRadius: 9, padding: "12px 14px", border: "1px solid #E5E7EB", textAlign: "center" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Priority</div>
                          <span style={{ background: PRIORITY_COLORS[summary.priority]?.bg, color: PRIORITY_COLORS[summary.priority]?.text, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px", textTransform: "capitalize" }}>{summary.priority}</span>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 9, padding: "12px 14px", border: "1px solid #E5E7EB", textAlign: "center" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Tag</div>
                          <span style={{ background: TAG_COLORS[summary.tag]?.bg || "#F3F4F6", color: TAG_COLORS[summary.tag]?.text || "#6B7280", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px" }}>{summary.tag}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 9, padding: "12px 14px", border: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Summary</div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{summary.summary}</div>
                    </div>
                    <div style={{ background: "#FFFBEB", borderRadius: 9, padding: "12px 14px", border: "1px solid #FDE68A", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Action Needed</div>
                        <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{summary.action}</div>
                      </div>
                    </div>
                    {!ticketCreated ? (
                      <button onClick={handleCreateTicket} disabled={creatingTicket}
                        style={{ alignSelf: "flex-start", background: creatingTicket ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: creatingTicket ? "#9CA3AF" : "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: creatingTicket ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: creatingTicket ? "none" : "0 2px 8px rgba(99,102,241,0.3)" }}>
                        {creatingTicket
                          ? <><span style={{ width: 12, height: 12, border: "2px solid #9CA3AF", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Creating…</>
                          : <><TicketIcon />Create Ticket</>}
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16A34A", fontSize: 13, fontWeight: 700 }}>
                          <span style={{ width: 22, height: 22, background: "#F0FDF4", border: "2px solid #BBF7D0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>
                          Ticket created!
                        </div>
                        <button onClick={() => onNavigate("tickets")}
                          style={{ background: "#6366F1", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          View in Tickets →
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {summary?.error && <div style={{ color: "#EF4444", fontSize: 13 }}>Error: {summary.error}</div>}
              </div>
            )}

            {/* Email body */}
            <div style={{ padding: "18px 24px", background: "#fff", borderBottom: "1px solid #EAECF0", maxHeight: 140, overflowY: "auto" }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#374151", lineHeight: 1.75 }}>{selected.body}</p>
            </div>

            {/* Replies */}
            {selected.replies?.length > 0 && (
              <div style={{ padding: "12px 24px", borderBottom: "1px solid #EAECF0", background: "#FAFAFA", maxHeight: 200, overflowY: "auto" }}>
                {selected.replies.map((r, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "11px 14px", marginBottom: 6, borderLeft: "3px solid #6366F1", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}><span style={{ color: "#6366F1", fontWeight: 700 }}>{r.author}</span> replied</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px", background: "#F5F6FA", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Write Reply</span>
                <button onClick={handleGenerate} disabled={loading}
                  style={{ background: loading ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: loading ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading ? "none" : "0 2px 8px rgba(99,102,241,0.25)" }}>
                  {loading ? <><span style={{ width: 11, height: 11, border: "2px solid #9CA3AF", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Generating…</> : <>✦ Generate AI Reply</>}
                </button>
              </div>

              {replySent && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#16A34A", fontWeight: 600 }}>
                  ✓ Reply saved successfully
                </div>
              )}

              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="Generate an AI reply or type your own response..."
                style={{ flex: 1, minHeight: 120, resize: "none", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, color: "#0F1117", background: "#fff", outline: "none", lineHeight: 1.7, fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                onFocus={e => e.target.style.borderColor = "#6366F1"}
                onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 8 }}>
                <button onClick={() => setDraft("")} disabled={!draft.trim()}
                  style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#6B7280", cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.5 }}>
                  Clear
                </button>
                <button onClick={handleSendReply} disabled={!draft.trim() || saving}
                  style={{ background: draft.trim() ? "#fff" : "#F9FAFB", color: draft.trim() ? "#6366F1" : "#9CA3AF", border: `1.5px solid ${draft.trim() ? "#DDD6FE" : "#E5E7EB"}`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>
                  {saving ? "Saving…" : "Send Reply"}
                </button>
                <button onClick={handleSendAndResolve} disabled={!draft.trim() || saving}
                  style={{ background: draft.trim() ? "#0F1117" : "#E5E7EB", color: draft.trim() ? "#fff" : "#9CA3AF", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>
                  {saving ? "Saving…" : "Send & Resolve →"}
                </button>
              </div>
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
                placeholder="Private note — saved when you click away..."
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
            <MetaSection label="Status">
              <div style={{ display: "flex", gap: 6 }}>
                {["open", "resolved"].map(s => (
                  <button key={s} onClick={async () => {
                    await updateTicket(selected.id, { status: s });
                    const updated = { ...selected, status: s };
                    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
                    setSelected(updated);
                  }}
                    style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700, borderRadius: 7, border: "none", background: selected.status === s ? (s === "resolved" ? "#F0FDF4" : "#FEF2F2") : "#F9FAFB", color: selected.status === s ? (s === "resolved" ? "#16A34A" : "#EF4444") : "#9CA3AF", cursor: "pointer", textTransform: "capitalize" }}>{s}</button>
                ))}
              </div>
            </MetaSection>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9CA3AF" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style={{ fontSize: 13 }}>Select an email to get started</span>
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

function TicketIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>;
}
