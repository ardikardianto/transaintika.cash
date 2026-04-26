import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getRuntimeEnv() {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) return import.meta.env;
  } catch {
    // Some preview/sandbox environments do not expose import.meta.env.
  }

  if (typeof window !== "undefined" && window.__SUPABASE_CONFIG__) {
    return window.__SUPABASE_CONFIG__;
  }

  return {};
}

const runtimeEnv = getRuntimeEnv();
const SUPABASE_URL = runtimeEnv.VITE_SUPABASE_URL || runtimeEnv.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = runtimeEnv.VITE_SUPABASE_ANON_KEY || runtimeEnv.SUPABASE_ANON_KEY || "";
const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = HAS_SUPABASE_CONFIG ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const categories = {
  Income: ["Translation Project", "Proofreading", "Interpreting", "Subtitling", "Consulting", "Other Income"],
  Expense: ["Freelancer Payment", "Software Subscription", "Marketing", "Office/Admin", "Tax", "Bank Fee", "Other Expense"],
};

const demoTransactions = [
  ["2026-01-08", "Income", "Translation Project", "PT Nusantara Media", "Legal contract translation package", 6800000, "Paid"],
  ["2026-01-15", "Expense", "Freelancer Payment", "Freelance Translator A", "Translator fee for legal contract project", 2300000, "Paid"],
  ["2026-02-04", "Income", "Proofreading", "CV Global Edu", "Academic article proofreading package", 4200000, "Paid"],
  ["2026-02-12", "Expense", "Software Subscription", "CAT Tool Subscription", "Monthly translation software subscription", 850000, "Paid"],
  ["2026-02-20", "Expense", "Marketing", "Social Media Ads", "Campaign for sworn translation services", 1200000, "Paid"],
  ["2026-03-03", "Income", "Interpreting", "International Webinar Organizer", "Consecutive interpreting service", 9500000, "Paid"],
  ["2026-03-09", "Expense", "Freelancer Payment", "Interpreter Partner", "Interpreter partner fee", 3500000, "Paid"],
  ["2026-03-19", "Income", "Subtitling", "Creative Studio ID", "Subtitle translation for training videos", 3800000, "Pending"],
  ["2026-04-02", "Income", "Translation Project", "PT Global Health", "Medical brochure translation", 7200000, "Paid"],
  ["2026-04-08", "Expense", "Freelancer Payment", "Freelance Translator B", "Medical translator fee", 2800000, "Paid"],
  ["2026-04-17", "Expense", "Office/Admin", "Admin Operations", "Document handling and admin cost", 650000, "Paid"],
  ["2026-05-05", "Income", "Consulting", "University Language Center", "Translation workflow consulting", 10500000, "Paid"],
  ["2026-05-10", "Expense", "Tax", "Tax Provision", "Estimated monthly tax allocation", 1250000, "Paid"],
  ["2026-05-18", "Income", "Translation Project", "Law Office Partner", "Sworn translation batch", 4800000, "Pending"],
].map(([date, type, category, client, description, amount, status]) => ({ date, type, category, client, description, amount, status }));

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: "Income",
    category: "Translation Project",
    client: "",
    description: "",
    amount: "",
    status: "Paid",
  };
}

function calculateSummary(transactions) {
  const paidIncome = transactions.filter((t) => t.type === "Income" && t.status === "Paid").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const paidExpenses = transactions.filter((t) => t.type === "Expense" && t.status === "Paid").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pending = transactions.filter((t) => t.status === "Pending").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return { paidIncome, paidExpenses, net: paidIncome - paidExpenses, pending };
}

function calculateMonthlyData(transactions) {
  const map = {};
  transactions.forEach((t) => {
    if (!t.date || t.status !== "Paid") return;
    const month = t.date.slice(0, 7);
    if (!map[month]) map[month] = { month, Income: 0, Expense: 0 };
    map[month][t.type] += Number(t.amount || 0);
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function calculateCategoryData(transactions) {
  const map = {};
  transactions.forEach((t) => {
    if (t.status !== "Paid") return;
    const category = t.category || "Uncategorized";
    map[category] = (map[category] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function cleanTransaction(row) {
  const type = row.type === "Expense" ? "Expense" : "Income";
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    type,
    category: row.category || (type === "Expense" ? "Other Expense" : "Other Income"),
    client: row.client || "",
    description: row.description || "",
    amount: Number(row.amount || 0),
    status: row.status === "Pending" ? "Pending" : "Paid",
    created_at: row.created_at,
  };
}

function runLogicTests() {
  const testData = [
    { type: "Income", status: "Paid", amount: 1000, date: "2026-04-01", category: "Translation Project" },
    { type: "Expense", status: "Paid", amount: 400, date: "2026-04-02", category: "Freelancer Payment" },
    { type: "Income", status: "Pending", amount: 700, date: "2026-04-03", category: "Proofreading" },
    { type: "Expense", status: "Pending", amount: 100, date: "2026-04-04", category: "Software Subscription" },
  ];
  const summary = calculateSummary(testData);
  console.assert(summary.paidIncome === 1000, "Test failed: paid income should be 1000");
  console.assert(summary.paidExpenses === 400, "Test failed: paid expenses should be 400");
  console.assert(summary.net === 600, "Test failed: net should be 600");
  console.assert(summary.pending === 800, "Test failed: pending should be 800");
  const monthly = calculateMonthlyData(testData);
  console.assert(monthly.length === 1, "Test failed: monthly should have one row");
  console.assert(monthly[0].Income === 1000, "Test failed: monthly income should be 1000");
  console.assert(monthly[0].Expense === 400, "Test failed: monthly expense should be 400");
  const categoryRows = calculateCategoryData(testData);
  console.assert(categoryRows.length === 2, "Test failed: only paid categories should be counted");
  const empty = calculateSummary([]);
  console.assert(empty.net === 0 && empty.pending === 0, "Test failed: empty summary should be zero");
  const cleaned = cleanTransaction({ type: "Expense", amount: "1500", status: "Unknown" });
  console.assert(cleaned.amount === 1500, "Test failed: amount string should become number");
  console.assert(cleaned.status === "Paid", "Test failed: unknown status should default to Paid");
  console.assert(getRuntimeEnv() && typeof getRuntimeEnv() === "object", "Test failed: runtime env should safely return an object");
  console.assert(cleanTransaction({ type: "Income", amount: null, status: "Pending" }).amount === 0, "Test failed: null amount should become 0");
}

runLogicTests();

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100";
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function AppButton({ children, onClick, type = "button", variant = "primary", className = "", disabled = false }) {
  const base = "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const style = variant === "outline" ? "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100" : "bg-black text-white hover:bg-slate-800";
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${style} ${className}`}>{children}</button>;
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{rupiah.format(value)}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-lg font-black text-white">{icon}</div>
      </div>
    </div>
  );
}

function SetupScreen() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 text-3xl font-black uppercase leading-tight tracking-[0.18em] text-slate-900 md:text-5xl">
          TranSaintika <span className="block text-slate-500 md:inline">Language Services</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold">Supabase setup required</h1>
        <p className="mt-2 text-slate-600">This version stores real data online. In a Vite project, add these variables to your local .env file before running the app.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-white">{`VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`}</pre>
        <p className="mt-4 text-sm text-slate-500">Then install the client package: <code className="rounded bg-slate-100 px-2 py-1">npm install @supabase/supabase-js</code></p>
        <p className="mt-3 text-sm text-slate-500">In a non-Vite sandbox, you can also expose <code className="rounded bg-slate-100 px-2 py-1">window.__SUPABASE_CONFIG__</code> with <code className="rounded bg-slate-100 px-2 py-1">SUPABASE_URL</code> and <code className="rounded bg-slate-100 px-2 py-1">SUPABASE_ANON_KEY</code>.</p>
      </div>
    </main>
  );
}

function AuthScreen({ onNotice }) {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const authCall = mode === "signUp"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });
      const { error } = await authCall;
      if (error) throw error;
      onNotice(mode === "signUp" ? "Account created." : "Signed in.");
    } catch (error) {
      onNotice(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <nav className="mx-auto flex max-w-4xl items-center justify-between rounded-full border border-slate-200 bg-white px-8 py-4 shadow-sm">
          <div className="text-3xl font-black tracking-tight">TranSaintika</div>
          <div className="hidden gap-10 text-sm font-medium md:flex">
            <span>Finance Dashboard</span>
          </div>
          <div className="rounded-full bg-black px-7 py-3 text-sm font-semibold text-white">
            Login
          </div>
        </nav>

        <section className="grid min-h-[78vh] items-center gap-12 py-16 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
              Malang, Indonesia · English & Indonesian
            </div>

            <h1 className="text-6xl font-black leading-[0.95] tracking-tight md:text-8xl">
              TranSaintika
              <span className="block">Language Services</span>
            </h1>

            <p className="mt-5 text-2xl text-slate-600 md:text-3xl">
              Secure finance dashboard for translation operations.
            </p>

            <p className="mt-10 max-w-lg text-xl leading-relaxed text-slate-500">
              Manage projects, cashflow, freelancer payments, and invoices in one protected workspace. Sign in to access your agency dashboard.
            </p>

            
          </div>

          <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <div className="rounded-[1.75rem] border border-slate-200 p-8">
              <div className="border-t pt-8">
                <h3 className="mb-6 text-4xl font-black">{mode === "signIn" ? "Sign in" : "Create Account"}</h3>
                <form onSubmit={submit} className="space-y-5">
                  <Field label="Email">
                    <input
                      className={inputClass()}
                      type="email"
                      value={email}
                      onChange={(e)=>setEmail(e.target.value)}
                      required
                    />
                  </Field>

                  <Field label="Password">
                    <input
                      className={inputClass()}
                      type="password"
                      value={password}
                      minLength="6"
                      onChange={(e)=>setPassword(e.target.value)}
                      required
                    />
                  </Field>

                  <AppButton type="submit" disabled={loading} className="w-full !rounded-full !py-4 !text-base">
                    {loading ? "Working..." : mode === "signIn" ? "Sign in" : "Create Account"}
                  </AppButton>
                </form>

                <button
                  onClick={()=>setMode(mode === "signIn" ? "signUp" : "signIn")}
                  className="mt-6 text-base font-semibold underline text-slate-600"
                >
                  {mode === "signIn"
                    ? "Need an account? Create one"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SimpleBarChart({ data }) {
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.Income, item.Expense]));
  if (data.length === 0) return <div className="flex min-h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No paid transactions yet.</div>;
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="space-y-5">
        {data.map((item) => (
          <div key={item.month} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-slate-800">{item.month}</div>
            {[["Income", item.Income, "bg-slate-900"], ["Expense", item.Expense, "bg-slate-400"]].map(([label, value, color]) => (
              <div key={label} className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[80px_1fr_130px] md:items-center md:gap-3">
                <span className="text-sm text-slate-500">{label}</span>
                <div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (value / maxValue) * 100)}%` }} /></div>
                <span className="text-sm font-semibold text-slate-800 md:text-right">{rupiah.format(value)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CashflowLineChart({ data }) {
  const points = data.map((item) => ({ month: item.month, net: Number(item.Income || 0) - Number(item.Expense || 0) }));
  if (points.length === 0) return <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No cashflow data yet.</div>;
  if (points.length === 1) return <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-slate-50 text-center"><div className="text-sm text-slate-500">Net cashflow for {points[0].month}</div><div className="mt-2 text-3xl font-black text-slate-900">{rupiah.format(points[0].net)}</div></div>;

  const width = 800, height = 280, padding = 42;
  const minNet = Math.min(...points.map((p) => p.net), 0);
  const maxNet = Math.max(...points.map((p) => p.net), 0);
  const range = maxNet - minNet || 1;
  const coordinates = points.map((point, index) => ({ ...point, x: padding + (index / (points.length - 1)) * (width - padding * 2), y: height - padding - ((point.net - minNet) / range) * (height - padding * 2) }));
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const zeroY = height - padding - ((0 - minNet) / range) * (height - padding * 2);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full overflow-visible">
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} className="stroke-slate-300" strokeWidth="2" strokeDasharray="6 6" />
        <path d={path} fill="none" className="stroke-slate-900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => <g key={point.month}><circle cx={point.x} cy={point.y} r="6" className="fill-white stroke-slate-900" strokeWidth="3" /><text x={point.x} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[18px] font-semibold">{point.month.slice(5)}</text><text x={point.x} y={point.y - 14} textAnchor="middle" className="fill-slate-700 text-[16px] font-bold">{rupiah.format(point.net).replace("Rp", "")}</text></g>)}
      </svg>
      <div className="mt-2 text-xs text-slate-500">Net cashflow = paid income minus paid expenses</div>
    </div>
  );
}

function CategoryBreakdown({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (data.length === 0) return <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No paid categories yet.</div>;
  return <div className="space-y-3">{data.map((item) => { const percent = total ? Math.round((item.value / total) * 100) : 0; return <div key={item.name}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{item.name}</span><span className="text-slate-500">{percent}%</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-slate-800" style={{ width: `${Math.max(2, percent)}%` }} /></div><div className="mt-1 text-xs text-slate-500">{rupiah.format(item.value)}</div></div>; })}</div>;
}

export default function CashflowTrackerTranslationAgency() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user) fetchTransactions();
    if (!session?.user) setTransactions([]);
  }, [session?.user?.id]);

  async function fetchTransactions() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      setTransactions((data || []).map(cleanTransaction));
    } catch (error) {
      setNotice(error.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!supabase) return setNotice("Supabase is not configured.");
    if (!session?.user) return setNotice("Please sign in first.");
    if (!form.date || !form.category || !amount || amount <= 0) return setNotice("Please enter a valid date, category, and amount greater than zero.");

    setLoading(true);
    try {
      const payload = { ...form, amount, user_id: session.user.id };
      const { data, error } = await supabase.from("transactions").insert(payload).select().single();
      if (error) throw error;
      setTransactions((prev) => [cleanTransaction(data), ...prev]);
      setForm(emptyForm());
      setNotice("Transaction saved online.");
    } catch (error) {
      setNotice(error.message || "Failed to add transaction.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTransaction(id) {
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions((prev) => prev.filter((item) => item.id !== id));
      setNotice("Transaction deleted.");
    } catch (error) {
      setNotice(error.message || "Failed to delete transaction.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDemoData() {
    if (!supabase || !session?.user) return;
    setLoading(true);
    try {
      const rows = demoTransactions.map((item) => ({ ...item, user_id: session.user.id }));
      const { data, error } = await supabase.from("transactions").insert(rows).select();
      if (error) throw error;
      setTransactions((prev) => [...(data || []).map(cleanTransaction), ...prev]);
      setNotice("Demo data saved online.");
    } catch (error) {
      setNotice(error.message || "Failed to load demo data.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setTransactions([]);
    setNotice("Signed out.");
  }

  function handleTypeChange(type) {
    setForm((prev) => ({ ...prev, type, category: categories[type][0] }));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translation-agency-cashflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => transactions.filter((item) => typeFilter === "All" || item.type === typeFilter).filter((item) => statusFilter === "All" || item.status === statusFilter).filter((item) => `${item.date} ${item.type} ${item.category} ${item.client} ${item.description} ${item.status}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions, query, typeFilter, statusFilter]);
  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const monthlyData = useMemo(() => calculateMonthlyData(transactions), [transactions]);
  const categoryData = useMemo(() => calculateCategoryData(transactions), [transactions]);

  if (!HAS_SUPABASE_CONFIG) return <SetupScreen />;
  if (!authReady) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading authentication...</main>;
  if (!session) return <AuthScreen onNotice={setNotice} />;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 md:px-10">
        <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-slate-200 bg-white px-8 py-4 shadow-sm">
          <div className="text-3xl font-black tracking-tight">TranSaintika</div>
          <div className="hidden gap-10 text-sm font-medium md:flex">
            <span>Dashboard</span>
            <span>Cashflow</span>
            <span>Transactions</span>
          </div>
          <AppButton onClick={signOut}>Sign out</AppButton>
        </nav>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
                Online finance workspace · Supabase secured
              </div>
              <h1 className="text-5xl font-black uppercase leading-[0.95] tracking-[0.18em] text-slate-950 md:text-7xl">
                TranSaintika
                <span className="block text-slate-500">Finance Dashboard</span>
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-500">
                Track income, expenses, pending payments, and project cashflow for translation operations.
              </p>
              <p className="mt-3 text-sm text-slate-500">Signed in as {session.user.email}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <AppButton onClick={exportJson} variant="outline">Export JSON</AppButton>
              <AppButton onClick={loadDemoData} variant="outline" disabled={loading}>Load Demo Data</AppButton>
              <AppButton onClick={fetchTransactions} variant="outline" disabled={loading}>Refresh</AppButton>
            </div>
          </div>
        </section>

        {notice && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{notice}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Paid Income" value={summary.paidIncome} icon="↗" />
          <StatCard label="Paid Expenses" value={summary.paidExpenses} icon="↘" />
          <StatCard label="Net Cashflow" value={summary.net} icon="◼" />
          <StatCard label="Pending Amount" value={summary.pending} icon="…" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight">Cashflow Dashboard</h2>
          <p className="mb-4 text-sm text-slate-500">Net cashflow trend over time based on paid income and paid expenses.</p>
          <CashflowLineChart data={monthlyData} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="mb-5 text-2xl font-black tracking-tight">Add Transaction</h2>
            <form onSubmit={addTransaction} className="space-y-3">
              <Field label="Date"><input className={inputClass()} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Type"><select className={inputClass()} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}><option>Income</option><option>Expense</option></select></Field>
              <Field label="Category"><select className={inputClass()} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories[form.type].map((category) => <option key={category}>{category}</option>)}</select></Field>
              <Field label="Client / Vendor"><input className={inputClass()} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} /></Field>
              <Field label="Description"><input className={inputClass()} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Amount in IDR"><input className={inputClass()} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Status"><select className={inputClass()} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Paid</option><option>Pending</option></select></Field>
              <AppButton type="submit" className="w-full" disabled={loading}>{loading ? "Saving..." : "Add Transaction"}</AppButton>
            </form>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm lg:col-span-2"><h2 className="mb-5 text-2xl font-black tracking-tight">Monthly Overview</h2><SimpleBarChart data={monthlyData} /></div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-black tracking-tight">Transactions</h2>
              <div className="flex flex-col gap-2 md:flex-row">
                <input className={inputClass()} placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
                <select className={inputClass()} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All</option><option>Income</option><option>Expense</option></select>
                <select className={inputClass()} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option>Paid</option><option>Pending</option></select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-slate-500"><tr><th className="py-3 pr-4">Date</th><th className="pr-4">Type</th><th className="pr-4">Category</th><th className="pr-4">Client/Vendor</th><th className="pr-4">Status</th><th className="pr-4 text-right">Amount</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3 pr-4">{item.date}</td><td className="pr-4">{item.type}</td><td className="pr-4">{item.category}</td><td className="pr-4"><div className="font-medium">{item.client || "—"}</div><div className="max-w-xs truncate text-xs text-slate-500">{item.description}</div></td><td className="pr-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status}</span></td><td className="pr-4 text-right font-semibold">{rupiah.format(Number(item.amount || 0))}</td><td className="text-right"><button onClick={() => deleteTransaction(item.id)} className="rounded-lg px-3 py-1 text-lg font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Delete transaction">×</button></td></tr>)}
                  {filtered.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-slate-500">No transactions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><h2 className="mb-5 text-2xl font-black tracking-tight">Category Breakdown</h2><CategoryBreakdown data={categoryData} /><p className="mt-5 text-sm text-slate-500">Data is stored online in Supabase and filtered by your authenticated user account.</p></div>
        </section>
      </div>
    </main>
  );
}
