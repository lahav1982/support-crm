import { useState } from "react";

const STAGES = [
  { id: "new",       label: "New",       color: "#6366F1", bg: "#F0EFFE" },
  { id: "contacted", label: "Contacted", color: "#F59E0B", bg: "#FFFBEB" },
  { id: "converted", label: "Converted", color: "#22C55E", bg: "#F0FDF4" },
  { id: "lost",      label: "Lost",      color: "#9CA3AF", bg: "#F3F4F6" },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));

const VALUE_OPTIONS = ["< $50", "$50–$150", "$150–$500", "$500+", "Unknown"];

export default function Opportunities({ opportunities, setOpportunities }) {
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [newForm, setNewForm]     = useState({ customerName: "", message: "", notes: "", estimatedValue: "Unknown", stage: "new" });

  const ops = opportunities || [];

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
      // Reload opportunities after sync
      const opRes = await fetch("/api/opportunities", { credentials: "include" });
      const opData = await opRes.json();
      if (Array.isArray(opData)) setOpportunities(opData.map(rowToOpp));
      setSyncResult(data.error ? { ok: false, msg: data.error } : { ok: true, msg: `Sync complete — ${data.imported || 0} new items` });
    } catch (e) {
      setSyncResult({ ok: false, msg: e.message });
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 5000);
  }

  const filtered = ops.filter(o => {
    const matchStage  = filter === "all" || o.stage === filter;
    const matchSearch = !search || o.customerName?.toLowerCase().includes(search.toLowerCase()) || o.message?.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  const counts = Object.fromEntries(STAGES.map(s => [s.id, ops.filter(o => o.stage === s.id).length]));

  async function updateStage(id, stage) {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    if (selected?.id === id) setSelected(prev => ({ ...prev, stage }));
    await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, stage }),
    });
  }

  async function updateNotes(id, notes) {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, notes } : o));
    await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, notes }),
    });
  }

  async function updateValue(id, estimatedValue) {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, estimatedValue } : o));
    if (selected?.id === id) setSelected(prev => ({ ...prev, estimatedValue }));
    await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, estimated_value: estimatedValue }),
    });
  }

  async function deleteOpp(id) {
    if (!confirm("Delete this opportunity?")) return;
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setSelected(null);
    await fetch("/api/opportunities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
  }

  async function addManual() {
    if (!newForm.customerName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        customer_name:   newForm.customerName.trim(),
        message:         newForm.message.trim(),
        notes:           newForm.notes.trim(),
        estimated_value: newForm.estimatedValue,
        stage:           newForm.stage,
        source:          "manual",
      }),
    });
    const data = await res.json();
    if (data?.id) {
      setOpportunities(prev => [rowToOpp(data), ...prev]);
    }
    setShowAdd(false);
    setNewForm({ customerName: "", message: "", notes: "", estimatedValue: "Unknown", stage: "new" });
    setSaving(false);
  }

  const totalValue = ops.filter(o => o.stage !== "lost").reduce((sum, o) => {
    const v = o.estimatedValue;
    if (v === "< $50") return sum + 25;
    if (v === "$50–$150") return sum + 100;
    if (v === "$150–$500") return sum + 325;
    if (v === "$500+") return sum + 500;
    return sum;
  }, 0);

  const convRate = ops.length ? Math.round((counts.converted / ops.length) * 100) : 0;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left panel */}
      <div style={{ width: 300, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F1117" }}>Opportunities</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSync} disabled={syncing}
                style={{ background: syncing ? "#F3F4F6" : "#F0EFFE", color: syncing ? "#9CA3AF" : "#6366F1", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }}>⟳</span>
                {syncing ? "Syncing…" : "Sync"}
              </button>
              <button onClick={() => setShowAdd(true)}
                style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Add
              </button>
            </div>
          </div>
          {syncResult && (
            <div style={{ margin: "0 0 8px", padding: "7px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: syncResult.ok ? "#F0FDF4" : "#FEF2F2", color: syncResult.ok ? "#16A34A" : "#DC2626", border: "1px solid " + (syncResult.ok ? "#BBF7D0" : "#FECACA") }}>
              {syncResult.ok ? "✓" : "✗"} {syncResult.msg}
            </div>
          )}

          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0F1117" }} />
        </div>

        {/* Stage filter tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6", overflowX: "auto" }}>
          {[{ id: "all", label: "All" }, ...STAGES].map(s => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              style={{ flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700, border: "none", borderBottom: filter === s.id ? "2px solid #6366F1" : "2px solid transparent", background: "transparent", color: filter === s.id ? "#6366F1" : "#9CA3AF", cursor: "pointer", whiteSpace: "nowrap" }}>
              {s.label} {s.id !== "all" && <span style={{ fontSize: 10, opacity: 0.8 }}>({counts[s.id] || 0})</span>}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "40px 16px" }}>
              {filter === "all" ? "No opportunities yet.\nSync Gmail or add manually." : `No ${filter} opportunities.`}
            </div>
          ) : filtered.map(o => {
            const stage = STAGE_MAP[o.stage] || STAGE_MAP.new;
            const isActive = selected?.id === o.id;
            return (
              <div key={o.id} onClick={() => setSelected(o)}
                style={{ padding: "10px 10px", borderRadius: 9, cursor: "pointer", marginBottom: 3, border: isActive ? "1.5px solid #DDD6FE" : "1.5px solid transparent", background: isActive ? "#FAFAFE" : "transparent", transition: "all 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F1117", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customerName || "Unknown"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: stage.bg, color: stage.color, borderRadius: 20, padding: "2px 7px", whiteSpace: "nowrap" }}>{stage.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{o.message || "No message"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{o.date}</span>
                  {o.estimatedValue && o.estimatedValue !== "Unknown" && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#059669", background: "#ECFDF5", borderRadius: 4, padding: "1px 5px" }}>{o.estimatedValue}</span>
                  )}
                  {o.source === "shopify" && (
                    <span style={{ fontSize: 10, color: "#6366F1", background: "#F0EFFE", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>Shopify</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel — detail or stats */}
      <div style={{ flex: 1, overflowY: "auto", background: "#F5F6FA" }}>
        {selected ? (
          <OpportunityDetail
            opp={selected}
            onStageChange={stage => updateStage(selected.id, stage)}
            onNotesChange={notes => { setSelected(p => ({ ...p, notes })); updateNotes(selected.id, notes); }}
            onValueChange={v => updateValue(selected.id, v)}
            onDelete={() => deleteOpp(selected.id)}
            onClose={() => setSelected(null)}
          />
        ) : (
          <PipelineStats ops={ops} counts={counts} totalValue={totalValue} convRate={convRate} />
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0F1117", marginBottom: 18 }}>Add Opportunity</div>
            {[
              { key: "customerName", label: "Customer Name *", placeholder: "e.g. David Gomez" },
              { key: "message", label: "Message / Interest", placeholder: "What are they interested in?" },
              { key: "notes", label: "Notes", placeholder: "Any additional context..." },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{f.label}</label>
                <textarea value={newForm[f.key]} onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} rows={f.key === "message" || f.key === "notes" ? 2 : 1}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Est. Value</label>
                <select value={newForm.estimatedValue} onChange={e => setNewForm(p => ({ ...p, estimatedValue: e.target.value }))}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
                  {VALUE_OPTIONS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Stage</label>
                <select value={newForm.stage} onChange={e => setNewForm(p => ({ ...p, stage: e.target.value }))}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", fontFamily: "inherit" }}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, padding: "10px", background: "#F3F4F6", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#6B7280" }}>Cancel</button>
              <button onClick={addManual} disabled={saving || !newForm.customerName.trim()}
                style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Add Opportunity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunityDetail({ opp, onStageChange, onNotesChange, onValueChange, onDelete, onClose }) {
  const [notes, setNotes] = useState(opp.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);
  const stage = STAGE_MAP[opp.stage] || STAGE_MAP.new;

  function saveNotes() {
    onNotesChange(notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {(opp.customerName || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F1117", marginBottom: 3 }}>{opp.customerName || "Unknown Customer"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{opp.date}</span>
            {opp.source === "shopify" && <span style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", background: "#F0EFFE", borderRadius: 4, padding: "2px 7px" }}>Shopify Inbox</span>}
            {opp.source === "manual" && <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "2px 7px" }}>Manual</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#9CA3AF", cursor: "pointer", padding: "0 4px" }}>×</button>
      </div>

      {/* Stage selector */}
      <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Stage</div>
        <div style={{ display: "flex", gap: 8 }}>
          {STAGES.map(s => (
            <button key={s.id} onClick={() => onStageChange(s.id)}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: opp.stage === s.id ? `2px solid ${s.color}` : "2px solid #E5E7EB", background: opp.stage === s.id ? s.bg : "#F9FAFB", color: opp.stage === s.id ? s.color : "#6B7280", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Est value */}
      <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Estimated Value</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {VALUE_OPTIONS.map(v => (
            <button key={v} onClick={() => onValueChange(v)}
              style={{ padding: "6px 12px", borderRadius: 7, border: opp.estimatedValue === v ? "2px solid #059669" : "2px solid #E5E7EB", background: opp.estimatedValue === v ? "#ECFDF5" : "#F9FAFB", color: opp.estimatedValue === v ? "#059669" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {opp.message && (
        <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Customer Message</div>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#F9FAFB", borderRadius: 8, padding: "12px 14px" }}>{opp.message}</div>
        </div>
      )}

      {/* Notes */}
      <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Notes</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add follow-up notes, product interest, next steps..."
          rows={4}
          style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6, color: "#0F1117" }}
          onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
          onBlur={e => { e.target.style.borderColor = "#E5E7EB"; e.target.style.background = "#F9FAFB"; }}
        />
        <button onClick={saveNotes}
          style={{ marginTop: 8, background: notesSaved ? "#F0FDF4" : "#6366F1", color: notesSaved ? "#16A34A" : "#fff", border: notesSaved ? "1px solid #BBF7D0" : "none", borderRadius: 7, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {notesSaved ? "✓ Saved" : "Save Notes"}
        </button>
      </div>

      {/* Delete */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onDelete}
          style={{ background: "none", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

function PipelineStats({ ops, counts, totalValue, convRate }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 28px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#0F1117", marginBottom: 6 }}>Sales Pipeline</div>
      <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>Select an opportunity to view details</div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Leads", value: ops.length, color: "#6366F1", bg: "#F0EFFE" },
          { label: "Conversion Rate", value: convRate + "%", color: "#22C55E", bg: "#F0FDF4" },
          { label: "Pipeline Value", value: totalValue > 0 ? "~$" + totalValue : "—", color: "#F59E0B", bg: "#FFFBEB" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Stage breakdown */}
      <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>By Stage</div>
        {STAGES.map(s => {
          const count = counts[s.id] || 0;
          const pct = ops.length ? (count / ops.length) * 100 : 0;
          return (
            <div key={s.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "#6B7280" }}>{count} lead{count !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: s.color, borderRadius: 10, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {ops.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", background: "#fff", borderRadius: 12, border: "1px solid #EAECF0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1117", marginBottom: 6 }}>No opportunities yet</div>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>Sync Gmail to auto-import Shopify Inbox chats,<br />or add leads manually with the + Add button.</div>
        </div>
      )}
    </div>
  );
}

export function rowToOpp(row) {
  return {
    id:             row.id,
    customerName:   row.customer_name  || "",
    message:        row.message        || "",
    notes:          row.notes          || "",
    estimatedValue: row.estimated_value || "Unknown",
    stage:          row.stage          || "new",
    source:         row.source         || "manual",
    date:           row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    timestamp:      row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}
