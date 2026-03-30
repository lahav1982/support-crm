import { useState } from "react";

const DEFECT_TYPES = [
  { id: "broken_pot",     label: "Broken Pot",       color: "#C0543A", bg: "#FAE8E4" },
  { id: "damaged_plant",  label: "Damaged Plant",    color: "#8B6914", bg: "#FBF3E0" },
  { id: "wrong_item",     label: "Wrong Item",       color: "#2D5A8E", bg: "#E4EEF8" },
  { id: "missing_parts",  label: "Missing Parts",    color: "#6B4A9B", bg: "#F0EAFA" },
  { id: "quality_poor",   label: "Poor Quality",     color: "#B5530E", bg: "#FAEADE" },
  { id: "other",          label: "Other Defect",     color: "#5A6A5A", bg: "#EBF0EB" },
];

const STATUSES = [
  { id: "open",        label: "Open",        color: "#C0543A", bg: "#FAE8E4" },
  { id: "reviewing",   label: "Reviewing",   color: "#8B6914", bg: "#FBF3E0" },
  { id: "resolved",    label: "Resolved",    color: "#3D6B3D", bg: "#EAF0EA" },
  { id: "replaced",    label: "Replaced",    color: "#2D5A8E", bg: "#E4EEF8" },
  { id: "refunded",    label: "Refunded",    color: "#6B4A9B", bg: "#F0EAFA" },
];

const TYPE_MAP   = Object.fromEntries(DEFECT_TYPES.map(t => [t.id, t]));
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.id, s]));

export default function QualityIssues({ issues, setIssues }) {
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch]         = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting]     = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [newForm, setNewForm]       = useState({
    customerName: "", customerEmail: "", subject: "", message: "",
    defectType: "broken_pot", status: "open", notes: "",
  });

  const items = issues || [];

  const filtered = items.filter(i => {
    const matchStatus = filter === "all" || i.status === filter;
    const matchType   = typeFilter === "all" || i.defectType === typeFilter;
    const matchSearch = !search ||
      i.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      i.message?.toLowerCase().includes(search.toLowerCase()) ||
      i.subject?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const counts = Object.fromEntries(STATUSES.map(s => [s.id, items.filter(i => i.status === s.id).length]));
  const typeCounts = Object.fromEntries(DEFECT_TYPES.map(t => [t.id, items.filter(i => i.defectType === t.id).length]));
  const openCount = counts.open || 0;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/gmail-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const r = await fetch("/api/quality-issues", { credentials: "include" });
      const d = await r.json();
      if (Array.isArray(d)) setIssues(d.map(rowToIssue));
      setSyncResult(data.error
        ? { ok: false, msg: data.error }
        : { ok: true, msg: `Sync complete — ${data.imported || 0} new items` });
    } catch (e) {
      setSyncResult({ ok: false, msg: e.message });
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 5000);
  }

  async function updateField(id, fields) {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
    if (selected?.id === id) setSelected(p => ({ ...p, ...fields }));
    await fetch("/api/quality-issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...fields }),
    });
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} issue${selectedIds.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selectedIds].map(id =>
      fetch("/api/quality-issues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      })
    ));
    setIssues(prev => prev.filter(i => !selectedIds.has(i.id)));
    if (selectedIds.has(selected?.id)) setSelected(null);
    setSelectedIds(new Set());
    setDeleting(false);
  }

  async function addManual() {
    if (!newForm.customerName.trim() && !newForm.message.trim()) return;
    setSaving(true);
    const res = await fetch("/api/quality-issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        customer_name:  newForm.customerName.trim(),
        customer_email: newForm.customerEmail.trim(),
        subject:        newForm.subject.trim(),
        message:        newForm.message.trim(),
        defect_type:    newForm.defectType,
        status:         newForm.status,
        notes:          newForm.notes.trim(),
        source:         "manual",
      }),
    });
    const data = await res.json();
    if (data?.id) setIssues(prev => [rowToIssue(data), ...prev]);
    setShowAdd(false);
    setNewForm({ customerName: "", customerEmail: "", subject: "", message: "", defectType: "broken_pot", status: "open", notes: "" });
    setSaving(false);
  }

  function toggleSelect(id, e) {
    e.stopPropagation();
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left list panel */}
      <div style={{ width: 310, background: "#fff", borderRight: "1px solid #E5E0D5", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F0EDE6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C", fontFamily: "'Playfair Display', serif" }}>Quality Issues</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSync} disabled={syncing}
                style={{ background: syncing ? "#F0EDE6" : "#EAF0EA", color: syncing ? "#8A9E8A" : "#3D6B3D", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none", fontSize: 13 }}>⟳</span>
                {syncing ? "Syncing…" : "Sync"}
              </button>
              <button onClick={() => setShowAdd(true)}
                style={{ background: "#1C2B1C", color: "#E8E0D0", border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Add
              </button>
            </div>
          </div>

          {syncResult && (
            <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: syncResult.ok ? "#EAF0EA" : "#FAE8E4", color: syncResult.ok ? "#3D6B3D" : "#C0543A", border: `1px solid ${syncResult.ok ? "#C5D9C5" : "#F0C4BB"}` }}>
              {syncResult.ok ? "✓" : "✗"} {syncResult.msg}
            </div>
          )}

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues…"
            style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#1C2B1C" }} />
        </div>

        {/* Status filter tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #F0EDE6", overflowX: "auto" }}>
          {[{ id: "all", label: "All" }, ...STATUSES].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{ flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700, border: "none", borderBottom: filter === s.id ? "2px solid #3D6B3D" : "2px solid transparent", background: "transparent", color: filter === s.id ? "#3D6B3D" : "#8A9E8A", cursor: "pointer", whiteSpace: "nowrap", minWidth: 44 }}>
              {s.label}{s.id !== "all" && counts[s.id] ? ` (${counts[s.id]})` : ""}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div style={{ padding: "8px 10px 6px", display: "flex", gap: 5, flexWrap: "wrap", borderBottom: "1px solid #F0EDE6" }}>
          <button onClick={() => setTypeFilter("all")}
            style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, border: "1px solid", borderColor: typeFilter === "all" ? "#3D6B3D" : "#DDD8CF", background: typeFilter === "all" ? "#EAF0EA" : "transparent", color: typeFilter === "all" ? "#3D6B3D" : "#8A9E8A", cursor: "pointer" }}>
            All Types
          </button>
          {DEFECT_TYPES.map(t => (
            <button key={t.id} onClick={() => setTypeFilter(typeFilter === t.id ? "all" : t.id)}
              style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, border: "1px solid", borderColor: typeFilter === t.id ? t.color : "#DDD8CF", background: typeFilter === t.id ? t.bg : "transparent", color: typeFilter === t.id ? t.color : "#8A9E8A", cursor: "pointer" }}>
              {t.label}{typeCounts[t.id] ? ` · ${typeCounts[t.id]}` : ""}
            </button>
          ))}
        </div>

        {/* Bulk delete bar */}
        {selectedIds.size > 0 && (
          <div style={{ margin: "6px 8px 0", padding: "7px 12px", background: "#FAE8E4", border: "1px solid #F0C4BB", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#C0543A", flex: 1 }}>{selectedIds.size} selected</span>
            <button onClick={() => setSelectedIds(new Set())} style={{ background: "none", border: "none", fontSize: 12, color: "#6B7D6B", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={handleBulkDelete} disabled={deleting}
              style={{ background: "#C0543A", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
              {deleting ? "Deleting…" : `🗑 Delete ${selectedIds.size}`}
            </button>
          </div>
        )}

        {/* Select all */}
        {filtered.length > 0 && (
          <div style={{ padding: "6px 14px 2px", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={() => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)))}
              style={{ cursor: "pointer", width: 13, height: 13 }} />
            <span style={{ fontSize: 11, color: "#8A9E8A", fontWeight: 600 }}>
              {selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
            </span>
          </div>
        )}

        {/* Issue list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#8A9E8A", fontSize: 13, padding: "40px 16px", lineHeight: 1.6 }}>
              {items.length === 0 ? "No quality issues yet.\nSync Gmail or add manually." : "No issues match this filter."}
            </div>
          ) : filtered.map(issue => {
            const defect = TYPE_MAP[issue.defectType] || TYPE_MAP.other;
            const status = STATUS_MAP[issue.status] || STATUS_MAP.open;
            const isActive = selected?.id === issue.id;
            return (
              <div key={issue.id}
                style={{ padding: "9px 10px", borderRadius: 9, cursor: "pointer", marginBottom: 3, border: isActive ? "1.5px solid #C5D9C5" : selectedIds.has(issue.id) ? "1.5px solid #F0C4BB" : "1.5px solid transparent", background: isActive ? "#FAFCFA" : selectedIds.has(issue.id) ? "#FFF5F3" : "transparent", transition: "all 0.1s", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <input type="checkbox" checked={selectedIds.has(issue.id)} onChange={e => toggleSelect(issue.id, e)}
                  onClick={e => e.stopPropagation()} style={{ cursor: "pointer", width: 13, height: 13, marginTop: 3, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setSelected(issue)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2B1C", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {issue.customerName || issue.customerEmail || "Unknown"}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: status.bg, color: status.color, borderRadius: 20, padding: "2px 7px", whiteSpace: "nowrap" }}>{status.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7D6B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                    {issue.subject || issue.message || "No description"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: defect.bg, color: defect.color, borderRadius: 4, padding: "1px 6px" }}>{defect.label}</span>
                    <span style={{ fontSize: 11, color: "#8A9E8A" }}>{issue.date}</span>
                    {issue.source === "email" && <span style={{ fontSize: 10, color: "#3D6B3D", background: "#EAF0EA", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>Email</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right detail / stats panel */}
      <div style={{ flex: 1, overflowY: "auto", background: "#F7F5F0" }}>
        {selected ? (
          <IssueDetail issue={selected} onUpdate={(fields) => updateField(selected.id, fields)}
            onDelete={async () => {
              if (!confirm("Delete this issue?")) return;
              await fetch("/api/quality-issues", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: selected.id }) });
              setIssues(prev => prev.filter(i => i.id !== selected.id));
              setSelected(null);
            }}
            onClose={() => setSelected(null)} />
        ) : (
          <QualityStats items={items} counts={counts} typeCounts={typeCounts} openCount={openCount} />
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", border: "1px solid #E5E0D5", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1C2B1C", marginBottom: 18, fontFamily: "'Playfair Display', serif" }}>Add Quality Issue</div>
            {[
              { key: "customerName",  label: "Customer Name",  placeholder: "e.g. David Gomez" },
              { key: "customerEmail", label: "Customer Email", placeholder: "e.g. david@example.com" },
              { key: "subject",       label: "Subject",        placeholder: "e.g. Broken pot on delivery" },
              { key: "message",       label: "Message",        placeholder: "Describe the issue…", rows: 3 },
              { key: "notes",         label: "Internal Notes", placeholder: "Replacement sent, tracking #…", rows: 2 },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3A4E3A", display: "block", marginBottom: 4 }}>{f.label}</label>
                {f.rows ? (
                  <textarea value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} rows={f.rows}
                    style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
                ) : (
                  <input value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3A4E3A", display: "block", marginBottom: 4 }}>Issue Type</label>
                <select value={newForm.defectType} onChange={e => setNewForm(p => ({ ...p, defectType: e.target.value }))}
                  style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
                  {DEFECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3A4E3A", display: "block", marginBottom: 4 }}>Status</label>
                <select value={newForm.status} onChange={e => setNewForm(p => ({ ...p, status: e.target.value }))}
                  style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: "10px", background: "#F0EDE6", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#6B7D6B" }}>Cancel</button>
              <button onClick={addManual} disabled={saving || (!newForm.customerName.trim() && !newForm.message.trim())}
                style={{ flex: 2, padding: "10px", background: "#1C2B1C", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#E8E0D0", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Add Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueDetail({ issue, onUpdate, onDelete, onClose }) {
  const [notes, setNotes]         = useState(issue.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  function saveNotes() {
    onUpdate({ notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  const defect = TYPE_MAP[issue.defectType] || TYPE_MAP.other;
  const status = STATUS_MAP[issue.status]   || STATUS_MAP.open;

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: defect.bg, border: `2px solid ${defect.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: defect.color, fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {(issue.customerName || issue.customerEmail || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1C2B1C", marginBottom: 3, fontFamily: "'Playfair Display', serif" }}>
            {issue.customerName || issue.customerEmail || "Unknown Customer"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {issue.customerEmail && <span style={{ fontSize: 12, color: "#6B7D6B" }}>{issue.customerEmail}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, background: defect.bg, color: defect.color, borderRadius: 5, padding: "2px 8px" }}>{defect.label}</span>
            <span style={{ fontSize: 11, color: "#8A9E8A" }}>{issue.date}</span>
            {issue.source === "email" && <span style={{ fontSize: 11, fontWeight: 600, color: "#3D6B3D", background: "#EAF0EA", borderRadius: 4, padding: "2px 7px" }}>Auto-detected</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#8A9E8A", cursor: "pointer", padding: "0 4px" }}>×</button>
      </div>

      {/* Status selector */}
      <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Status</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => onUpdate({ status: s.id })}
              style={{ padding: "7px 14px", borderRadius: 8, border: issue.status === s.id ? `2px solid ${s.color}` : "2px solid #DDD8CF", background: issue.status === s.id ? s.bg : "#FAFAF7", color: issue.status === s.id ? s.color : "#6B7D6B", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Issue type */}
      <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Issue Type</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {DEFECT_TYPES.map(t => (
            <button key={t.id} onClick={() => onUpdate({ defect_type: t.id, defectType: t.id })}
              style={{ padding: "6px 12px", borderRadius: 7, border: issue.defectType === t.id ? `2px solid ${t.color}` : "2px solid #DDD8CF", background: issue.defectType === t.id ? t.bg : "#FAFAF7", color: issue.defectType === t.id ? t.color : "#6B7D6B", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      {issue.subject && (
        <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Subject</div>
          <div style={{ fontSize: 14, color: "#3A4E3A", fontWeight: 600 }}>{issue.subject}</div>
        </div>
      )}

      {/* Customer message */}
      {issue.message && (
        <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Customer Message</div>
          <div style={{ fontSize: 14, color: "#3A4E3A", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#FAFAF7", borderRadius: 8, padding: "12px 14px" }}>{issue.message}</div>
        </div>
      )}

      {/* Notes */}
      <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Internal Notes</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Replacement sent, tracking #… refund processed… awaiting photos…"
          rows={4}
          style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #DDD8CF", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, color: "#1C2B1C" }}
          onFocus={e => { e.target.style.borderColor = "#3D6B3D"; e.target.style.background = "#fff"; }}
          onBlur={e => { e.target.style.borderColor = "#DDD8CF"; e.target.style.background = "#FAFAF7"; }} />
        <button onClick={saveNotes}
          style={{ marginTop: 8, background: notesSaved ? "#EAF0EA" : "#1C2B1C", color: notesSaved ? "#3D6B3D" : "#E8E0D0", border: notesSaved ? "1px solid #C5D9C5" : "none", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {notesSaved ? "✓ Saved" : "Save Notes"}
        </button>
      </div>

      {/* Delete */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onDelete}
          style={{ background: "none", border: "1px solid #F0C4BB", color: "#C0543A", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          🗑 Delete Issue
        </button>
      </div>
    </div>
  );
}

function QualityStats({ items, counts, typeCounts, openCount }) {
  const resolvedCount  = (counts.resolved || 0) + (counts.replaced || 0) + (counts.refunded || 0);
  const resolutionRate = items.length ? Math.round((resolvedCount / items.length) * 100) : 0;
  const topDefect      = [...DEFECT_TYPES].sort((a, b) => (typeCounts[b.id] || 0) - (typeCounts[a.id] || 0))[0];

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#1C2B1C", marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>Quality Dashboard</div>
      <div style={{ fontSize: 14, color: "#8A9E8A", marginBottom: 24 }}>Select an issue on the left to view details</div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Open Issues",      value: openCount,       color: "#C0543A", bg: "#FAE8E4" },
          { label: "Resolution Rate",  value: resolutionRate + "%", color: "#3D6B3D", bg: "#EAF0EA" },
          { label: "Total Reported",   value: items.length,    color: "#2D5A8E", bg: "#E4EEF8" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "#8A9E8A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>By Status</div>
        {STATUSES.map(s => {
          const count = counts[s.id] || 0;
          const pct = items.length ? (count / items.length) * 100 : 0;
          return (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "#6B7D6B" }}>{count} issue{count !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ height: 6, background: "#F0EDE6", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: s.color, borderRadius: 10, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Type breakdown */}
      <div style={{ background: "#fff", border: "1px solid #E5E0D5", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>By Issue Type</div>
        {DEFECT_TYPES.map(t => {
          const count = typeCounts[t.id] || 0;
          const pct = items.length ? (count / items.length) * 100 : 0;
          return (
            <div key={t.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</span>
                <span style={{ fontSize: 13, color: "#6B7D6B" }}>{count}</span>
              </div>
              <div style={{ height: 5, background: "#F0EDE6", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: t.color, borderRadius: 10, transition: "width 0.4s ease", opacity: 0.8 }} />
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", background: "#fff", borderRadius: 12, border: "1px solid #E5E0D5" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🪴</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C", marginBottom: 6, fontFamily: "'Playfair Display', serif" }}>No quality issues reported</div>
          <div style={{ fontSize: 13, color: "#8A9E8A" }}>Sync Gmail to auto-detect defect emails,<br />or add issues manually.</div>
        </div>
      )}
    </div>
  );
}

export function rowToIssue(row) {
  return {
    id:            row.id,
    customerName:  row.customer_name  || "",
    customerEmail: row.customer_email || "",
    subject:       row.subject        || "",
    message:       row.message        || "",
    notes:         row.notes          || "",
    defectType:    row.defect_type    || "other",
    status:        row.status         || "open",
    source:        row.source         || "manual",
    date:          row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    timestamp:     row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}
