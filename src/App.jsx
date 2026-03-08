import { useState, useRef } from "react";

const MOCK_EMAILS = [
  {
    id: 1,
    from: "sarah.johnson@example.com",
    name: "Sarah Johnson",
    subject: "Order #4821 hasn't arrived yet",
    body: "Hi, I placed an order 2 weeks ago (order #4821) and it still hasn't arrived. I'm getting worried. Can you please check the status? I need it urgently for an event this weekend.",
    time: "10:23 AM",
    date: "Today",
    status: "pending",
    tag: "Shipping",
  },
  {
    id: 2,
    from: "mike.torres@gmail.com",
    name: "Mike Torres",
    subject: "Refund request for damaged product",
    body: "Hello, I received my order yesterday but the product was completely damaged. The packaging was torn and the item inside was broken. I'd like a full refund or replacement. I can send photos if needed.",
    time: "9:05 AM",
    date: "Today",
    status: "pending",
    tag: "Refund",
  },
  {
    id: 3,
    from: "anna.k@business.co",
    name: "Anna Kowalski",
    subject: "Bulk order inquiry - 500 units",
    body: "Good morning, I'm reaching out on behalf of Kowalski & Associates. We are interested in placing a bulk order of approximately 500 units for corporate gifting purposes. Could you provide pricing and availability? We'd need delivery by December 15th.",
    time: "Yesterday",
    date: "Yesterday",
    status: "pending",
    tag: "Sales",
  },
  {
    id: 4,
    from: "derek.smith@hotmail.com",
    name: "Derek Smith",
    subject: "How do I reset my account password?",
    body: "I've been trying to log in for the past hour but I keep getting an error. I tried the 'forgot password' link but never received the email. My email is derek.smith@hotmail.com. Please help!",
    time: "Tuesday",
    date: "Tuesday",
    status: "resolved",
    tag: "Account",
  },
  {
    id: 5,
    from: "priya.m@outlook.com",
    name: "Priya Mehta",
    subject: "Wrong item sent — need exchange",
    body: "Hi there, I ordered the blue version of the product but received the red one. The packing slip says blue but the actual item is red. Can you arrange an exchange? I'd prefer not to wait too long as it was a birthday gift.",
    time: "Monday",
    date: "Monday",
    status: "pending",
    tag: "Exchange",
  },
];

const TAG_COLORS = {
  Shipping: { bg: "#e8f4fd", text: "#1a6fa3", dot: "#3b9fd6" },
  Refund: { bg: "#fff0f0", text: "#b03030", dot: "#e05555" },
  Sales: { bg: "#f0fdf4", text: "#276642", dot: "#4caf7d" },
  Account: { bg: "#fdf4ff", text: "#7c3aad", dot: "#a855f7" },
  Exchange: { bg: "#fff8ed", text: "#a05a10", dot: "#f59e2b" },
};

const BUSINESS_CONTEXT = `You are a professional customer support agent. Be warm, helpful, empathetic, and solution-focused. Keep replies concise (3-5 sentences). Always acknowledge the customer's concern, provide a clear action or solution, and end with an offer to help further. Use a friendly but professional tone.`;

export default function App() {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [selected, setSelected] = useState(MOCK_EMAILS[0]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState("all");
  const [businessContext, setBusinessContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef(null);

  const filtered = emails.filter((e) => {
    if (tab === "all") return true;
    if (tab === "pending") return e.status === "pending";
    if (tab === "resolved") return e.status === "resolved";
    return true;
  });

  const pending = emails.filter((e) => e.status === "pending").length;

  async function generateReply() {
    if (!selected) return;
    setLoading(true);
    setDraft("");
    setSent(false);
    try {
      const systemPrompt = `${BUSINESS_CONTEXT}${businessContext ? `\n\nAdditional business context: ${businessContext}` : ""}`;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `Write a customer support reply to this email:\n\nFrom: ${selected.name} (${selected.from})\nSubject: ${selected.subject}\nMessage: ${selected.body}\n\nWrite only the email body (no subject line, no "Dear..." salutation unless natural). Start directly with the response.`,
            },
          ],
        }),
      });
      const data = await response.json();
      const text = data.content?.map((c) => c.text || "").join("") || "Sorry, could not generate a reply.";
      setDraft(text);
    } catch (e) {
      setDraft("Error connecting to AI. Please try again.");
    }
    setLoading(false);
  }

  function sendReply() {
    if (!draft.trim()) return;
    setEmails((prev) =>
      prev.map((e) => (e.id === selected.id ? { ...e, status: "resolved" } : e))
    );
    setSent(true);
    setDraft("");
  }

  function selectEmail(email) {
    setSelected(email);
    setDraft("");
    setSent(false);
  }

  const tag = selected ? TAG_COLORS[selected.tag] || { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" } : null;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f7f6f3", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, borderBottom: "1px solid #2d2d4a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6c63ff, #48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✉</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>SupportAI</span>
          <span style={{ color: "#6c6c9a", fontSize: 13 }}>/ Inbox</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {pending > 0 && (
            <span style={{ background: "#e05555", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{pending} pending</span>
          )}
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: showSettings ? "#2d2d4a" : "transparent", border: "1px solid #2d2d4a", borderRadius: 8, color: "#a0a0c8", padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      {showSettings && (
        <div style={{ background: "#22223b", padding: "14px 28px", borderBottom: "1px solid #2d2d4a", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "#a0a0c8", fontSize: 13, whiteSpace: "nowrap" }}>Business context:</span>
          <input
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder="e.g. We sell handmade ceramics. Refunds within 30 days. Shipping takes 5–7 days..."
            style={{ flex: 1, background: "#1a1a2e", border: "1px solid #3d3d5c", borderRadius: 8, color: "#e0e0f0", padding: "8px 14px", fontSize: 13, outline: "none" }}
          />
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 58px)" }}>
        {/* Sidebar */}
        <div style={{ width: 300, background: "#fff", borderRight: "1px solid #ebebeb", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #ebebeb", padding: "0 16px" }}>
            {["all", "pending", "resolved"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "13px 0", fontSize: 12, fontWeight: tab === t ? 700 : 500, color: tab === t ? "#1a1a2e" : "#9ca3af", background: "none", border: "none", borderBottom: tab === t ? "2px solid #6c63ff" : "2px solid transparent", cursor: "pointer", textTransform: "capitalize", marginBottom: -1 }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((email) => {
              const tc = TAG_COLORS[email.tag] || { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" };
              const isSelected = selected?.id === email.id;
              return (
                <div key={email.id} onClick={() => selectEmail(email)}
                  style={{ padding: "14px 16px", borderBottom: "1px solid #f3f3f3", cursor: "pointer", background: isSelected ? "#f4f3ff" : "#fff", borderLeft: isSelected ? "3px solid #6c63ff" : "3px solid transparent", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: email.status === "pending" ? 700 : 500, fontSize: 13, color: "#1a1a2e" }}>{email.name}</span>
                    <span style={{ fontSize: 11, color: "#b0b0b0" }}>{email.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.subject}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 8 }}>{email.body.slice(0, 60)}...</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: tc.bg, color: tc.text, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />{email.tag}
                    </span>
                    {email.status === "resolved" && (
                      <span style={{ background: "#f0fdf4", color: "#276642", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>✓ Resolved</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Panel */}
        {selected ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "#fff", padding: "20px 28px", borderBottom: "1px solid #ebebeb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>{selected.subject}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #6c63ff, #48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                      {selected.name[0]}
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{selected.name}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>&lt;{selected.from}&gt;</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#b0b0b0" }}>· {selected.date} at {selected.time}</span>
                  </div>
                </div>
                <span style={{ background: tag.bg, color: tag.text, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 12px" }}>{selected.tag}</span>
              </div>
            </div>

            <div style={{ padding: "24px 28px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{selected.body}</p>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 28px", background: "#fff", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Reply</span>
                <button onClick={generateReply} disabled={loading}
                  style={{ background: loading ? "#e0dfff" : "linear-gradient(135deg, #6c63ff, #48c6ef)", color: loading ? "#9090c0" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {loading ? (
                    <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #9090c0", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating...</>
                  ) : "✦ Generate AI Reply"}
                </button>
              </div>

              {sent ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>✓</div>
                  <span style={{ color: "#276642", fontWeight: 700, fontSize: 15 }}>Reply sent successfully!</span>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>This email has been marked as resolved.</span>
                </div>
              ) : (
                <>
                  <textarea ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                    placeholder="Click 'Generate AI Reply' to draft a response, or type your own..."
                    style={{ flex: 1, minHeight: 180, resize: "none", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: "#374151", outline: "none", lineHeight: 1.7, fontFamily: "inherit" }}
                    onFocus={(e) => (e.target.style.borderColor = "#6c63ff")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 10 }}>
                    <button onClick={() => setDraft("")} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 18px", fontSize: 13, color: "#6b7280", cursor: "pointer" }}>Clear</button>
                    <button onClick={sendReply} disabled={!draft.trim()}
                      style={{ background: draft.trim() ? "#1a1a2e" : "#e5e7eb", color: draft.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: draft.trim() ? "pointer" : "not-allowed" }}>
                      Send Reply ↑
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 15 }}>
            Select an email to get started
          </div>
        )}
      </div>
    </div>
  );
}
