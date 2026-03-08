import { useState } from "react";
import { TAG_COLORS, PRIORITY_COLORS, TEAM } from "../lib/data.js";
import { updateTicket } from "../lib/supabase.js";

const STATUSES = ["open", "in progress", "resolved"];

export default function Tickets({ tickets, setTickets }) {
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Only show tickets of type "ticket" (converted from chat)
  const ticketItems = tickets.filter(t => t.type === "ticket");

  const filtered = ticketItems.filter(t => {
    const statusMatch = filter === "all" ? true : t.status === filter;
    const priorityMatch = priorityFilter === "all" ? true : t.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const openCount = ticketItems.filter(t => t.status === "open" || t.status === "in progress").length;

  async function handleField(field, value) {
    if (!selected) return;
    setSaving(true);
    const changes = { [field]: value };
    // map field names for Supabase
    if (field === "assignedTo") changes.assignedTo = Number(value);
    await updateTicket(selected.id, changes);
    setSaving(false);
    const updated = { ...selected, [field]: field === "assignedTo" ? Number(value) : value };
    setSelected(updated);
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
  }

  async function handleNoteBlur() {
    if (!selected) return;
    await updateTicket(selected.id, { notes: selected.notes });
  }

  function handleNoteChange(notes) {
    const updated = { ...selected, notes };
    setSelected(updated);
    setTickets(prev => prev.map(t => t.id === selected.id ? updated : t));
  }

  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" } : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left: ticket list */}
      <div style={{ width: 320, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column" }}>

        {/* Header + count */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0F1117" }}>All Tickets</span>
            {openCount > 0 && (
              <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>{openCount} open</span>
            )}
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {["all", "open", "in progress", "resolved"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                style={{ padding: "5px 8px", fontSize: 12, fontWeight: filter === s ? 700 : 500, color: filter === s ? "#6366F1" : "#9CA3AF", background: filter === s ? "#F0EFFE" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "high", "medium", "low"].map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                style={{ padding: "4px 8px", fontSize: 12, fontWeight: priorityFilter === p ? 700 : 500, color: priorityFilter === p ? (PRIORITY_COLORS[p]?.text || "#6366F1") : "#9CA3AF", background: priorityFilter === p ? (PRIORITY_COLORS[p]?.bg || "#F0EFFE") : "transparent", border: "none", borderRadius: 6, cursor: "pointer", textTransform: "capitalize" }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
          {ticketItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#9CA3AF" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>🎫</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No tickets yet</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>Convert a customer conversation to a ticket using the <strong>"Convert to Ticket"</strong> button in the Inbox.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#9CA3AF", fontSize: 15 }}>No tickets match filters</div>
          ) : filtered.map(ticket => {
            const tc = TAG_COLORS[ticket.tag] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
            const pc = PRIORITY_COLORS[ticket.priority] || {};
            const isActive = selected?.id === ticket.id;
            const assignee = TEAM.find(m => m.id === ticket.assignedTo);

            return (
              <div key={ticket.id} onClick={() => setSelected(ticket)}
                style={{ padding: "12px", borderRadius: 10, cursor: "pointer", background: isActive ? "#F5F3FF" : "transparent", border: isActive ? "1.5px solid #DDD6FE" : "1.5px solid transparent", marginBottom: 4, transition: "all 0.1s" }}>

                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0F1117", flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{ticket.subject}</span>
                  <span style={{ fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>{ticket.date}</span>
                </div>

                {/* Customer */}
                <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>{ticket.customerName}</div>

                {/* Summary preview */}
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ticket.body}</div>

                {/* Badges row */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />{ticket.tag}
                  </span>
                  <span style={{ background: pc.bg, color: pc.text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px", textTransform: "capitalize" }}>{ticket.priority}</span>
                  <span style={{ background: statusColor(ticket.status).bg, color: statusColor(ticket.status).text, fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 7px", textTransform: "capitalize" }}>{ticket.status}</span>
                  {assignee && (
                    <span style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: assignee.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{assignee.avatar}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: ticket detail */}
      {selected ? (
        <div style={{ flex: 1, overflowY: "auto", background: "#F5F6FA", display: "flex", flexDirection: "column" }}>

          {/* Detail header */}
          <div style={{ background: "#fff", padding: "20px 28px", borderBottom: "1px solid #EAECF0", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, background: "#F0EFFE", color: "#6366F1", fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>🎫 Ticket #{selected.id}</span>
                  {saving && <span style={{ fontSize: 13, color: "#9CA3AF" }}>Saving…</span>}
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: "#0F1117", marginBottom: 8, letterSpacing: "-0.4px" }}>{selected.subject}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>{selected.customerName?.[0]}</div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>{selected.customerName}</span>
                  <span style={{ fontSize: 14, color: "#9CA3AF" }}>{selected.customerEmail}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: "24px 28px", display: "flex", gap: 20 }}>

            {/* Main content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Summary */}
              <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Summary</div>
                <p style={{ margin: 0, fontSize: 15.5, color: "#374151", lineHeight: 1.75 }}>{selected.body}</p>
              </div>

              {/* Action needed */}
              {selected.notes?.startsWith("Action needed:") && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚡</span> Action Needed
                  </div>
                  <p style={{ margin: 0, fontSize: 15.5, color: "#374151", fontWeight: 600 }}>{selected.notes.split("\n")[0].replace("Action needed: ", "")}</p>
                </div>
              )}

              {/* Replies / activity */}
              {selected.replies?.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Activity</div>
                  {selected.replies.map((r, i) => (
                    <div key={i} style={{ borderLeft: "3px solid #6366F1", paddingLeft: 14, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}><span style={{ color: "#6366F1", fontWeight: 700 }}>{r.author}</span> · {new Date(r.timestamp).toLocaleDateString()}</div>
                      <p style={{ margin: 0, fontSize: 15, color: "#374151", lineHeight: 1.6 }}>{r.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Internal notes */}
              <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Internal Notes</div>
                <textarea
                  value={selected.notes?.startsWith("Action needed:") ? selected.notes.split("\n\n").slice(1).join("\n\n") : (selected.notes || "")}
                  onChange={e => {
                    const prefix = selected.notes?.startsWith("Action needed:") ? selected.notes.split("\n\n")[0] + "\n\n" : "";
                    handleNoteChange(prefix + e.target.value);
                  }}
                  onBlur={handleNoteBlur}
                  placeholder="Add internal notes visible to your team..."
                  style={{ width: "100%", minHeight: 100, resize: "vertical", background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 9, color: "#374151", padding: "12px", fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.6 }}
                />
              </div>
            </div>

            {/* Side controls */}
            <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>

              {/* Status */}
              <SideCard label="Status">
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => handleField("status", s)}
                      style={{ padding: "8px 12px", fontSize: 14, fontWeight: selected.status === s ? 700 : 500, borderRadius: 8, border: selected.status === s ? "none" : "1.5px solid #E5E7EB", background: selected.status === s ? statusColor(s).bg : "#fff", color: selected.status === s ? statusColor(s).text : "#6B7280", cursor: "pointer", textAlign: "left", textTransform: "capitalize" }}>
                      {selected.status === s && <span style={{ marginRight: 6 }}>●</span>}{s}
                    </button>
                  ))}
                </div>
              </SideCard>

              {/* Priority */}
              <SideCard label="Priority">
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {["high", "medium", "low"].map(p => (
                    <button key={p} onClick={() => handleField("priority", p)}
                      style={{ padding: "8px 12px", fontSize: 14, fontWeight: selected.priority === p ? 700 : 500, borderRadius: 8, border: selected.priority === p ? "none" : "1.5px solid #E5E7EB", background: selected.priority === p ? PRIORITY_COLORS[p].bg : "#fff", color: selected.priority === p ? PRIORITY_COLORS[p].text : "#6B7280", cursor: "pointer", textAlign: "left", textTransform: "capitalize" }}>
                      {selected.priority === p && <span style={{ marginRight: 6 }}>●</span>}{p}
                    </button>
                  ))}
                </div>
              </SideCard>

              {/* Assigned to */}
              <SideCard label="Assigned To">
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {TEAM.map(m => (
                    <button key={m.id} onClick={() => handleField("assignedTo", m.id)}
                      style={{ padding: "8px 12px", fontSize: 14, fontWeight: selected.assignedTo === m.id ? 700 : 500, borderRadius: 8, border: selected.assignedTo === m.id ? "none" : "1.5px solid #E5E7EB", background: selected.assignedTo === m.id ? "#F0EFFE" : "#fff", color: selected.assignedTo === m.id ? "#6366F1" : "#6B7280", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{m.avatar}</span>
                      {m.name}
                    </button>
                  ))}
                </div>
              </SideCard>

              {/* Tag */}
              <SideCard label="Category">
                <select value={selected.tag} onChange={e => handleField("tag", e.target.value)}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#0F1117", padding: "9px 10px", fontSize: 14, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                  {["Shipping", "Refund", "Account", "Sales", "Exchange", "Technical", "General"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </SideCard>

              {/* Dates */}
              <SideCard label="Details">
                <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 2 }}>
                  <div>Created: <span style={{ color: "#0F1117", fontWeight: 600 }}>{selected.date}</span></div>
                  <div>Customer: <span style={{ color: "#0F1117", fontWeight: 600 }}>{selected.customerName}</span></div>
                </div>
              </SideCard>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#F5F6FA" }}>
          <div style={{ fontSize: 40 }}>🎫</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#6B7280" }}>Select a ticket to view details</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 280, textAlign: "center", lineHeight: 1.6 }}>
            Tickets are created from customer conversations using the <strong>"Convert to Ticket"</strong> button in the Inbox.
          </div>
        </div>
      )}
    </div>
  );
}

function SideCard({ label, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function statusColor(status) {
  if (status === "open")        return { bg: "#FEF2F2", text: "#EF4444" };
  if (status === "in progress") return { bg: "#EFF6FF", text: "#3B82F6" };
  if (status === "resolved")    return { bg: "#F0FDF4", text: "#16A34A" };
  return { bg: "#F3F4F6", text: "#6B7280" };
}
