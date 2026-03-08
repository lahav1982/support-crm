import { useState, useEffect } from "react";
import { fetchTickets, fetchSettings, saveSettings, rowToTicket, rowToSettings } from "./lib/supabase.js";
import Inbox from "./pages/Inbox.jsx";
import Tickets from "./pages/Tickets.jsx";
import Customers from "./pages/Customers.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings, { buildPrompt } from "./pages/Settings.jsx";

const NAV = [
  { id: "inbox",     label: "Inbox",     icon: <InboxIcon /> },
  { id: "tickets",   label: "Tickets",   icon: <TicketIcon /> },
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
  const [tickets, setTickets] = useState([]);
  const [contextForm, setContextForm] = useState(EMPTY_CONTEXT);
  const [savedContext, setSavedContext] = useState(EMPTY_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true); setError(null);
      try {
        const [ticketRows, settingsRow] = await Promise.all([fetchTickets(), fetchSettings()]);
        setTickets((ticketRows || []).map(rowToTicket));
        const ctx = rowToSettings(settingsRow);
        setContextForm(ctx); setSavedContext(ctx);
      } catch (e) {
        setError("Could not connect to database. Check your Supabase setup.");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const emailCount  = tickets.filter(t => t.type !== "ticket" && t.status === "open").length;
  const ticketCount = tickets.filter(t => t.type === "ticket" && (t.status === "open" || t.status === "in progress")).length;
  const hasContext  = Object.values(savedContext).some(v => v.trim());
  const businessContextPrompt = buildPrompt(savedContext);

  async function handleSaveContext(form) {
    await saveSettings(form);
    setSavedContext({ ...form }); setContextForm({ ...form });
  }

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

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
        input, textarea, select, button { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 2, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 20px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>SupportAI</span>
        </div>

        {/* Nav */}
        {NAV.map(n => {
          const isActive = page === n.id;
          const badge = n.id === "inbox" ? emailCount : n.id === "tickets" ? ticketCount : 0;
          return (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: isActive ? "#F0EFFE" : "transparent", color: isActive ? "#6366F1" : "#6B7280", cursor: "pointer", fontSize: 15.5, fontWeight: isActive ? 700 : 500, transition: "all 0.12s", textAlign: "left" }}>
              <span style={{ color: isActive ? "#6366F1" : "#9CA3AF", display: "flex" }}>{n.icon}</span>
              {n.label}
              {badge > 0 && (
                <span style={{ marginLeft: "auto", background: n.id === "tickets" ? "#EFF6FF" : "#FEF2F2", color: n.id === "tickets" ? "#3B82F6" : "#EF4444", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{badge}</span>
              )}
              {n.id === "settings" && !hasContext && (
                <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#F59E0B", borderRadius: "50%", display: "inline-block" }} />
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* DB status */}
        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>Connected</span>
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: "1px solid #EAECF0" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>Y</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1117" }}>You</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>Admin</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>{NAV.find(n => n.id === page)?.label}</span>
            {page === "inbox" && emailCount > 0 && (
              <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 13, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{emailCount} open</span>
            )}
            {page === "tickets" && ticketCount > 0 && (
              <span style={{ background: "#EFF6FF", color: "#3B82F6", fontSize: 13, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{ticketCount} active</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {page === "inbox" && (
              hasContext
                ? <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 13, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />AI context active
                  </span>
                : <button onClick={() => setPage("settings")} style={{ background: "#FFFBEB", color: "#D97706", fontSize: 13, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #FDE68A", cursor: "pointer" }}>
                    ⚠ Set up AI context
                  </button>
            )}
          </div>
        </div>

        {/* Page */}
        <div style={{ flex: 1, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
          {page === "inbox"     && <Inbox     tickets={tickets} setTickets={setTickets} businessContext={businessContextPrompt} onNavigate={setPage} />}
          {page === "tickets"   && <Tickets   tickets={tickets} setTickets={setTickets} />}
          {page === "customers" && <Customers tickets={tickets} />}
          {page === "analytics" && <Analytics tickets={tickets} />}
          {page === "settings"  && <Settings  context={contextForm} onSave={handleSaveContext} />}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F6FA", fontFamily: "'Plus Jakarta Sans', sans-serif", gap: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0F1117", marginBottom: 4 }}>Loading SupportAI</div>
        <div style={{ fontSize: 14, color: "#9CA3AF" }}>Connecting to database…</div>
      </div>
      <div style={{ width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F6FA", fontFamily: "'Plus Jakarta Sans', sans-serif", gap: 12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ fontSize: 34 }}>⚠️</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#0F1117" }}>Database connection failed</div>
      <div style={{ fontSize: 14, color: "#6B7280", maxWidth: 340, textAlign: "center" }}>{message}</div>
      <button onClick={() => window.location.reload()} style={{ background: "#6366F1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Try again</button>
    </div>
  );
}

function InboxIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function TicketIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>; }
function UsersIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ChartIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function GearIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
