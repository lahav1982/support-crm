import { useState } from "react";

const FIELDS = [
  { key: "companyName",    label: "Company Name",        icon: "🏢", placeholder: "e.g. Acme Store",                             hint: "Used to sign off replies professionally." },
  { key: "products",       label: "Products / Services", icon: "📦", placeholder: "e.g. Handmade ceramics, pottery kits",        hint: "Helps AI reference what you sell accurately." },
  { key: "refundPolicy",   label: "Refund Policy",       icon: "↩", placeholder: "e.g. Full refund within 30 days of purchase", hint: "AI will quote this when handling refund requests." },
  { key: "shippingPolicy", label: "Shipping Info",       icon: "🚚", placeholder: "e.g. Standard shipping 5–7 business days",   hint: "AI will use this for delivery questions." },
  { key: "tone",           label: "Reply Tone",          icon: "💬", placeholder: "e.g. Friendly and warm, but professional",   hint: "How should the AI sound when writing replies?" },
  { key: "extraInfo",      label: "Anything Else",       icon: "📝", placeholder: "e.g. We don't offer phone support. Peak season is December.", hint: "Any other facts the AI should know." },
];

export default function Settings({ context, onSave }) {
  const [form, setForm] = useState(context);
  const [saved, setSaved] = useState(false);

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasContent = Object.values(form).some(v => v.trim());
  const filledCount = Object.values(form).filter(v => v.trim()).length;

  return (
    <div style={{ overflowY: "auto", height: "100%", background: "#F5F6FA", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "36px 28px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.5px" }}>AI Reply Settings</h2>
          <p style={{ margin: 0, fontSize: 15, color: "#6B7280", lineHeight: 1.65 }}>
            Tell the AI about your business. The more detail you add, the more accurate and on-brand every generated reply will be.
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0F1117" }}>Setup progress</span>
              <span style={{ fontSize: 14, color: "#6B7280" }}>{filledCount} of {FIELDS.length} fields filled</span>
            </div>
            <div style={{ height: 6, background: "#F3F4F6", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(filledCount / FIELDS.length) * 100}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 10, transition: "width 0.3s ease" }} />
            </div>
          </div>
          {hasContent && (
            <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 13, fontWeight: 700, borderRadius: 20, padding: "4px 12px", border: "1px solid #BBF7D0", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />Active
            </span>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 17 }}>{f.icon}</span>
                <label style={{ fontSize: 15, fontWeight: 700, color: "#0F1117" }}>{f.label}</label>
                {form[f.key]?.trim() && <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />}
              </div>
              <p style={{ margin: "0 0 10px 23px", fontSize: 13.5, color: "#9CA3AF" }}>{f.hint}</p>
              {f.key === "extraInfo" ? (
                <textarea
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#0F1117", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" }}
                  onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#E5E7EB"; e.target.style.background = "#F9FAFB"; }}
                />
              ) : (
                <input
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#0F1117", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#E5E7EB"; e.target.style.background = "#F9FAFB"; }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Save */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={handleSave}
            style={{ background: saved ? "#F0FDF4" : "linear-gradient(135deg, #6366F1, #8B5CF6)", color: saved ? "#16A34A" : "#fff", border: saved ? "1.5px solid #BBF7D0" : "none", borderRadius: 10, padding: "13px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: saved ? "none" : "0 4px 14px rgba(99,102,241,0.35)", letterSpacing: "-0.2px" }}>
            {saved ? "✓ Settings saved!" : "Save Settings"}
          </button>
          {saved && <span style={{ fontSize: 14, color: "#9CA3AF" }}>AI replies will now use your business info</span>}
        </div>

        {/* Preview */}
        {hasContent && (
          <div style={{ marginTop: 28, background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Preview — what the AI sees</div>
            <pre style={{ margin: 0, fontSize: 14, color: "#6366F1", fontFamily: "'Courier New', monospace", whiteSpace: "pre-wrap", lineHeight: 1.8, background: "#F5F3FF", padding: "14px", borderRadius: 8 }}>
              {buildPrompt(form)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function buildPrompt(ctx) {
  const lines = [];
  if (ctx.companyName)    lines.push(`Company: ${ctx.companyName}`);
  if (ctx.products)       lines.push(`Products/Services: ${ctx.products}`);
  if (ctx.refundPolicy)   lines.push(`Refund policy: ${ctx.refundPolicy}`);
  if (ctx.shippingPolicy) lines.push(`Shipping: ${ctx.shippingPolicy}`);
  if (ctx.tone)           lines.push(`Tone: ${ctx.tone}`);
  if (ctx.extraInfo)      lines.push(`Additional info: ${ctx.extraInfo}`);
  return lines.join("\n");
}
