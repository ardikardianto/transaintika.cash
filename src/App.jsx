import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function AppAnimationStyles() {
  return (
    <style>{`
      @keyframes ts-nav-enter {
        from { opacity: 0; transform: translateY(-18px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes ts-hero-rise {
        from { opacity: 0; transform: translateY(30px); filter: blur(10px); }
        to { opacity: 1; transform: translateY(0); filter: blur(0); }
      }

      @keyframes ts-card-float {
        0%, 100% { transform: translateY(0) rotate(var(--float-rotate, 0deg)); }
        50% { transform: translateY(-14px) rotate(calc(var(--float-rotate, 0deg) * -1)); }
      }

      @keyframes ts-bar-grow {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }

      .ts-nav-enter {
        animation: ts-nav-enter 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .ts-hero-rise {
        animation: ts-hero-rise 820ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .ts-hero-delay-1 { animation-delay: 120ms; }
      .ts-hero-delay-2 { animation-delay: 240ms; }
      .ts-hero-delay-3 { animation-delay: 380ms; }
      .ts-hero-delay-4 { animation-delay: 520ms; }

      .ts-float-card {
        animation: ts-hero-rise 760ms cubic-bezier(0.22, 1, 0.36, 1) both, ts-card-float 4.8s ease-in-out 900ms infinite;
      }

      .ts-bar-grow {
        animation: ts-bar-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        transform-origin: left center;
      }

      @media (prefers-reduced-motion: reduce) {
        .ts-nav-enter,
        .ts-hero-rise,
        .ts-float-card,
        .ts-bar-grow {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 1ms !important;
        }
      }
    `}</style>
  );
}

function ScrollReveal({ children, className = "", delay = 0, id, as: Tag = "div" }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || !("IntersectionObserver" in window);
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <Tag
      id={id}
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

function StatCard({ label, value, icon, className = "" }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{rupiah.format(value)}</p>
        </div>
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-black text-base font-black text-white sm:h-11 sm:w-11">{icon}</div>
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

  function scrollToAuthSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    <main className="min-h-screen bg-white text-slate-950">
      <AppAnimationStyles />
      <div className="px-4 py-4 sm:px-6 md:px-8">
        <nav className="ts-nav-enter sticky top-3 z-20 mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white/95 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur sm:px-6 md:min-h-[72px] md:px-8">
          <div className="text-2xl font-black sm:text-3xl md:text-4xl">TranSaintika</div>
          <div className="order-3 flex w-full gap-2 overflow-x-auto rounded-full bg-slate-100 p-1 text-sm font-semibold sm:order-none sm:w-auto">
            <button onClick={() => scrollToAuthSection("login-intro")} className="flex-none rounded-full px-4 py-2 text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">
              Finance Dashboard
            </button>
            <button onClick={() => scrollToAuthSection("login-card")} className="flex-none rounded-full bg-black px-5 py-2 text-white shadow-inner transition hover:bg-slate-800">
              Login
            </button>
          </div>
        </nav>

        <section className="relative mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-8 overflow-hidden py-8 md:py-10 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div className="pointer-events-none absolute inset-x-0 top-10 hidden h-72 rounded-full bg-slate-100 blur-3xl lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            <div className="ts-float-card absolute right-[41%] top-[13%] rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.09)] backdrop-blur" style={{ "--float-rotate": "-4deg", animationDelay: "340ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cashflow</p>
              <p className="mt-1 text-lg font-black text-slate-950">+ IDR 18.5M</p>
            </div>
            <div className="ts-float-card absolute bottom-[19%] left-[44%] rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.09)] backdrop-blur" style={{ "--float-rotate": "5deg", animationDelay: "520ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pending</p>
              <p className="mt-1 text-lg font-black text-slate-950">4 invoices</p>
            </div>
          </div>

          <div id="login-intro" className="max-w-2xl scroll-mt-28">
            <div className="ts-hero-rise ts-hero-delay-1 mb-6 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm sm:text-base md:mb-8">
              Malang, Indonesia · English & Indonesian
            </div>

            <h1 className="ts-hero-rise ts-hero-delay-2 text-[38px] font-black leading-[1.05] text-black sm:text-5xl md:text-6xl lg:text-[64px]">
              TranSaintika
              <span className="block">Language Services</span>
            </h1>

            <p className="ts-hero-rise ts-hero-delay-3 mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl md:text-2xl">
              We can translate what hands can write.
            </p>

            <p className="ts-hero-rise ts-hero-delay-4 mt-6 max-w-xl text-base leading-8 text-slate-500 sm:text-lg md:mt-8">
              Clean, accurate, and reliable translation, editing, and proofreading services for documents written in English and Indonesian.
            </p>

            
          </div>

          <div id="login-card" className="ts-hero-rise ts-hero-delay-3 mx-auto w-full max-w-md scroll-mt-28 rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:px-7 md:max-w-lg md:px-10 md:py-10">
            <h3 className="text-3xl font-black text-black md:text-4xl">{mode === "signIn" ? "Sign in" : "Create Account"}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {mode === "signIn" ? "Welcome back! Please sign in to your account." : "Create an account to access your finance dashboard."}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-5 md:mt-8 md:space-y-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-black sm:text-base">Email</span>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100 sm:h-14">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 flex-none text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  <input
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-black sm:text-base">Password</span>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100 sm:h-14">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 flex-none text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    <path d="M12 15v2" />
                  </svg>
                  <input
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    minLength="6"
                    onChange={(e)=>setPassword(e.target.value)}
                    required
                  />
                </div>
              </label>

              <AppButton type="submit" disabled={loading} className="h-12 w-full !rounded-2xl !py-0 !text-base shadow-inner sm:h-14">
                {loading ? "Working..." : mode === "signIn" ? "Sign in" : "Create Account"}
              </AppButton>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm sm:text-base md:mt-10">
              <span className="text-slate-500">{mode === "signIn" ? "Don’t have an account?" : "Already have an account?"}</span>
              <button
                onClick={()=>setMode(mode === "signIn" ? "signUp" : "signIn")}
                className="font-medium text-black"
              >
                {mode === "signIn" ? "Sign up" : "Sign in"}
              </button>
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
  const sessionUserId = session?.user?.id;

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

  const fetchTransactions = useCallback(async function fetchTransactions() {
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
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (sessionUserId) {
        fetchTransactions();
      } else {
        setTransactions([]);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchTransactions, sessionUserId]);

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

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!HAS_SUPABASE_CONFIG) return <SetupScreen />;
  if (!authReady) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading authentication...</main>;
  if (!session) return <AuthScreen onNotice={setNotice} />;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <AppAnimationStyles />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 md:space-y-6 md:px-8 md:py-6 lg:px-10">
        <nav className="ts-nav-enter sticky top-3 z-20 mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 md:px-8">
          <div className="text-2xl font-black tracking-tight sm:text-3xl">TranSaintika</div>
          <div className="order-3 flex w-full gap-2 overflow-x-auto rounded-full bg-slate-100 p-1 text-sm font-semibold sm:order-none sm:w-auto">
            <button onClick={() => scrollToSection("dashboard-section")} className="flex-none rounded-full px-4 py-2 text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">
              Dashboard
            </button>
            <button onClick={() => scrollToSection("cashflow-section")} className="flex-none rounded-full px-4 py-2 text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">
              Cashflow
            </button>
            <button onClick={() => scrollToSection("transactions-section")} className="flex-none rounded-full px-4 py-2 text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm">
              Transactions
            </button>
          </div>
          <AppButton onClick={signOut} className="!px-5 !py-2.5">Sign out</AppButton>
        </nav>

        <section id="dashboard-section" className="ts-hero-rise ts-hero-delay-1 relative overflow-hidden scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-slate-100 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-8 right-8 hidden w-56 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:block" aria-hidden="true">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live margin</p>
            <p className="mt-2 text-3xl font-black text-slate-950">64%</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="ts-bar-grow h-full w-2/3 rounded-full bg-slate-950" />
            </div>
          </div>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="ts-hero-rise ts-hero-delay-2 mb-4 inline-flex max-w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm sm:text-sm">
                Online finance workspace · Supabase secured
              </div>
              <h1 className="ts-hero-rise ts-hero-delay-3 max-w-4xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl">
                TranSaintika
                <span className="block text-slate-500">Finance Dashboard</span>
              </h1>
              <p className="ts-hero-rise ts-hero-delay-4 mt-4 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                Track income, expenses, pending payments, and project cashflow for translation operations.
              </p>
              <p className="ts-hero-rise ts-hero-delay-4 mt-3 break-words text-sm text-slate-500">Signed in as {session.user.email}</p>
            </div>

            <div className="ts-hero-rise ts-hero-delay-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
              <AppButton onClick={exportJson} variant="outline" className="w-full lg:w-auto">Export JSON</AppButton>
              <AppButton onClick={fetchTransactions} variant="outline" className="w-full lg:w-auto" disabled={loading}>Refresh</AppButton>
              <AppButton onClick={loadDemoData} variant="outline" className="w-full lg:w-auto" disabled={loading}>Load Demo</AppButton>
            </div>
          </div>
        </section>

        {notice && <ScrollReveal className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{notice}</ScrollReveal>}

        <ScrollReveal as="section" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" delay={80}>
          <StatCard label="Paid Income" value={summary.paidIncome} icon="↗" className="transition hover:-translate-y-1 hover:shadow-md" />
          <StatCard label="Paid Expenses" value={summary.paidExpenses} icon="↘" className="transition hover:-translate-y-1 hover:shadow-md" />
          <StatCard label="Net Cashflow" value={summary.net} icon="◼" className="transition hover:-translate-y-1 hover:shadow-md" />
          <StatCard label="Pending Amount" value={summary.pending} icon="…" className="transition hover:-translate-y-1 hover:shadow-md" />
        </ScrollReveal>

        <ScrollReveal as="section" id="cashflow-section" className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm" delay={120}>
          <h2 className="text-2xl font-black tracking-tight">Cashflow Dashboard</h2>
          <p className="mb-4 text-sm text-slate-500">Net cashflow trend over time based on paid income and paid expenses.</p>
          <CashflowLineChart data={monthlyData} />
        </ScrollReveal>

        <ScrollReveal as="section" className="grid gap-6 lg:grid-cols-3" delay={160}>
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
        </ScrollReveal>

        <ScrollReveal as="section" id="transactions-section" className="scroll-mt-28 space-y-6" delay={180}>
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
        </ScrollReveal>
      </div>
    </main>
  );
}
