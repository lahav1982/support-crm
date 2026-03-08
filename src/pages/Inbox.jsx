import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { generateReply } from "../lib/claude.js";
import { updateTicket, createTicket, rowToTicket, deleteTickets } from "../lib/supabase.js";

async function gmailSend({ to, subject, body, threadId, messageId }) {
  const res = await fetch("/api/gmail-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, body, threadId, messageId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gmail send failed");
  return data;
}

async function gmailSync() {
  const res = await fetch("/api/gmail-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Sync failed");
  return data;
}

export default function Inbox({ tickets, setTickets, businessContext, onNavigate, gmailStatus, onRefresh }) {
  const [tab, setTab] = useState("open");
  const [selected, setSelected] = useState(
    () => tickets.filter(t => t.type !== "ticket")[0] || null
  );
  const [draft, setDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replySent, setReplySent] = useState(false);

  const [selected_ids, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected_ids.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  }

  async function handleDelete() {
    if (selected_ids.size === 0) return;
    setDeleting(true);
    try {
      await deleteTickets([...selected_ids]);
      setTickets(prev => prev.filter(t => !selected_ids.has(t.id)));
      if (selected && selected_ids.has(selected.id)) setSelected(null);
      setSelectedIds(new Set());
    } catch(e) { console.error("Delete failed", e); }
    setDeleting(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/gmail-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok) {
        setSyncResult({ ok: false, error: result.error || "Sync failed" });
      } else {
        setSyncResult({ ok: true, count: result.imported, rejected: result.rejected || 0, skipped: result.skipped || 0 });
        if (result.imported > 0 && onRefresh) await onRefresh();
      }
    } catch(e) {
      setSyncResult({ ok: false, error: e.message });
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 6000);
  }

  // Convert-to-ticket state
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState(null);

  // Only show emails in inbox (not tickets)
  const emails = tickets.filter(t => t.type !== "ticket");
  const filtered = emails.filter(t =>
    tab === "all" ? true : t.status === tab
  );

  function selectEmail(t) {
    setSelected(t);
    setDraft("");
    setReplySent(false);
    setConvertError(null);
  }

  // ── AI reply ──────────────────────────────────────
  async function handleGenerate() {
    setAiLoading(true);
    setDraft("");
    try {
      setDraft(await generateReply(selected, businessContext));
    } catch (e) {
      setDraft("Error generating reply. Please try again.");
    }
    setAiLoading(false);
  }

  // ── Send reply (keep open) ────────────────────────
  async function handleSendReply() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    // Send via Gmail if connected and this email came from Gmail
    if (gmailStatus?.connected && selected.gmailThreadId) {
      try {
        await gmailSend({
          to:        selected.customerEmail,
          subject:   selected.subject,
          body:      draft,
          threadId:  selected.gmailThreadId,
          messageId: selected.gmailMessageId,
        });
      } catch(e) {
        console.warn("Gmail send failed, saving locally only:", e.message);
      }
    }
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    const newReplies = [...(selected.replies || []), reply];
    await updateTicket(selected.id, { replies: newReplies });
    setSaving(false);
    const updated = { ...selected, replies: newReplies };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
    setDraft("");
    setReplySent(true);
    setTimeout(() => setReplySent(false), 2500);
  }

  // ── Send reply + resolve ──────────────────────────
  async function handleSendAndResolve() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    if (gmailStatus?.connected && selected.gmailThreadId) {
      try {
        await gmailSend({
          to:        selected.customerEmail,
          subject:   selected.subject,
          body:      draft,
          threadId:  selected.gmailThreadId,
          messageId: selected.gmailMessageId,
        });
      } catch(e) {
        console.warn("Gmail send failed, saving locally only:", e.message);
      }
    }
    const reply = { id: Date.now(), author: "You", body: draft, timestamp: Date.now() };
    const newReplies = [...(selected.replies || []), reply];
    await updateTicket(selected.id, { status: "resolved", replies: newReplies });
    setSaving(false);
    const updated = { ...selected, status: "resolved", replies: newReplies };
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
    setDraft("");
    setReplySent(true);
    setTimeout(() => setReplySent(false), 2500);
  }

  // ── Priority / assign / notes ────────────────────
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

  function handleNoteChange(notes) {
    const updated = { ...selected, notes };
    setSelected(updated);
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
  }

  async function handleNoteBlur() {
    await updateTicket(selected.id, { notes: selected.notes });
  }

  // ── CONVERT TO TICKET (single click, full auto) ──
  async function handleConvert() {
    if (converting) return;

    // Already has a ticket — just navigate
    if (selected.linkedTicketId) {
      onNavigate("tickets");
      return;
    }

    setConverting(true);
    setConvertError(null);

    try {
      // 1. Ask AI to summarise the conversation
      const aiRes = await fetch("/api/summarize-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: selected }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || "AI failed");

      // 2. Create the ticket row in Supabase
      const rows = await createTicket({
        customerId:    selected.customerId,
        customerName:  selected.customerName,
        customerEmail: selected.customerEmail,
        subject:       aiData.subject  || selected.subject,
        body:          aiData.summary  || selected.body,
        status:        "open",
        priority:      aiData.priority || selected.priority || "medium",
        tag:           aiData.tag      || selected.tag      || "General",
        assignedTo:    selected.assignedTo || 1,
        notes:         aiData.action ? `Action needed: ${aiData.action}` : "",
        replies:       [],
        type:          "ticket",
      });

      if (!rows || rows.length === 0) throw new Error("Ticket was not saved — check Supabase");
      const newTicket = rowToTicket(rows[0]);

      // 3. Add new ticket to global state
      setTickets(prev => [newTicket, ...prev]);

      // 4. Flag THIS email with the linked ticket id (stored in notes field)
      const flagNote = `__linked_ticket:${newTicket.id}__`;
      const updatedNotes = (selected.notes || "").replace(/__linked_ticket:\d+__/g, "").trim()
        + (selected.notes?.trim() ? "\n" : "") + flagNote;
      await updateTicket(selected.id, { notes: updatedNotes });

      // 5. Update local selected so the badge appears immediately
      const flagged = { ...selected, notes: updatedNotes, linkedTicketId: newTicket.id };
      setSelected(flagged);
      setTickets(prev => prev.map(t => t.id === selected.id ? flagged : t));

    } catch (e) {
      console.error("Convert error:", e);
      setConvertError(e.message);
    }

    setConverting(false);
  }

  // Derive linkedTicketId from notes field (survives page refresh)
  function getLinkedTicketId(ticket) {
    if (!ticket) return null;
    if (ticket.linkedTicketId) return ticket.linkedTicketId;
    const m = (ticket.notes || "").match(/__linked_ticket:(\d+)__/);
    return m ? Number(m[1]) : null;
  }

  const linkedTicketId = getLinkedTicketId(selected);
  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" } : null;
  const pri = selected ? PRIORITY_COLORS[selected.priority] || {} : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Email list ── */}
      <div style={{ width: 290, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", padding: "12px 12px 0", gap: 4 }}>
          {["open", "resolved", "all"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "7px 0", fontSize: 13, border: "none", borderRadius: 7, cursor: "pointer",
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "#6366F1" : "#9CA3AF",
              background: tab === t ? "#F0EFFE" : "transparent",
              textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        {/* Gmail sync bar */}
        <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 6 }}>
          {gmailStatus?.connected ? (
            <>
              <span style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#6B7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gmailStatus.email}</span>
              <button onClick={handleSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 4, background: syncing ? "#F3F4F6" : "#F0EFFE", color: syncing ? "#9CA3AF" : "#6366F1", border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {syncing ? <><SmallSpinner />&nbsp;Syncing…</> : <>↻ Sync</>}
              </button>
            </>
          ) : (
            <>
              <span style={{ width: 7, height: 7, background: "#E5E7EB", borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", flex: 1 }}>Gmail not connected</span>
              <button onClick={() => onNavigate("settings")} style={{ background: "none", border: "none", fontSize: 12, color: "#6366F1", fontWeight: 700, cursor: "pointer", padding: 0, flexShrink: 0 }}>Connect →</button>
            </>
          )}
        </div>
        {syncResult && (
          <div style={{ margin: "5px 8px 0", padding: "8px 10px", borderRadius: 7, fontSize: 12, background: syncResult.ok ? "#F0FDF4" : "#FEF2F2", border: "1px solid " + (syncResult.ok ? "#BBF7D0" : "#FECACA") }}>
            {syncResult.ok ? (
              <div>
                <div style={{ fontWeight: 700, color: "#16A34A", marginBottom: syncResult.rejected > 0 ? 4 : 0 }}>
                  {syncResult.count > 0 ? "✓ " + syncResult.count + " support email" + (syncResult.count > 1 ? "s" : "") + " imported" : "✓ No new support emails found"}
                </div>
                {(syncResult.rejected > 0 || syncResult.skipped > 0) && (
                  <div style={{ color: "#6B7280", fontSize: 11 }}>
                    {syncResult.rejected > 0 && <span>🤖 AI filtered out {syncResult.rejected} non-support email{syncResult.rejected > 1 ? "s" : ""}</span>}
                    {syncResult.rejected > 0 && syncResult.skipped > 0 && <span style={{ margin: "0 4px" }}>·</span>}
                    {syncResult.skipped > 0 && <span>{syncResult.skipped} already imported</span>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#DC2626" }}>⚠ {syncResult.error}</span>
                {syncResult.goSettings && <button onClick={() => onNavigate("settings")} style={{ background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "#DC2626", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Settings →</button>}
              </div>
            )}
          </div>
        )}
        <div style={{ padding: "6px 12px 4px", fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>
          {filtered.length} email{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Selection action bar */}
        {selected_ids.size > 0 && (
          <div style={{ margin: "4px 8px", padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", flex: 1 }}>{selected_ids.size} selected</span>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: "none", border: "none", fontSize: 12, color: "#6B7280", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, opacity: deleting ? 0.7 : 1 }}>
              {deleting ? <><SmallSpinner color="#fff" />&nbsp;Deleting…</> : <>🗑 Delete {selected_ids.size}</>}
            </button>
          </div>
        )}

        {/* Select all row */}
        {filtered.length > 0 && (
          <div style={{ padding: "4px 12px 2px", display: "flex", alignItems: "center", gap: 8 }}>
            <Checkbox checked={selected_ids.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
            <span style={{ fontSize: 11, color: "#9CA3AF", cursor: "pointer" }} onClick={toggleSelectAll}>
              {selected_ids.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
            </span>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, padding: "0 8px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#9CA3AF", fontSize: 15 }}>
              No {tab === "all" ? "" : tab} emails
            </div>
          ) : filtered.map(email => {
            const tc = TAG_COLORS[email.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
            const isActive = selected?.id === email.id;
            const hasLinked = getLinkedTicketId(email) !== null;
            return (
              <div key={email.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                <div style={{ paddingTop: 14, paddingLeft: 4, flexShrink: 0 }} onClick={e => toggleSelect(email.id, e)}>
                  <Checkbox checked={selected_ids.has(email.id)} onChange={() => {}} />
                </div>
              <div onClick={() => selectEmail(email)} style={{
                flex: 1, padding: "12px 12px 12px 6px", borderRadius: 10, cursor: "pointer", transition: "all 0.1s",
                background: isActive ? "#F5F3FF" : selected_ids.has(email.id) ? "#FFF5F5" : "transparent",
                border: isActive ? "1.5px solid #DDD6FE" : selected_ids.has(email.id) ? "1.5px solid #FECACA" : "1.5px solid transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: "#0F1117" }}>{email.customerName}</span>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{email.time}</span>
                </div>
                <div style={{ fontSize: 14, color: "#374151", fontWeight: 600, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {email.subject}
                </div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {email.body.slice(0, 55)}…
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />{email.tag}
                  </span>
                  <span style={{ background: PRIORITY_COLORS[email.priority]?.bg, color: PRIORITY_COLORS[email.priority]?.text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px" }}>{email.priority}</span>
                  {email.status === "resolved" && (
                    <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px" }}>✓ resolved</span>
                  )}
                  {/* Ticket flag badge */}
                  {hasLinked && (
                    <span style={{ background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
                      🎫 Ticket
                    </span>
                  )}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main view ── */}
      {selected ? (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F5F6FA" }}>

            {/* Header */}
            <div style={{ background: "#fff", padding: "16px 24px", borderBottom: "1px solid #EAECF0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F1117", marginBottom: 7, letterSpacing: "-0.3px" }}>
                    {selected.subject}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>
                      {selected.customerName?.[0]}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>{selected.customerName}</span>
                    <span style={{ fontSize: 14, color: "#9CA3AF" }}>{selected.customerEmail}</span>
                    <span style={{ color: "#D1D5DB" }}>·</span>
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>{selected.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {saving && <span style={{ fontSize: 13, color: "#9CA3AF" }}>Saving…</span>}
                  <span style={{ background: tag.bg, color: tag.text, fontSize: 13, fontWeight: 600, borderRadius: 7, padding: "4px 10px" }}>{selected.tag}</span>
                  <span style={{ background: pri.bg, color: pri.text, fontSize: 13, fontWeight: 600, borderRadius: 7, padding: "4px 10px", textTransform: "capitalize" }}>{selected.priority}</span>
                </div>
              </div>
            </div>

            {/* Ticket flag banner (shows after ticket is created) */}
            {linkedTicketId && (
              <div style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🎫</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1D4ED8" }}>Ticket #{linkedTicketId} created from this conversation</span>
                  <span style={{ fontSize: 14, color: "#3B82F6" }}>— being tracked in the Tickets section</span>
                </div>
                <button onClick={() => onNavigate("tickets")} style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  View Ticket →
                </button>
              </div>
            )}

            {/* Email body */}
            <div style={{ padding: "18px 24px", background: "#fff", borderBottom: "1px solid #EAECF0", maxHeight: 150, overflowY: "auto", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 15.5, color: "#374151", lineHeight: 1.75 }}>{selected.body}</p>
            </div>

            {/* Previous replies */}
            {selected.replies?.length > 0 && (
              <div style={{ padding: "12px 24px", borderBottom: "1px solid #EAECF0", background: "#FAFAFA", maxHeight: 200, overflowY: "auto", flexShrink: 0 }}>
                {selected.replies.map((r, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "11px 14px", marginBottom: 6, borderLeft: "3px solid #6366F1", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>
                      <span style={{ color: "#6366F1", fontWeight: 700 }}>{r.author}</span> replied
                    </div>
                    <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.65 }}>{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>Write Reply</span>
                <button onClick={handleGenerate} disabled={aiLoading} style={{
                  background: aiLoading ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: aiLoading ? "#9CA3AF" : "#fff",
                  border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 14, fontWeight: 700,
                  cursor: aiLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: aiLoading ? "none" : "0 2px 8px rgba(99,102,241,0.25)",
                }}>
                  {aiLoading
                    ? <><Spinner />Generating…</>
                    : <>✦ Generate AI Reply</>}
                </button>
              </div>

              {replySent && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 14, color: "#16A34A", fontWeight: 600 }}>
                  ✓ Reply saved
                </div>
              )}

              {convertError && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 14, color: "#DC2626" }}>
                  ⚠ Ticket creation failed: {convertError}. Check your Supabase <code>type</code> column exists.
                </div>
              )}

              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Generate an AI reply or type your own…"
                style={{ flex: 1, minHeight: 120, resize: "none", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", fontSize: 15.5, color: "#0F1117", background: "#fff", outline: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                onFocus={e => e.target.style.borderColor = "#6366F1"}
                onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                {/* Left: Convert to Ticket */}
                <button onClick={handleConvert} disabled={converting} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: linkedTicketId ? "#EFF6FF" : (converting ? "#F3F4F6" : "#fff"),
                  color: linkedTicketId ? "#3B82F6" : (converting ? "#9CA3AF" : "#6366F1"),
                  border: `1.5px solid ${linkedTicketId ? "#BFDBFE" : (converting ? "#E5E7EB" : "#DDD6FE")}`,
                  borderRadius: 9, padding: "8px 16px", fontSize: 14, fontWeight: 700,
                  cursor: converting ? "not-allowed" : "pointer",
                }}>
                  {converting
                    ? <><Spinner color="#9CA3AF" />Creating ticket…</>
                    : linkedTicketId
                      ? <>🎫 View Ticket #{linkedTicketId}</>
                      : <><TicketIcon />Convert to Ticket</>}
                </button>

                {/* Right: reply buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setDraft("")} disabled={!draft.trim()} style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 600, color: "#6B7280", cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.45 }}>
                    Clear
                  </button>
                  <button onClick={handleSendReply} disabled={!draft.trim() || saving} style={{
                    background: draft.trim() ? "#fff" : "#F9FAFB",
                    color: draft.trim() ? "#6366F1" : "#9CA3AF",
                    border: `1.5px solid ${draft.trim() ? "#DDD6FE" : "#E5E7EB"}`,
                    borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 700,
                    cursor: draft.trim() ? "pointer" : "not-allowed",
                  }}>
                    {saving ? "Saving…" : "Send Reply"}
                  </button>
                  <button onClick={handleSendAndResolve} disabled={!draft.trim() || saving} style={{
                    background: draft.trim() ? "#0F1117" : "#E5E7EB",
                    color: draft.trim() ? "#fff" : "#9CA3AF",
                    border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 700,
                    cursor: draft.trim() ? "pointer" : "not-allowed",
                  }}>
                    {saving ? "Saving…" : "Send & Resolve →"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Side panel ── */}
          <div style={{ width: 240, background: "#fff", borderLeft: "1px solid #EAECF0", padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 22 }}>
            <Meta label="Assigned To">
              <select value={selected.assignedTo} onChange={e => handleAssign(e.target.value)} style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#0F1117", padding: "8px 10px", fontSize: 14, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Meta>

            <Meta label="Priority">
              <div style={{ display: "flex", gap: 5 }}>
                {["high", "medium", "low"].map(p => (
                  <button key={p} onClick={() => handlePriority(p)} style={{
                    flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: "pointer", textTransform: "capitalize",
                    border: selected.priority === p ? "none" : "1.5px solid #E5E7EB",
                    background: selected.priority === p ? PRIORITY_COLORS[p].bg : "#fff",
                    color: selected.priority === p ? PRIORITY_COLORS[p].text : "#9CA3AF",
                  }}>{p}</button>
                ))}
              </div>
            </Meta>

            <Meta label="Status">
              <div style={{ display: "flex", gap: 6 }}>
                {["open", "resolved"].map(s => (
                  <button key={s} onClick={async () => {
                    await updateTicket(selected.id, { status: s });
                    const updated = { ...selected, status: s };
                    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
                    setSelected(updated);
                  }} style={{
                    flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 700, borderRadius: 7, border: "none", cursor: "pointer", textTransform: "capitalize",
                    background: selected.status === s ? (s === "resolved" ? "#F0FDF4" : "#FEF2F2") : "#F9FAFB",
                    color: selected.status === s ? (s === "resolved" ? "#16A34A" : "#EF4444") : "#9CA3AF",
                  }}>{s}</button>
                ))}
              </div>
            </Meta>

            <Meta label="Internal Notes">
              <textarea
                value={(selected.notes || "").replace(/__linked_ticket:\d+__\n?/g, "").trim()}
                onChange={e => handleNoteChange(
                  e.target.value + (getLinkedTicketId(selected) ? `\n__linked_ticket:${getLinkedTicketId(selected)}__` : "")
                )}
                onBlur={handleNoteBlur}
                placeholder="Private note — saved on click away…"
                style={{ width: "100%", minHeight: 88, resize: "none", background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, color: "#374151", padding: "10px", fontSize: 14, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </Meta>

            <Meta label="Customer">
              <div style={{ background: "#F9FAFB", borderRadius: 9, padding: 12, border: "1px solid #EAECF0" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1117", marginBottom: 2 }}>{selected.customerName}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>{selected.customerEmail}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Category: <span style={{ color: tag.text, fontWeight: 600 }}>{selected.tag}</span></div>
              </div>
            </Meta>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#9CA3AF" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style={{ fontSize: 15 }}>Select an email to get started</span>
        </div>
      )}
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Spinner({ color = "#6366F1" }) {
  return (
    <span style={{ width: 11, height: 11, border: `2px solid #E5E7EB`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
  );
}

function SmallSpinner({ color }) {
  var top = color || "#6366F1";
  return <span style={{ width: 10, height: 10, border: "1.5px solid #E5E7EB", borderTopColor: top, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />;
}

function Checkbox({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 16, height: 16, borderRadius: 4, border: checked ? "none" : "1.5px solid #D1D5DB", background: checked ? "#6366F1" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.1s" }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

function TicketIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    </svg>
  );
}
