import { useState, useEffect } from "react";

const FIELDS = [
  { key: "companyName",    label: "Company Name",        icon: "🏢", placeholder: "e.g. Acme Store",                             hint: "Used to sign off replies professionally." },
  { key: "products",       label: "Products / Services", icon: "📦", placeholder: "e.g. Handmade ceramics, pottery kits",        hint: "Helps AI reference what you sell accurately." },
  { key: "refundPolicy",   label: "Refund Policy",       icon: "↩", placeholder: "e.g. Full refund within 30 days of purchase", hint: "AI will quote this when handling refund requests." },
  { key: "shippingPolicy", label: "Shipping Info",       icon: "🚚", placeholder: "e.g. Standard shipping 5–7 business days",   hint: "AI will use this for delivery questions." },
  { key: "tone",           label: "Reply Tone",          icon: "💬", placeholder: "e.g. Friendly and warm, but professional",   hint: "How should the AI sound when writing replies?" },
  { key: "extraInfo",      label: "Anything Else",       icon: "📝", placeholder: "e.g. We don't offer phone support. Peak season is December.", hint: "Any other facts the AI should know." },
];

export default function Settings({ context, onSave, gmailStatus, onDisconnectGmail }) {
  const [form, setForm] = useState(context || {});
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState(context?.signatureLogoUrl || "");

  useEffect(() => {
    setForm(context || {});
    setLogoPreview(context?.signatureLogoUrl || "");
  }, [context]);

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasContent = FIELDS.some(f => form[f.key]?.trim());
  const filledCount = FIELDS.filter(f => form[f.key]?.trim()).length;

  return (
    <div style={{ overflowY: "auto", height: "100%", background: "#F7F5F0", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "36px 28px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#1C2B1C", letterSpacing: "-0.5px" }}>AI Reply Settings</h2>
          <p style={{ margin: 0, fontSize: 15, color: "#6B7D6B", lineHeight: 1.65 }}>
            Tell the AI about your business. The more detail you add, the more accurate and on-brand every generated reply will be.
          </p>
        </div>

        {/* Gmail Connection */}
        <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "22px 24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>📧</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1C2B1C" }}>Gmail Connection</h3>
            {gmailStatus?.connected && (
              <span style={{ marginLeft: "auto", background: "#EAF0EA", color: "#3D6B3D", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 10px", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, background: "#5E9B5E", borderRadius: "50%", display: "inline-block" }} />Connected
              </span>
            )}
          </div>
          {gmailStatus?.connected ? (
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 15, color: "#6B7D6B" }}>
                Connected as <strong style={{ color: "#1C2B1C" }}>{gmailStatus.email}</strong>. New emails sync to your Inbox automatically when you click Sync.
              </p>
              <button onClick={onDisconnectGmail} style={{ background: "#fff", border: "1.5px solid #FECACA", borderRadius: 9, padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>
                Disconnect Gmail
              </button>
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 16px", fontSize: 15, color: "#6B7D6B", lineHeight: 1.65 }}>
                Connect your Google Workspace email to pull customer emails directly into your inbox and send replies from within the app.
              </p>
              <a href="/api/gmail-auth" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 9, padding: "11px 20px", fontSize: 15, fontWeight: 700, color: "#1C2B1C", textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Connect Google Workspace Gmail
              </a>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "#8A9E8A" }}>
                You&apos;ll be redirected to Google to approve access. We only request read and send permissions.
              </p>
            </div>
          )}
        </div>

        {/* Gmail Sync Filters — only show when connected */}
        {gmailStatus?.connected && (
          <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "22px 24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🔍</span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1C2B1C" }}>Gmail Pre-Filters <span style={{ fontSize: 12, fontWeight: 500, color: "#8A9E8A" }}>(optional)</span></h3>
              {(form.gmailFilterKeywords || form.gmailFilterDomains) && (
                <span style={{ marginLeft: "auto", background: "#EAF0EA", color: "#3D6B3D", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 10px", border: "1px solid #BBF7D0" }}>Active</span>
              )}
            </div>
            <p style={{ margin: "0 0 18px", fontSize: 15, color: "#6B7D6B", lineHeight: 1.65 }}>
              AI automatically decides which emails are customer support. These optional pre-filters <strong>narrow the pool</strong> of emails the AI looks at — useful if your inbox is very busy. Leave both empty to let AI triage everything.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Keywords */}
              <div style={{ background: "#FAFAF7", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "16px 18px" }}>
                <label style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C", display: "block", marginBottom: 4 }}>Subject Keywords</label>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#8A9E8A" }}>
                  Comma-separated. Emails whose subject contains any of these words will be pulled in.
                  <br/>Example: <code style={{ background: "#F0EDE6", padding: "1px 5px", borderRadius: 4 }}>order, refund, shipping, help, issue</code>
                </p>
                <input
                  value={form.gmailFilterKeywords || ""}
                  onChange={e => handleChange("gmailFilterKeywords", e.target.value)}
                  placeholder="e.g. order, refund, shipping, complaint, help"
                  style={{ width: "100%", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#1C2B1C", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#3D6B3D"}
                  onBlur={e => e.target.style.borderColor = "#DDD8CF"}
                />
                {form.gmailFilterKeywords && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {form.gmailFilterKeywords.split(",").map(k => k.trim()).filter(Boolean).map((k, i) => (
                      <span key={i} style={{ background: "#EAF0EA", color: "#3D6B3D", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "3px 9px" }}>{k}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Domains */}
              <div style={{ background: "#FAFAF7", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "16px 18px" }}>
                <label style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C", display: "block", marginBottom: 4 }}>Sender Domains</label>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#8A9E8A" }}>
                  Comma-separated. Emails from these domains will always be pulled in, regardless of subject.
                  <br/>Example: <code style={{ background: "#F0EDE6", padding: "1px 5px", borderRadius: 4 }}>shopify.com, amazon.com, mybigcustomer.com</code>
                </p>
                <input
                  value={form.gmailFilterDomains || ""}
                  onChange={e => handleChange("gmailFilterDomains", e.target.value)}
                  placeholder="e.g. gmail.com, outlook.com, importantclient.com"
                  style={{ width: "100%", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#1C2B1C", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = "#3D6B3D"}
                  onBlur={e => e.target.style.borderColor = "#DDD8CF"}
                />
                {form.gmailFilterDomains && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {form.gmailFilterDomains.split(",").map(d => d.trim()).filter(Boolean).map((d, i) => (
                      <span key={i} style={{ background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "3px 9px" }}>@{d.replace(/^@/, "")}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              {(form.gmailFilterKeywords || form.gmailFilterDomains) && (
                <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 9, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3D6B3D", marginBottom: 5 }}>Gmail will search for:</div>
                  <code style={{ fontSize: 12, color: "#4C1D95", wordBreak: "break-all", lineHeight: 1.6 }}>
                    is:unread in:inbox{" "}
                    {[
                      form.gmailFilterKeywords && "(" + form.gmailFilterKeywords.split(",").map(k => k.trim()).filter(Boolean).map(k => 'subject:"' + k + '"').join(" OR ") + ")",
                      form.gmailFilterDomains  && "(" + form.gmailFilterDomains.split(",").map(d => "from:@" + d.trim().replace(/^@/, "")).filter(Boolean).join(" OR ") + ")",
                    ].filter(Boolean).join(" OR ")}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1C2B1C" }}>Setup progress</span>
              <span style={{ fontSize: 14, color: "#6B7D6B" }}>{filledCount} of {FIELDS.length} fields filled</span>
            </div>
            <div style={{ height: 6, background: "#F0EDE6", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(filledCount / FIELDS.length) * 100}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 10, transition: "width 0.3s ease" }} />
            </div>
          </div>
          {hasContent && (
            <span style={{ background: "#EAF0EA", color: "#3D6B3D", fontSize: 13, fontWeight: 700, borderRadius: 20, padding: "4px 12px", border: "1px solid #BBF7D0", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, background: "#5E9B5E", borderRadius: "50%", display: "inline-block" }} />Active
            </span>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 17 }}>{f.icon}</span>
                <label style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C" }}>{f.label}</label>
                {form[f.key]?.trim() && <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#5E9B5E", borderRadius: "50%", display: "inline-block" }} />}
              </div>
              <p style={{ margin: "0 0 10px 23px", fontSize: 13.5, color: "#8A9E8A" }}>{f.hint}</p>
              {f.key === "extraInfo" ? (
                <textarea
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#1C2B1C", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" }}
                  onFocus={e => { e.target.style.borderColor = "#3D6B3D"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#DDD8CF"; e.target.style.background = "#FAFAF7"; }}
                />
              ) : (
                <input
                  value={form[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#1C2B1C", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit" }}
                  onFocus={e => { e.target.style.borderColor = "#3D6B3D"; e.target.style.background = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#DDD8CF"; e.target.style.background = "#FAFAF7"; }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Signature */}
        <div style={{ marginTop: 14, background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 17 }}>✍️</span>
            <label style={{ fontSize: 15, fontWeight: 700, color: "#1C2B1C" }}>Email Signature</label>
            {(form.signatureText?.trim() || form.signatureLogoUrl?.trim()) && <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#5E9B5E", borderRadius: "50%", display: "inline-block" }} />}
          </div>
          <p style={{ margin: "0 0 12px 23px", fontSize: 13.5, color: "#8A9E8A" }}>Appended to every reply sent from the CRM.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#3A4E3A", display: "block", marginBottom: 5 }}>Logo</label>
              <div
                onClick={() => document.getElementById("logo-upload").click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#3D6B3D"; e.currentTarget.style.background = "#F5F3FF"; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = "#DDD8CF"; e.currentTarget.style.background = "#FAFAF7"; }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#DDD8CF";
                  e.currentTarget.style.background = "#FAFAF7";
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = ev => { handleChange("signatureLogoUrl", ev.target.result); setLogoPreview(ev.target.result); };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ width: "100%", background: "#FAFAF7", border: "1.5px dashed #E5E7EB", borderRadius: 9, padding: "18px 12px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}
              >
                {logoPreview ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
                    <img src={logoPreview} alt="Logo" style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain" }} onError={e => e.target.style.display="none"} />
                    <button onClick={e => { e.stopPropagation(); handleChange("signatureLogoUrl", ""); setLogoPreview(""); }}
                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#3A4E3A" }}>Click or drag & drop your logo</div>
                    <div style={{ fontSize: 12, color: "#8A9E8A", marginTop: 3 }}>PNG, JPG, SVG — max 1MB</div>
                  </div>
                )}
              </div>
              <input id="logo-upload" type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 1024 * 1024) { alert("Image must be under 1MB"); return; }
                  const reader = new FileReader();
                  reader.onload = ev => { handleChange("signatureLogoUrl", ev.target.result); setLogoPreview(ev.target.result); };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#3A4E3A", display: "block", marginBottom: 5 }}>Signature Text</label>
              <textarea
                value={form.signatureText || ""}
                onChange={e => handleChange("signatureText", e.target.value)}
                placeholder={"Thanks,\nThe Rootless Plants Team\nwww.rootlessplants.com"}
                rows={3}
                style={{ width: "100%", background: "#FAFAF7", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#1C2B1C", padding: "10px 12px", fontSize: 15, outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" }}
                onFocus={e => { e.target.style.borderColor = "#3D6B3D"; e.target.style.background = "#fff"; }}
                onBlur={e => { e.target.style.borderColor = "#DDD8CF"; e.target.style.background = "#FAFAF7"; }}
              />
            </div>
            {(form.signatureText?.trim() || form.signatureLogoUrl?.trim()) && (
              <div style={{ background: "#FAFAF7", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Preview</div>
                <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 10 }}>
                  {form.signatureText?.trim() && (
                    <div style={{ fontSize: 14, color: "#3A4E3A", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.signatureText}</div>
                  )}
                  {form.signatureLogoUrl?.trim() && (
                    <img src={form.signatureLogoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: 160, objectFit: "contain", display: "block", marginTop: 8 }}
                      onError={e => { e.target.style.display = "none"; }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={handleSave}
            style={{ background: saved ? "#EAF0EA" : "linear-gradient(135deg, #6366F1, #8B5CF6)", color: saved ? "#3D6B3D" : "#fff", border: saved ? "1.5px solid #BBF7D0" : "none", borderRadius: 10, padding: "13px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: saved ? "none" : "0 4px 14px rgba(99,102,241,0.35)", letterSpacing: "-0.2px" }}>
            {saved ? "✓ Settings saved!" : "Save Settings"}
          </button>
          {saved && <span style={{ fontSize: 14, color: "#8A9E8A" }}>AI replies will now use your business info</span>}
        </div>

        {/* Preview */}
        {hasContent && (
          <div style={{ marginTop: 28, background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#8A9E8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Preview — what the AI sees</div>
            <pre style={{ margin: 0, fontSize: 14, color: "#3D6B3D", fontFamily: "'Courier New', monospace", whiteSpace: "pre-wrap", lineHeight: 1.8, background: "#F5F3FF", padding: "14px", borderRadius: 8 }}>
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
