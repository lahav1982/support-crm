// lib/supabase.js -- all database operations

const SUPABASE_URL = "https://uwevfftqolotauwimjyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZXZmZnRxb2xvdGF1d2ltanloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA5NTMsImV4cCI6MjA4ODU1Njk1M30.kLGq0NN25OZbWExx10rg_RBh90rCytVYacAwKKHzLwY";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
};

// Fixed: extraHeaders merged AFTER spread so they add to base headers, not replace them
async function query(path, options) {
  var opts = options || {};
  var extraHeaders = opts.headers || {};
  var fetchOptions = {
    method: opts.method || "GET",
    headers: Object.assign({}, BASE_HEADERS, extraHeaders),
  };
  if (opts.body !== undefined) fetchOptions.body = opts.body;

  var res = await fetch(SUPABASE_URL + "/rest/v1/" + path, fetchOptions);
  if (!res.ok) {
    var err = await res.text();
    throw new Error("Supabase error: " + err);
  }
  var text = await res.text();
  return text ? JSON.parse(text) : null;
}

// TICKETS

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
      status:         ticket.status   || "open",
      priority:       ticket.priority || "medium",
      tag:            ticket.tag      || "General",
      assigned_to:    ticket.assignedTo || 1,
      notes:          ticket.notes   || "",
      replies:        ticket.replies || [],
      type:           ticket.type    || "email",
    }),
  });
}

export async function updateTicket(id, changes) {
  var mapped = {};
  if (changes.status     !== undefined) mapped.status      = changes.status;
  if (changes.priority   !== undefined) mapped.priority    = changes.priority;
  if (changes.assignedTo !== undefined) mapped.assigned_to = changes.assignedTo;
  if (changes.notes      !== undefined) mapped.notes       = changes.notes;
  if (changes.replies    !== undefined) mapped.replies     = changes.replies;

  var res = await fetch(SUPABASE_URL + "/rest/v1/tickets?id=eq." + id, {
    method: "PATCH",
    headers: Object.assign({}, BASE_HEADERS, { "Prefer": "return=representation" }),
    body: JSON.stringify(mapped),
  });

  if (!res.ok) {
    var err = await res.text();
    throw new Error("updateTicket failed: " + err);
  }
  var text = await res.text();
  return text ? JSON.parse(text) : null;
}

// CUSTOMERS

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

// SETTINGS

export async function fetchSettings() {
  var rows = await query("settings?id=eq.1&select=*");
  return rows && rows[0] ? rows[0] : null;
}

export async function saveSettings(ctx) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/settings", {
    method: "POST",
    headers: Object.assign({}, BASE_HEADERS, {
      "Prefer": "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify({
      id:              1,
      company_name:    ctx.companyName    || "",
      products:        ctx.products       || "",
      refund_policy:   ctx.refundPolicy   || "",
      shipping_policy: ctx.shippingPolicy || "",
      tone:            ctx.tone           || "",
      extra_info:      ctx.extraInfo      || "",
      gmail_filter_keywords: ctx.gmailFilterKeywords || "",
      gmail_filter_domains:  ctx.gmailFilterDomains  || "",
    }),
  });

  if (!res.ok) {
    var err = await res.text();
    throw new Error("saveSettings failed: " + err);
  }
  var text = await res.text();
  return text ? JSON.parse(text) : null;
}

// HELPERS

export function rowToTicket(row) {
  return {
    id:              row.id,
    customerId:      row.customer_id,
    customerName:    row.customer_name,
    customerEmail:   row.customer_email,
    subject:         row.subject,
    body:            row.body,
    status:          row.status,
    priority:        row.priority,
    tag:             row.tag,
    assignedTo:      row.assigned_to,
    notes:           row.notes   || "",
    replies:         row.replies || [],
    type:            row.type    || "email",
    gmailMessageId:  row.gmail_message_id  || null,
    gmailThreadId:   row.gmail_thread_id   || null,
    date:            new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time:            new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    timestamp:       new Date(row.created_at).getTime(),
  };
}

export function rowToSettings(row) {
  if (!row) return { companyName: "", products: "", refundPolicy: "", shippingPolicy: "", tone: "", extraInfo: "" };
  return {
    companyName:          row.company_name          || "",
    products:             row.products              || "",
    refundPolicy:         row.refund_policy         || "",
    shippingPolicy:       row.shipping_policy       || "",
    tone:                 row.tone                  || "",
    extraInfo:            row.extra_info            || "",
    gmailFilterKeywords:  row.gmail_filter_keywords || "",
    gmailFilterDomains:   row.gmail_filter_domains  || "",
  };
}

// GMAIL STATUS

export async function fetchGmailStatus() {
  var rows = await query("settings?id=eq.1&select=gmail_connected,gmail_email,gmail_filter_keywords,gmail_filter_domains");
  var row = rows && rows[0] ? rows[0] : {};
  return {
    connected:       row.gmail_connected        || false,
    email:           row.gmail_email            || null,
    filterKeywords:  row.gmail_filter_keywords  || "",
    filterDomains:   row.gmail_filter_domains   || "",
  };
}

export async function disconnectGmail() {
  var res = await fetch(SUPABASE_URL + "/rest/v1/settings?id=eq.1", {
    method: "PATCH",
    headers: Object.assign({}, BASE_HEADERS, { "Prefer": "return=minimal" }),
    body: JSON.stringify({
      gmail_connected:     false,
      gmail_access_token:  null,
      gmail_refresh_token: null,
      gmail_token_expiry:  null,
      gmail_email:         null,
    }),
  });
  if (!res.ok) throw new Error("Disconnect failed");
}
