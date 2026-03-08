import { useState } from "react";

const FIELDS = [
  { key: "companyName",    label: "Company Name",         placeholder: "e.g. Acme Store",                          hint: "Used to sign off replies professionally." },
  { key: "products",       label: "Products / Services",  placeholder: "e.g. Handmade ceramics, pottery kits",     hint: "Helps AI reference what you sell accurately." },
  { key: "refundPolicy",   label: "Refund Policy",        placeholder: "e.g. Full refund within 30 days of purchase", hint: "AI will quote this when handling refund requests." },
  { key: "shippingPolicy", label: "Shipping Info",        placeholder: "e.g. Standard shipping 5–7 business days, express 2 days", hint: "AI will use this for shipping/delivery questions." },
  { key: "tone",           label: "Reply Tone",           placeholder: "e.g. Friendly and warm, but professional", hint: "How should the AI sound when writing replies?" },
  { key: "extraInfo",      label: "Anything Else",        placeholder: "e.g. We don't offer phone support. Our busiest season is December.", hint: "Any other facts the AI should know about your business." },
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

  return (
    <div style={{ overflowY: "auto", height: "100%", background: "#0a0e17", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 28px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.3px" }}>AI Reply Settings</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#4a5568", lineHeight: 1.6 }}>
            Fill in the details below so the AI knows about your business. The more you add, the more accurate and on-brand your AI replies will be.
          </p>
        </div>

        {/* Active indicator */}
        {hasContent && (
          <div style={{ background: "#0d2a1a", border: "1px solid #1a4a2a", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 13, color: "#4caf7d", fontWeight: 600 }}>AI context is active — replies will use your business information</span>
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: "18px 20px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#4a5568" }}>{f.hint}</p>
              {f.key === "extraInfo" ? (
                <textarea
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ width: "100%", background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = "#6c63ff"}
                  onBlur={e => e.target.style.borderColor = "#1e2433"}
                />
              ) : (
                <input
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#6c63ff"}
                  onBlur={e => e.target.style.borderColor = "#1e2433"}
                />
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={handleSave}
            style={{ background: saved ? "#0d2a1a" : "linear-gradient(135deg,#6c63ff,#48c6ef)", color: saved ? "#4caf7d" : "#fff", border: saved ? "1px solid #1a4a2a" : "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", letterSpacing: "-0.2px" }}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "#4a5568" }}>AI replies will now use this information</span>}
        </div>

        {/* Preview */}
        {hasContent && (
          <div style={{ marginTop: 32, background: "#0d1117", border: "1px solid #1e2433", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>What the AI sees</div>
            <pre style={{ margin: 0, fontSize: 12, color: "#6c63ff", fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
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
