"use client";

/**
 * /app/stocks/page.tsx
 * StockSphere — AI Stock Intelligence Dashboard (Redesigned)
 * Enhanced with dynamic particle backgrounds, immersive hero globe, sector radars,
 * and fluid animations for a more engaging fintech experience.
 * Inspired by modern dashboards (e.g., TradingView + Figma's vibrant UIs).
 *
 * Key redesigns:
 * - Immersive hero with mini 3D globe and particle effects.
 * - Sector performance radar charts for visual excitement.
 * - Floating KPIs with orbital animations.
 * - Enhanced cards with holographic hovers and micro-interactions.
 * - New sections: Global Pulse (event feed), Sector Breakdown (radar charts).
 * - Consistent glassmorphism with cyan/amber glows.
 * - Responsive, performant with staggered animations.
 *
 * Dependencies: framer-motion, @headlessui/react, @heroicons/react, recharts, @react-three/fiber, @react-three/drei, three
 * Paste into app/stocks/page.tsx
 */

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
  useRef,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  BellIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import Link from "next/link";

/* ============== Types ============== */

type Theme = "light" | "dark";

type Stock = {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  historicalData?: { date: string; close: number }[];
  news?: { id: number; title: string; source: string; date: string; url: string }[];
  marketCap?: number;
  peRatio?: number;
  eps?: number;
};

type Recommendation = {
  ticker: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1..1
  mentions: number;
  reason: string;
};

const SAMPLE_SERIES = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 800 },
  { name: "Mar", value: 650 },
  { name: "Apr", value: 1200 },
  { name: "May", value: 980 },
  { name: "Jun", value: 1220 },
  { name: "Jul", value: 1450 },
];

const SECTOR_DATA = [
  { sector: "Tech", value: 85, fullMark: 100 },
  { sector: "Energy", value: 45, fullMark: 100 },
  { sector: "Finance", value: 72, fullMark: 100 },
  { sector: "Healthcare", value: 68, fullMark: 100 },
  { sector: "Consumer", value: 55, fullMark: 100 },
];

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "AMD"];

function clsx(...vals: any[]) {
  return vals.filter(Boolean).join(" ");
}

function formatCurrency(v?: number) {
  if (v == null || Number.isNaN(v)) return "$0.00";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPct(v?: number) {
  if (v == null || Number.isNaN(v)) return "0.00%";
  return `${(v * 100).toFixed(2)}%`;
}

/* ============== Theme ============== */

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | undefined>(undefined);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      if (typeof window === "undefined") return "dark";
      const saved = localStorage.getItem("sg_theme_v1");
      return (saved as Theme) || "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sg_theme_v1", theme);
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* ============== Mock / Fetch Utilities ============== */

async function fetchJSON(url: string, fallback: any = null) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad");
    return await res.json();
  } catch {
    return fallback;
  }
}

function mockStock(symbol: string): Stock {
  const base = 80 + Math.random() * 400;
  const hist = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    close: +(base * (1 + (Math.sin(i / 3) * 0.02 + (Math.random() - 0.5) * 0.03))).toFixed(2),
  }));
  const change = (hist[hist.length - 1].close - hist[0].close) / hist[0].close;
  return {
    symbol,
    name: `${symbol} Inc.`,
    price: hist[hist.length - 1].close,
    change,
    historicalData: hist,
    marketCap: Math.floor(Math.random() * 1e12 + 1e11),
    peRatio: +(Math.random() * 60).toFixed(2),
    eps: +(Math.random() * 10).toFixed(2),
    news: [
      { id: 1, title: `${symbol} surges on AI partnership news`, source: "Bloomberg", date: new Date().toISOString(), url: "#" },
      { id: 2, title: `Analysts raise ${symbol} target to $250`, source: "Reuters", date: new Date(Date.now() - 86400000).toISOString(), url: "#" },
    ],
  };
}

/* ============== Enhanced UI Bits ============== */

function Particles({ count = 50 }: { count?: number }) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
  })), [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-20"
          animate={{
            x: [p.x * 2 + '%', (p.x + p.vx * 100) + '%'],
            y: [p.y * 2 + '%', (p.y + p.vy * 100) + '%'],
          }}
          transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function MiniGlobe() {
  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <Sphere args={[1, 32, 32]}>
          <meshStandardMaterial color="#4a90e2" emissive="#00ffff" emissiveIntensity={0.1} />
        </Sphere>
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={true} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return <div className="text-xs text-gray-400">-</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-8">
      <polyline points={points} fill="none" stroke="#00ffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============== Components ============== */

function TopNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className={clsx("fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b border-white/10", theme === "dark" ? "bg-black/50" : "bg-white/70")}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onOpenSidebar} className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-bold">SS</div>
            <div className="font-semibold text-white">StockSphere</div>
          </Link>
        </div>

        <div className="relative hidden md:block w-full max-w-md mx-8">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Search stocks, news, or sectors (e.g., AAPL, AI)"
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggle} className="p-2 rounded-lg bg-white/10 backdrop-blur hover:bg-white/20 transition">
            {theme === "dark" ? <SunIcon className="h-5 w-5 text-yellow-400" /> : <MoonIcon className="h-5 w-5 text-gray-300" />}
          </button>
          <button className="p-2 rounded-lg bg-white/10 backdrop-blur hover:bg-white/20 transition relative">
            <BellIcon className="h-5 w-5 text-gray-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">3</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white font-semibold">U</div>
        </div>
      </div>
    </header>
  );
}

/* Enhanced Hero with Mini Globe and Particles */
function HeroBlobs() {
  return (
    <>
      <Particles count={100} />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ x: [-40, 40, -40], y: [-20, 20, -20] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-400/20 to-indigo-500/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [40, -40, 40], y: [20, -20, 20] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-32 -bottom-32 w-128 h-128 rounded-full bg-gradient-to-tr from-amber-400/20 to-cyan-500/20 blur-3xl"
        />
      </div>
    </>
  );
}

function Hero({ onView }: { onView: (st: Stock) => void }) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 rounded-2xl relative overflow-hidden border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl"
    >
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
            AI Stock Copilot
          </h1>
          <p className="text-gray-400 max-w-md mb-6">
            Global news, sentiment analysis, and predictive signals — all in one dashboard.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/signup" className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition">
              Start Free Trial
            </Link>
            <button className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition">
              Explore API
            </button>
          </div>

          {/* Floating KPIs */}
          <div className="flex gap-4">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-lg"
            >
              <div className="text-xs text-gray-300">Markets Tracked</div>
              <div className="text-xl font-bold text-white">10,432</div>
              <div className="text-xs text-cyan-400">+2.1%</div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-lg"
            >
              <div className="text-xs text-gray-300">Active Signals</div>
              <div className="text-xl font-bold text-white">24.7k</div>
              <div className="text-xs text-cyan-400">+12.3%</div>
            </motion.div>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="p-4 rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-lg"
            >
              <div className="text-xs text-gray-300">Accuracy</div>
              <div className="text-xl font-bold text-white">82.4%</div>
              <div className="text-xs text-cyan-400">+1.4%</div>
            </motion.div>
          </div>
        </div>

        <div className="relative">
          <MiniGlobe />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-indigo-600/10 rounded-2xl" />
        </div>
      </div>

      <div className="mt-8">
        <div className="w-full h-48 rounded-xl border border-white/10 overflow-hidden bg-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={SAMPLE_SERIES}>
              <XAxis dataKey="name" tick={{ fill: 'white', fontSize: 12 }} />
              <YAxis tick={{ fill: 'white', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="value" stroke="#00ffff" strokeWidth={2} dot={{ fill: '#00ffff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.section>
  );
}

/* Stock Card (holographic hover) */
function StockCard({ s, onView, onFav, isFav }: { s: Stock; onView: (st: Stock) => void; onFav: (sym: string) => void; isFav: boolean }) {
  const values = s.historicalData?.map(d => d.close) ?? [1, 2, 3, 4].map(v => v * (1 + Math.random() * 0.1));
  const pos = (s.change ?? 0) >= 0;
  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <div className="text-sm font-bold text-white">{s.symbol}</div>
          <div className="text-xs text-gray-400">{s.name}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">{formatCurrency(s.price)}</div>
          <div className={clsx("text-sm font-medium", pos ? "text-green-400" : "text-red-400")}>{formatPct(s.change)}</div>
        </div>
      </div>

      <div className="mt-4">
        <Sparkline values={values} />
      </div>

      <div className="mt-4 flex gap-2 relative z-10">
        <button 
          onClick={() => onView(s)} 
          className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-medium hover:from-cyan-600 hover:to-indigo-700 transition"
        >
          Insights
        </button>
        <motion.button 
          onClick={() => onFav(s.symbol)} 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="p-2 rounded-lg bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition"
        >
          <StarIcon className={clsx("h-5 w-5 transition-colors", isFav ? "text-yellow-400" : "text-gray-400")} />
        </motion.button>
      </div>
    </motion.article>
  );
}

/* Modal for stock details (with glow effects) */
function StockModal({ stock, open, onClose }: { stock: Stock | null; open: boolean; onClose: () => void }) {
  if (!stock) return null;
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 flex items-center justify-center">
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100">
            <Dialog.Panel className="w-full max-w-4xl rounded-2xl bg-gray-900/95 backdrop-blur-lg border border-white/10 overflow-hidden shadow-2xl">
              <Dialog.Title className="p-6 border-b border-white/10 bg-gradient-to-r from-gray-800 to-gray-900 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-indigo-600/5" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white flex items-center gap-3">
                      <span>{stock.symbol}</span>
                      <span className="text-sm text-gray-400">{stock.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">AI-Powered Insights • Real-time</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{formatCurrency(stock.price)}</div>
                    <div className="text-sm text-gray-400">{formatPct(stock.change)}</div>
                  </div>
                </div>
              </Dialog.Title>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(stock.historicalData ?? []).slice(-30)}>
                      <defs>
                        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#00ffff" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} tick={{ fontSize: 12, fill: 'white' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'white' }} />
                      <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="close" stroke="#00ffff" fill="url(#g1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <div className="text-sm text-gray-300 mb-4 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                    Latest News
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(stock.news ?? []).map(n => (
                      <motion.a 
                        key={n.id} 
                        href={n.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="block p-4 rounded-lg bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition"
                      >
                        <div className="font-medium text-white">{n.title}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                          <span>{n.source}</span>
                          <span>• {new Date(n.date).toLocaleDateString()}</span>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-gray-800/50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-400">Market Cap</div>
                    <div className="text-white font-bold">{formatCurrency(stock.marketCap)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">P/E Ratio</div>
                    <div className="text-white font-bold">{stock.peRatio}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">EPS</div>
                    <div className="text-white font-bold">${stock.eps}</div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex justify-end">
                <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium hover:from-cyan-600 hover:to-indigo-700 transition">
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/* AI Recommendations Panel — with glow badges */
function AIRecommendations({ onAddWatch }: { onAddWatch: (t: string) => void }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await fetchJSON("/api/recommend", null);
      if (mounted) {
        if (data?.recommendations && Array.isArray(data.recommendations)) {
          setRecs(data.recommendations.map((r: any) => ({
            ticker: r.ticker || "AAPL",
            sentiment: r.sentiment || (r.score > 0 ? "positive" : "negative"),
            score: typeof r.score === "number" ? r.score : (r.score ? +r.score : Math.random()),
            mentions: r.mentions ?? Math.floor(Math.random() * 50 + 1),
            reason: r.reason ?? "News driven signal",
          })));
        } else {
          const mock: Recommendation[] = DEFAULT_SYMBOLS.slice(0, 5).map((s, i) => ({
            ticker: s,
            sentiment: i % 3 === 0 ? "positive" : i % 3 === 1 ? "neutral" : "negative",
            score: +(Math.random() * 0.9).toFixed(3) * (i % 3 === 2 ? -1 : 1),
            mentions: Math.floor(Math.random() * 120 + 1),
            reason: `${s} trending across global headlines`,
          }));
          setRecs(mock);
        }
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 shadow-lg relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-indigo-600/5" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4" />
              AI Recommendations
            </div>
            <div className="text-xs text-gray-400">News-driven signals</div>
          </div>
          <div className="text-sm text-gray-400">{loading ? "Updating…" : `${recs?.length ?? "—"} signals`}</div>
        </div>

        <div className="space-y-3">
          {!recs ? (
            <div className="py-8 text-center text-gray-400">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <InformationCircleIcon className="h-8 w-8 mx-auto mb-2" />
              </motion.div>
              Loading AI insights...
            </div>
          ) : recs.map((r, i) => (
            <motion.div 
              key={r.ticker} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-600/10 rounded-lg opacity-0 hover:opacity-100" />
              <div className="relative">
                <div className="font-bold text-white">{r.ticker}</div>
                <div className="text-xs text-gray-400">{r.reason}</div>
              </div>

              <div className="flex items-center gap-3 relative">
                <motion.div 
                  className={clsx("px-2 py-1 rounded-full text-xs font-medium shadow-lg", 
                    r.score > 0 ? "bg-green-500/20 text-green-400" : 
                    r.score < 0 ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                  )}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {(r.score * 100).toFixed(1)}%
                </motion.div>
                <button 
                  onClick={() => onAddWatch(r.ticker)} 
                  className="px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-medium hover:from-cyan-600 hover:to-indigo-700 transition"
                >
                  + Watch
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* New: Sector Breakdown with Radar Chart */
function SectorBreakdown() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            Sector Breakdown
          </div>
          <div className="text-xs text-gray-400">AI sentiment radar</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={SECTOR_DATA}>
          <PolarGrid stroke="#374151" strokeWidth={1} />
          <PolarAngleAxis dataKey="sector" tick={{ fill: 'white', fontSize: 10 }} />
          <Radar name="Sentiment" dataKey="value" stroke="#00ffff" fill="#00ffff" fillOpacity={0.2} />
          <Legend />
          <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

/* New: Global Pulse Section */
function GlobalPulse() {
  const events = [
    { id: 1, title: "AI Summit in London boosts tech stocks", sector: "Tech", impact: "High", confidence: 89 },
    { id: 2, title: "OPEC cuts production — energy rally", sector: "Energy", impact: "Medium", confidence: 76 },
    { id: 3, title: "Fed signals rate pause", sector: "Finance", impact: "High", confidence: 82 },
  ];

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12"
    >
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <BoltIcon className="h-5 w-5" />
        Global Market Pulse
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {events.map((e) => (
          <motion.div 
            key={e.id}
            whileHover={{ scale: 1.02 }}
            className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition shadow-lg"
          >
            <div className="text-sm font-bold text-white mb-2">{e.title}</div>
            <div className="text-xs text-gray-400 mb-3">Sector: {e.sector}</div>
            <div className="flex items-center justify-between text-xs text-cyan-400 font-medium">
              <span>Impact: {e.impact}</span>
              <span>Confidence: {e.confidence}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ============== Page main ============== */

export default function StocksPage() {
  return (
    <ThemeProvider>
      <StocksPageInner />
    </ThemeProvider>
  );
}

function StocksPageInner() {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>(() => DEFAULT_SYMBOLS.map(s => mockStock(s)));
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setStocks(prev => prev.map(s => {
        const noise = 1 + (Math.random() - 0.5) * 0.01;
        const price = +( (s.price ?? 100) * noise ).toFixed(2);
        const change = ((price - (s.historicalData?.[0].close ?? price)) / (s.historicalData?.[0].close ?? price));
        return { ...s, price, change, historicalData: (s.historicalData ?? []).slice(1).concat([{ date: new Date().toISOString().slice(0,10), close: price }]) };
      }));
    }, 7_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q));
  }, [stocks, query]);

  const toggleFav = (sym: string) => setFavorites(prev => prev.includes(sym) ? prev.filter(x => x !== sym) : [...prev, sym]);
  const addToWatch = (sym: string) => setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym]);

  return (
    <div className="min-h-screen bg-[#03040a] text-white">
      <TopNav onOpenSidebar={() => setSidebarOpen(true)} />
      <div className="pt-20 relative">
        <HeroBlobs />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: hero + Market Watch */}
            <div className="lg:col-span-2 space-y-8">
              <Hero onView={(st) => setSelectedStock(st)} />

              {/* Market Watch Grid */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" />
                    Market Watch
                  </h2>
                  <div className="text-sm text-gray-400">{filtered.length} results</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filtered.map((s, i) => (
                      <motion.div
                        key={s.symbol}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <StockCard s={s} onView={(st) => setSelectedStock(st)} onFav={toggleFav} isFav={favorites.includes(s.symbol)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            {/* Right column: Sticky sidebar */}
            <aside className="lg:sticky lg:top-28 space-y-6">
              <AIRecommendations onAddWatch={addToWatch} />
              <SectorBreakdown />

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      Watchlist
                    </div>
                    <div className="text-xs text-gray-400">Your tracked symbols</div>
                  </div>
                  <div className="text-sm text-gray-400">{watchlist.length} items</div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {watchlist.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <StarIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      Add stocks to monitor real-time signals.
                    </div>
                  ) : watchlist.map(w => {
                    const s = stocks.find(x => x.symbol === w) ?? mockStock(w);
                    return (
                      <motion.div 
                        key={w} 
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                      >
                        <div>
                          <div className="font-medium text-white">{s.symbol}</div>
                          <div className="text-xs text-gray-400">{s.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">{formatCurrency(s.price)}</div>
                          <div className={clsx("text-xs", (s.change ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                            {formatPct(s.change)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-xl bg-gradient-to-br from-indigo-900/50 to-slate-900/50 border border-white/10 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-white">Upgrade to Pro</div>
                    <div className="text-xs text-gray-400">Unlock advanced features</div>
                  </div>
                  <div className="text-lg font-bold text-amber-400">$99 / mo</div>
                </div>

                <ul className="space-y-2 text-xs text-gray-300 mb-4">
                  <li className="flex items-center gap-2">• <ArrowTrendingUpIcon className="h-3 w-3" /> Real-time global news aggregation</li>
                  <li className="flex items-center gap-2">• <ChartBarIcon className="h-3 w-3" /> Advanced sentiment & NER models</li>
                  <li className="flex items-center gap-2">• <StarIcon className="h-3 w-3" /> Priority signals & backtesting</li>
                  <li className="flex items-center gap-2">• <BellIcon className="h-3 w-3" /> Custom alerts & API access</li>
                </ul>

                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-cyan-400 text-black font-semibold hover:from-amber-500 hover:to-cyan-500 transition shadow-lg">
                  Upgrade Now
                </button>
              </motion.div>
            </aside>
          </div>

          <GlobalPulse />

          {/* News & Insights Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Latest News & Signals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition shadow-lg"
                >
                  <div className="text-sm font-bold text-white mb-2">Global Signal #{i + 1}</div>
                  <div className="text-xs text-gray-400 mb-3">Reuters • {new Date().toLocaleDateString()}</div>
                  <p className="text-sm text-gray-300 mb-4">
                    AI summary: Emerging trends in semiconductors driven by tariff relief—watch NVDA, AMD for breakout potential.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                    <span>Impact: High</span>
                    <span>• Confidence: 84%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <footer className="mt-16 text-center text-xs text-gray-500 py-8 border-t border-white/10">
            © {new Date().getFullYear()} StockSphere Inc. — Powered by AI. All rights reserved.
          </footer>
        </main>
      </div>

      <StockModal stock={selectedStock} open={!!selectedStock} onClose={() => setSelectedStock(null)} />
    </div>
  );
}

