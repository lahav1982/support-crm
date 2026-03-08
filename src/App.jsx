import { useState } from "react";
import { INITIAL_TICKETS } from "./lib/data.js";
import Inbox from "./pages/Inbox.jsx";
import Customers from "./pages/Customers.jsx";
import Analytics from "./pages/Analytics.jsx";

const NAV = [
  { id: "inbox", icon: "✉", label: "Inbox" },
  { id: "customers", icon: "👤", label: "Customers" },
  { id: "analytics", icon: "📊", label: "Analytics" },
];

export default function App() {
  const [page, setPage] = useState("inbox");
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [businessContext, setBusinessContext] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const open = tickets.filter(t => t.status === "open").length;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Syne', 'DM Sans', sans-serif", background: "#080c13", color: "#e2e8f0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2433; border-radius: 4px; }
        select option { background: #0d1117; }
      `}</style>

      {/* Left nav */}
      <div style={{ width: 64, background: "#080c13", borderRight: "1px solid #1e2433", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4 }}>
        {/* Logo */}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6c63ff,#48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 20, flexShrink: 0 }}>✉</div>

        {NAV.map(n => {
          const isActive = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} title={n.label}
              style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: isActive ? "#161b27" : "transparent", color: isActive ? "#6c63ff" : "#2d3748", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "all 0.12s" }}>
              {n.icon}
              {n.id === "inbox" && open > 0 && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "#e05555", borderRadius: "50%", border: "2px solid #080c13" }} />
              )}
            </button>
          );
        })}

        {/* Settings at bottom */}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowSettings(!showSettings)} title="Settings"
          style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: showSettings ? "#161b27" : "transparent", color: showSettings ? "#6c63ff" : "#2d3748", fontSize: 18, cursor: "pointer", marginBottom: 12 }}>⚙</button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 52, background: "#0d1117", borderBottom: "1px solid #1e2433", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.3px" }}>{NAV.find(n => n.id === page)?.label}</span>
            {page === "inbox" && open > 0 && (
              <span style={{ background: "#2a1a1a", color: "#e05555", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{open} open</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#2d3748" }}>SupportAI CRM</span>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6c63ff,#48c6ef)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>Y</div>
          </div>
        </div>

        {/* Settings bar */}
        {showSettings && (
          <div style={{ background: "#0d1117", borderBottom: "1px solid #1e2433", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "#4a5568", whiteSpace: "nowrap" }}>Business context for AI replies:</span>
            <input value={businessContext} onChange={e => setBusinessContext(e.target.value)}
              placeholder="e.g. We sell handmade ceramics. Refunds within 30 days. Shipping 5–7 days..."
              style={{ flex: 1, background: "#161b27", border: "1px solid #1e2433", borderRadius: 8, color: "#e2e8f0", padding: "7px 12px", fontSize: 12, outline: "none", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = "#6c63ff"}
              onBlur={e => e.target.style.borderColor = "#1e2433"}
            />
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {page === "inbox" && <Inbox tickets={tickets} setTickets={setTickets} businessContext={businessContext} />}
          {page === "customers" && <Customers tickets={tickets} />}
          {page === "analytics" && <Analytics tickets={tickets} />}
        </div>
      </div>
    </div>
  );
}
