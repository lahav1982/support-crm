// lib/supabase.js — all database operations

const SUPABASE_URL = "https://uwevfftqolotauwimjyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZXZmZnRxb2xvdGF1d2ltanloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA5NTMsImV4cCI6MjA4ODU1Njk1M30.kLGq0NN25OZbWExx10rg_RBh90rCytVYacAwKKHzLwY";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

async function query(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...headers, ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── TICKETS ──────────────────────────────────────────

export async function fetchTickets() {
  return query("tickets?order=created_at.desc&select=*");
}

export async function createTicket(ticket) {
  return query("tickets", {
    method: "POST",
    headers: { "Prefer": "return=representation" },
    body: JSON.stringify({
      customer_id:    ticket.customerId,
      customer_name:  ticket.customerName,
      customer_email: ticket.customerEmail,
      subject:        ticket.subject,
      body:           ticket.body,
      status:         ticket.status || "open",
      priority:       ticket.priority || "medium",
      tag:            ticket.tag || "General",
      assigned_to:    ticket.assignedTo || 1,
      notes:          ticket.notes || "",
      replies:        ticket.replies || [],
      type:           ticket.type || "email",
    }),
  });
}

export async function updateTicket(id, changes) {
  const mapped = {};
  if (changes.status     !== undefined) mapped.status      = changes.status;
  if (changes.priority   !== undefined) mapped.priority    = changes.priority;
  if (changes.assignedTo !== undefined) mapped.assigned_to = changes.assignedTo;
  if (changes.notes      !== undefined) mapped.notes       = changes.notes;
  // Replies must be stored as a JSON string so Supabase treats it as JSONB
  if (changes.replies    !== undefined) mapped.replies     = changes.replies;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tickets?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Prefer": "return=representation",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mapped),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`updateTicket failed: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── CUSTOMERS ─────────────────────────────────────────

export async function fetchCustomers() {
  return query("customers?order=name.asc&select=*");
}

export async function upsertCustomer(customer) {
  return query("customers", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id:      customer.id,
      name:    customer.name,
      email:   customer.email,
      company: customer.company || "Personal",
    }),
  });
}

// ── SETTINGS ──────────────────────────────────────────

export async function fetchSettings() {
  const rows = await query("settings?id=eq.1&select=*");
  return rows?.[0] || null;
}

export async function saveSettings(ctx) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
    method: "POST",
    headers: {
      ...headers,
      "Prefer": "resolution=merge-duplicates,return=representation",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id:              1,
      company_name:    ctx.companyName    || "",
      products:        ctx.products       || "",
      refund_policy:   ctx.refundPolicy   || "",
      shipping_policy: ctx.shippingPolicy || "",
      tone:            ctx.tone           || "",
      extra_info:      ctx.extraInfo      || "",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`saveSettings failed: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── HELPERS ───────────────────────────────────────────

// Convert Supabase snake_case row → camelCase ticket object used in the app
export function rowToTicket(row) {
  return {
    id:            row.id,
    customerId:    row.customer_id,
    customerName:  row.customer_name,
    customerEmail: row.customer_email,
    subject:       row.subject,
    body:          row.body,
    status:        row.status,
    priority:      row.priority,
    tag:           row.tag,
    assignedTo:    row.assigned_to,
    notes:         row.notes || "",
    replies:       row.replies || [],
    type:          row.type || "email",
    date:          new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time:          new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    timestamp:     new Date(row.created_at).getTime(),
  };
}

// Convert Supabase snake_case row → camelCase settings object
export function rowToSettings(row) {
  if (!row) return { companyName: "", products: "", refundPolicy: "", shippingPolicy: "", tone: "", extraInfo: "" };
  return {
    companyName:    row.company_name    || "",
    products:       row.products        || "",
    refundPolicy:   row.refund_policy   || "",
    shippingPolicy: row.shipping_policy || "",
    tone:           row.tone            || "",
    extraInfo:      row.extra_info      || "",
  };
}
