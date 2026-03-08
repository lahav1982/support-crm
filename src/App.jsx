import { useState } from "react";
import { INITIAL_TICKETS } from "./lib/data.js";
import Inbox from "./pages/Inbox.jsx";
import Customers from "./pages/Customers.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings, { buildPrompt } from "./pages/Settings.jsx";

const NAV = [
  { id: "inbox",     label: "Inbox",     icon: <InboxIcon /> },
  { id: "customers", label: "Customers", icon: <UsersIcon /> },
  { id: "analytics", label: "Analytics", icon: <ChartIcon /> },
  { id: "settings",  label: "Settings",  icon: <GearIcon /> },
];

const EMPTY_CONTEXT = {
  companyName: "", products: "", refundPolicy: "",
  shippingPolicy: "", tone: "", extraInfo: "",
};

export default function App() {
  const [page, setPage] = useState("inbox");
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [contextForm, setContextForm] = useState(EMPTY_CONTEXT);
  const [savedContext, setSavedContext] = useState(EMPTY_CONTEXT);

  const open = tickets.filter(t => t.status === "open").length;
  const hasContext = Object.values(savedContext).some(v => v.trim());
  const businessContextPrompt = buildPrompt(savedContext);

  function handleSaveContext(form) {
    setSavedContext({ ...form });
    setContextForm({ ...form });
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#F5F6FA", color: "#0F1117", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E5ED; border-radius: 10px; }
        select option { background: #fff; color: #0F1117; }
        input, textarea, select { font-family: 'Plus Jakarta Sans', sans-serif; }
        button { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 2, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 20px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>SupportAI</span>
        </div>

        {/* Nav items */}
        {NAV.map(n => {
          const isActive = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: isActive ? "#F0EFFE" : "transparent", color: isActive ? "#6366F1" : "#6B7280", cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 500, transition: "all 0.12s", position: "relative", textAlign: "left" }}>
              <span style={{ color: isActive ? "#6366F1" : "#9CA3AF", display: "flex" }}>{n.icon}</span>
              {n.label}
              {n.id === "inbox" && open > 0 && (
                <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{open}</span>
              )}
              {n.id === "settings" && !hasContext && (
                <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#F59E0B", borderRadius: "50%", display: "inline-block" }} />
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: "1px solid #EAECF0", marginTop: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Y</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1117" }}>You</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>Admin</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>{NAV.find(n => n.id === page)?.label}</span>
            {page === "inbox" && open > 0 && (
              <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{open} open</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {page === "inbox" && (
              hasContext
                ? <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />AI context active
                  </span>
                : <button onClick={() => setPage("settings")} style={{ background: "#FFFBEB", color: "#D97706", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #FDE68A", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>⚠</span> Set up AI context
                  </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
          {page === "inbox"     && <Inbox tickets={tickets} setTickets={setTickets} businessContext={businessContextPrompt} />}
          {page === "customers" && <Customers tickets={tickets} />}
          {page === "analytics" && <Analytics tickets={tickets} />}
          {page === "settings"  && <Settings context={contextForm} onSave={handleSaveContext} />}
        </div>
      </div>
    </div>
  );
}

// SVG Icons
function InboxIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ChartIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function GearIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
