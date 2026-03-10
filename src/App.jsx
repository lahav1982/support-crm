import { useState, useEffect } from "react";
import { fetchTickets, fetchSettings, saveSettings, rowToTicket, rowToSettings, fetchGmailStatus, disconnectGmail } from "./lib/supabase.js";
import Inbox from "./pages/Inbox.jsx";
import Tickets from "./pages/Tickets.jsx";
import Customers from "./pages/Customers.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings, { buildPrompt } from "./pages/Settings.jsx";
import Insights from "./pages/Insights.jsx";

const NAV = [
  { id: "inbox",     label: "Inbox",     icon: <InboxIcon /> },
  { id: "tickets",   label: "Tickets",   icon: <TicketIcon /> },
  { id: "customers", label: "Customers", icon: <UsersIcon /> },
  { id: "analytics", label: "Analytics", icon: <ChartIcon /> },
  { id: "insights",  label: "Insights",  icon: <InsightsIcon /> },
  { id: "settings",  label: "Settings",  icon: <GearIcon /> },
];

const EMPTY_CONTEXT = {
  companyName: "", products: "", refundPolicy: "",
  shippingPolicy: "", tone: "", extraInfo: "",
  gmailFilterKeywords: "", gmailFilterDomains: "",
};

export default function App() {
  const [page, setPage] = useState("inbox");
  const [tickets, setTickets] = useState([]);
  const [contextForm, setContextForm] = useState(EMPTY_CONTEXT);
  const [savedContext, setSavedContext] = useState(EMPTY_CONTEXT);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gmailToast, setGmailToast] = useState(null); // "connected" | "error" | null

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      // Check auth first
      try {
        const authRes = await fetch("/api/auth-check");
        if (!authRes.ok) { setLoading(false); return; } // not authed — show login
        setAuthed(true);
      } catch(e) { setLoading(false); return; }

      // Check for OAuth redirect BEFORE rendering anything
      const urlParams = new URLSearchParams(window.location.search);
      const gmailConnected = urlParams.get("gmail_connected");
      const gmailError     = urlParams.get("gmail_error");

      if (gmailConnected === "1" || gmailError) {
        // Clean URL immediately
        window.history.replaceState({}, "", "/");
        if (gmailError) {
          setGmailToast({ type: "error", msg: decodeURIComponent(gmailError) });
        }
      }

      try {
        const [ticketRows, settingsRow, gmail] = await Promise.all([
          fetchTickets(),
          fetchSettings(),
          fetchGmailStatus(),
        ]);

        setTickets((ticketRows || []).map(rowToTicket));
        const ctx = rowToSettings(settingsRow);
        setContextForm(ctx);
        setSavedContext(ctx);
        setGmailStatus(gmail || { connected: false, email: null });

        // Show success toast if we just came back from OAuth
        if (gmailConnected === "1") {
          if (gmail?.connected) {
            setGmailToast({ type: "success", msg: "Gmail connected! Set your sync filters in Settings, then click Sync in the Inbox." });
          } else {
            setGmailToast({ type: "error", msg: "Gmail auth completed but connection not saved. Check your SUPABASE_SERVICE_KEY in Vercel." });
          }
        }
      } catch (e) {
        setError("Could not connect to database. Check your Supabase setup.");
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!gmailToast) return;
    const t = setTimeout(() => setGmailToast(null), 8000);
    return () => clearTimeout(t);
  }, [gmailToast]);

  const emailCount  = tickets.filter(t => t.type !== "ticket" && t.status === "open").length;
  const ticketCount = tickets.filter(t => t.type === "ticket" && (t.status === "open" || t.status === "in progress")).length;
  const hasContext  = Object.values(savedContext).filter(v => typeof v === "string").some(v => v.trim());
  const businessContextPrompt = buildPrompt(savedContext);

  async function handleRefreshTickets() {
    try {
      const rows = await fetchTickets();
      setTickets((rows || []).map(rowToTicket));
    } catch(e) { console.error("Refresh failed", e); }
  }

  async function handleDisconnectGmail() {
    await disconnectGmail();
    setGmailStatus({ connected: false, email: null });
    setGmailToast({ type: "info", msg: "Gmail disconnected." });
  }

  async function handleSaveContext(form) {
    await saveSettings(form);
    setSavedContext({ ...form });
    setContextForm({ ...form });
  }

  if (loading) return <LoadingScreen />;
  if (!authed) return <LoginScreen onLogin={() => { setAuthed(true); window.location.reload(); }} />;
  if (error)   return <ErrorScreen message={error} />;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#F5F6FA", color: "#0F1117", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E5ED; border-radius: 10px; }
        input, textarea, select, button { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Gmail toast notification */}
      {gmailToast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, animation: "slideDown 0.25s ease",
          background: gmailToast.type === "success" ? "#F0FDF4" : gmailToast.type === "error" ? "#FEF2F2" : "#EFF6FF",
          border: `1px solid ${gmailToast.type === "success" ? "#BBF7D0" : gmailToast.type === "error" ? "#FECACA" : "#BFDBFE"}`,
          color: gmailToast.type === "success" ? "#15803D" : gmailToast.type === "error" ? "#DC2626" : "#1D4ED8",
          borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 480, textAlign: "center",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{gmailToast.type === "success" ? "✓" : gmailToast.type === "error" ? "⚠" : "ℹ"}</span>
          <span>{gmailToast.msg}</span>
          <button onClick={() => setGmailToast(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.5, marginLeft: 4, padding: 0 }}>×</button>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: 220, background: "#fff", borderRight: "1px solid #EAECF0", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 2, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 20px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>SupportAI</span>
        </div>

        {/* Nav */}
        {NAV.map(n => {
          const isActive = page === n.id;
          const badge = n.id === "inbox" ? emailCount : n.id === "tickets" ? ticketCount : 0;
          return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: isActive ? "#F0EFFE" : "transparent", color: isActive ? "#6366F1" : "#6B7280", cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 500, transition: "all 0.12s", textAlign: "left" }}>
              <span style={{ color: isActive ? "#6366F1" : "#9CA3AF", display: "flex" }}>{n.icon}</span>
              {n.label}
              {badge > 0 && (
                <span style={{ marginLeft: "auto", background: n.id === "tickets" ? "#EFF6FF" : "#FEF2F2", color: n.id === "tickets" ? "#3B82F6" : "#EF4444", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{badge}</span>
              )}
              {n.id === "settings" && !hasContext && (
                <span style={{ marginLeft: "auto", width: 7, height: 7, background: "#F59E0B", borderRadius: "50%", display: "inline-block" }} />
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Status dots */}
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 7, height: 7, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>DB Connected</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 7, height: 7, background: gmailStatus.connected ? "#3B82F6" : "#D1D5DB", borderRadius: "50%", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: gmailStatus.connected ? "#3B82F6" : "#9CA3AF" }}>
              {gmailStatus.connected ? "Gmail Connected" : "Gmail Not Connected"}
            </span>
          </div>
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: "1px solid #EAECF0" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Y</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1117" }}>You</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>Admin</div>
          </div>
          <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.reload(); }}
            title="Log out"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, display: "flex", alignItems: "center", borderRadius: 6, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #EAECF0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0F1117", letterSpacing: "-0.4px" }}>{NAV.find(n => n.id === page)?.label}</span>
            {page === "inbox"   && emailCount  > 0 && <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{emailCount} open</span>}
            {page === "tickets"  && ticketCount > 0 && <span style={{ background: "#EFF6FF", color: "#3B82F6", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>{ticketCount} active</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {page === "inbox" && (
              hasContext
                ? <span style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, background: "#22C55E", borderRadius: "50%", display: "inline-block" }} />AI context active
                  </span>
                : <button onClick={() => setPage("settings")} style={{ background: "#FFFBEB", color: "#D97706", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 12px", border: "1px solid #FDE68A", cursor: "pointer" }}>
                    ⚠ Set up AI context
                  </button>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
          {page === "inbox"     && <Inbox     tickets={tickets} setTickets={setTickets} businessContext={businessContextPrompt} onNavigate={setPage} gmailStatus={gmailStatus} onRefresh={handleRefreshTickets} />}
          {page === "tickets"   && <Tickets   tickets={tickets} setTickets={setTickets} />}
          {page === "customers" && <Customers tickets={tickets} />}
          {page === "analytics" && <Analytics tickets={tickets} />}
          {page === "insights"  && <Insights  tickets={tickets} onNavigate={setPage} />}
          {page === "settings"  && <Settings  context={contextForm} onSave={handleSaveContext} gmailStatus={gmailStatus} onDisconnectGmail={handleDisconnectGmail} />}
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
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1117", marginBottom: 4 }}>Loading SupportAI</div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>Connecting to database…</div>
      </div>
      <div style={{ width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F6FA", fontFamily: "'Plus Jakarta Sans', sans-serif", gap: 12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0F1117" }}>Database connection failed</div>
      <div style={{ fontSize: 12, color: "#6B7280", maxWidth: 340, textAlign: "center" }}>{message}</div>
      <button onClick={() => window.location.reload()} style={{ background: "#6366F1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Try again</button>
    </div>
  );
}

function InboxIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function TicketIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>; }
function UsersIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ChartIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function InsightsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>; }
function GearIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

function LoginScreen({ onLogin }) {
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin();
      } else {
        setError(data.error || "Incorrect password");
        setLoading(false);
      }
    } catch(e) {
      setError("Could not connect. Check your internet connection.");
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #F5F6FA 0%, #EEF0F8 100%)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ background: "#fff", borderRadius: 20, padding: "44px 40px", width: 380, boxShadow: "0 8px 48px rgba(99,102,241,0.12)", animation: "fadeUp 0.35s ease" }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F1117", margin: "0 0 4px", letterSpacing: "-0.5px" }}>SupportAI</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Sign in to your support dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Password</label>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              autoFocus
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your password"
              style={{ width: "100%", padding: "12px 42px 12px 14px", fontSize: 15, border: error ? "1.5px solid #FCA5A5" : "1.5px solid #E5E7EB", borderRadius: 10, outline: "none", fontFamily: "inherit", color: "#0F1117", background: "#FAFAFA", transition: "border 0.15s" }}
              onFocus={e => { if (!error) e.target.style.borderColor = "#6366F1"; }}
              onBlur={e  => { if (!error) e.target.style.borderColor = "#E5E7EB"; }}
            />
            <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, display: "flex" }}>
              {showPass
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#DC2626", fontWeight: 600, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !password.trim()}
            style={{ width: "100%", background: loading || !password.trim() ? "#E5E7EB" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: loading || !password.trim() ? "#9CA3AF" : "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading || !password.trim() ? "not-allowed" : "pointer", transition: "all 0.15s", letterSpacing: "-0.2px", marginTop: error ? 0 : 4 }}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "#D1D5DB", marginTop: 24, marginBottom: 0 }}>
          🔒 Protected with end-to-end security
        </p>
      </div>
    </div>
  );
}
