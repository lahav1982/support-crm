// lib/data.js — mock data store (replace with Supabase later)

export const TEAM = [
  { id: 1, name: "You", avatar: "Y", color: "#6c63ff" },
  { id: 2, name: "Maria", avatar: "M", color: "#f59e2b" },
  { id: 3, name: "James", avatar: "J", color: "#10b981" },
];

export const CUSTOMERS = [
  { id: 1, name: "Sarah Johnson", email: "sarah.johnson@example.com", company: "Johnson & Co", totalTickets: 4, openTickets: 1, lastSeen: "Today" },
  { id: 2, name: "Mike Torres", email: "mike.torres@gmail.com", company: "Personal", totalTickets: 2, openTickets: 1, lastSeen: "Today" },
  { id: 3, name: "Anna Kowalski", email: "anna.k@business.co", company: "Kowalski & Associates", totalTickets: 1, openTickets: 1, lastSeen: "Yesterday" },
  { id: 4, name: "Derek Smith", email: "derek.smith@hotmail.com", company: "Personal", totalTickets: 3, openTickets: 0, lastSeen: "Tuesday" },
  { id: 5, name: "Priya Mehta", email: "priya.m@outlook.com", company: "Mehta Solutions", totalTickets: 2, openTickets: 1, lastSeen: "Monday" },
  { id: 6, name: "Carlos Rivera", email: "carlos.r@techcorp.io", company: "TechCorp", totalTickets: 5, openTickets: 0, lastSeen: "Last week" },
];

export const INITIAL_TICKETS = [
  {
    id: 1, customerId: 1, customerName: "Sarah Johnson", customerEmail: "sarah.johnson@example.com",
    subject: "Order #4821 hasn't arrived yet",
    body: "Hi, I placed an order 2 weeks ago (order #4821) and it still hasn't arrived. I'm getting worried. Can you please check the status? I need it urgently for an event this weekend.",
    time: "10:23 AM", date: "Today", timestamp: Date.now() - 1000 * 60 * 30,
    status: "open", priority: "high", tag: "Shipping", assignedTo: 1,
    notes: "", replies: [],
  },
  {
    id: 2, customerId: 2, customerName: "Mike Torres", customerEmail: "mike.torres@gmail.com",
    subject: "Refund request for damaged product",
    body: "Hello, I received my order yesterday but the product was completely damaged. The packaging was torn and the item inside was broken. I'd like a full refund or replacement. I can send photos if needed.",
    time: "9:05 AM", date: "Today", timestamp: Date.now() - 1000 * 60 * 90,
    status: "open", priority: "high", tag: "Refund", assignedTo: 2,
    notes: "Customer mentioned photos available.", replies: [],
  },
  {
    id: 3, customerId: 3, customerName: "Anna Kowalski", customerEmail: "anna.k@business.co",
    subject: "Bulk order inquiry - 500 units",
    body: "Good morning, I'm reaching out on behalf of Kowalski & Associates. We are interested in placing a bulk order of approximately 500 units for corporate gifting. Could you provide pricing and availability? We'd need delivery by December 15th.",
    time: "Yesterday", date: "Yesterday", timestamp: Date.now() - 1000 * 60 * 60 * 26,
    status: "open", priority: "medium", tag: "Sales", assignedTo: 3,
    notes: "", replies: [],
  },
  {
    id: 4, customerId: 4, customerName: "Derek Smith", customerEmail: "derek.smith@hotmail.com",
    subject: "How do I reset my account password?",
    body: "I've been trying to log in for the past hour but I keep getting an error. I tried the 'forgot password' link but never received the email. Please help!",
    time: "Tuesday", date: "Tuesday", timestamp: Date.now() - 1000 * 60 * 60 * 50,
    status: "resolved", priority: "low", tag: "Account", assignedTo: 1,
    notes: "Resolved via email reset link resend.",
    replies: [{ id: 1, author: "You", body: "Hi Derek, I've resent the password reset link to your inbox. Please check your spam folder too!", timestamp: Date.now() - 1000 * 60 * 60 * 48 }],
  },
  {
    id: 5, customerId: 5, customerName: "Priya Mehta", customerEmail: "priya.m@outlook.com",
    subject: "Wrong item sent — need exchange",
    body: "Hi there, I ordered the blue version of the product but received the red one. The packing slip says blue but the actual item is red. Can you arrange an exchange? I'd prefer not to wait too long as it was a birthday gift.",
    time: "Monday", date: "Monday", timestamp: Date.now() - 1000 * 60 * 60 * 72,
    status: "open", priority: "medium", tag: "Exchange", assignedTo: 2,
    notes: "", replies: [],
  },
  {
    id: 6, customerId: 6, customerName: "Carlos Rivera", customerEmail: "carlos.r@techcorp.io",
    subject: "API integration documentation request",
    body: "Hello, we're trying to integrate your service into our platform and need comprehensive API documentation. Specifically around authentication and rate limits.",
    time: "Last week", date: "Last week", timestamp: Date.now() - 1000 * 60 * 60 * 120,
    status: "resolved", priority: "low", tag: "Technical", assignedTo: 3,
    notes: "Sent docs link.",
    replies: [{ id: 1, author: "James", body: "Hi Carlos, here's our full API documentation: [link]. Let us know if you have questions!", timestamp: Date.now() - 1000 * 60 * 60 * 118 }],
  },
];

export const TAG_COLORS = {
  Shipping:  { bg: "#e8f4fd", text: "#1a6fa3", dot: "#3b9fd6" },
  Refund:    { bg: "#fff0f0", text: "#b03030", dot: "#e05555" },
  Sales:     { bg: "#f0fdf4", text: "#276642", dot: "#4caf7d" },
  Account:   { bg: "#fdf4ff", text: "#7c3aad", dot: "#a855f7" },
  Exchange:  { bg: "#fff8ed", text: "#a05a10", dot: "#f59e2b" },
  Technical: { bg: "#f0f4ff", text: "#1e40af", dot: "#3b82f6" },
};

export const PRIORITY_COLORS = {
  high:   { bg: "#fff0f0", text: "#b03030" },
  medium: { bg: "#fff8ed", text: "#a05a10" },
  low:    { bg: "#f0fdf4", text: "#276642" },
};
