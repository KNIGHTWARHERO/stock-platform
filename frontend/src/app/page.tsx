
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * StockSphere — The Definitive Atomik-Inspired Redesign (Geolocated Events Update)
 * Single-file Next.js App Router page (app/page.jsx)
 * This version introduces a complete redesign of the 3D hero component. The abstract
 * wireframe globe has been replaced with a realistic, textured Earth. Orbiting
 * bubbles are now geolocated, interactive "event beacons" pinned to specific
 * countries, displaying plausible real-world events.
 * Enhanced: On clicking an event marker, a modal opens displaying recent news (via Guardian API)
 * and stock quote for a representative stock from that country (via Finnhub API).
 * Alpha Vantage is available but not used in this implementation for simplicity.
 * New: Globe is now interactive with mouse/trackpad (orbit, zoom, pan via OrbitControls).
 * News headlines are fetched on-demand when clicking a marker.
 * Stack: Next.js (app router), React, Tailwind CSS
 * Dependencies: framer-motion, @react-three/fiber, @react-three/drei, three
 * All code is self-contained in this single file.
 * API Keys: Assumed to be available via process.env.NEXT_PUBLIC_* for client-side use.
 * Updates:
 * Globe size fixed to original (radius: 1.5, camera distance: 4) for consistent visibility.
 * Globe spin slowed down (rotation speed: 0.001).
 * Guardian API integration uses NEXT_PUBLIC_GUARDIAN_KEY (set in .env.local as NEXT_PUBLIC_GUARDIAN_KEY=your_key_here).
 * Finnhub uses NEXT_PUBLIC_FINNHUB_API_KEY.
 *
 * Added (Country Click Highlights):
 * - Click anywhere on a country to fetch Top Highlights from The Guardian for that country.
 * - Hovering the globe shows the nearest country name tooltip.
 * - Uses REST Countries API to map lat/lon to nearest country centroid client-side.
 */

/* ========================================================================
UTILITIES & HOOKS
======================================================================== */
const clsx = (...parts) => parts.filter(Boolean).join(' ');

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useWebGLAvailability() {
  const [isAvailable, setIsAvailable] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const hasContext = !!(canvas.getContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setIsAvailable(hasContext);
    } catch {
      setIsAvailable(false);
    }
  }, []);
  return isAvailable;
}

/* ========================================================================
2. MOCK DATA GENERATORS & API FETCHERS
======================================================================== */
function useMockTickers() {
  const [tickers, setTickers] = useState([
    { symbol: 'AAPL', price: 172.45, change: 0.12 },
    { symbol: 'TSLA', price: 269.12, change: -1.54 },
    { symbol: 'GOOG', price: 133.34, change: 0.87 },
    { symbol: 'MSFT', price: 318.1, change: 1.02 },
    { symbol: 'AMZN', price: 148.88, change: -0.45 },
    { symbol: 'NVDA', price: 450.76, change: 3.11 },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setTickers(prev =>
        prev.map(t => {
          const vol = (Math.random() - 0.5) * 0.45;
          const nextPrice = +(t.price * (1 + vol / 100)).toFixed(2);
          return { ...t, change: +(nextPrice - t.price).toFixed(2), price: nextPrice };
        })
      );
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return tickers;
}

function useMockHeadlines() {
  const [items, setItems] = useState([
    'Tariff tensions shift semiconductor supply chains',
    'Energy sanctions drive crude higher — watch OILCO',
    'Central bank signals pause — bond yields compress',
  ]);

  useEffect(() => {
    const pool = [
      'Major logistics route disrupted after regional conflict',
      'Large-cap tech reports stronger-than-expected guidance',
      'Supplier files for restructuring — component risk rises',
      'Renewable incentives expand in EMEA: manufacturing uplift',
      'Options flow shows heavy bullish activity in NVDA',
      'Regulatory clarity improves for fintech — payments lift',
      'Election outcome increases infrastructure spending probability',
    ];
    const id = setInterval(() => {
      const next = pool[Math.floor(Math.random() * pool.length)];
      setItems(prev => [next, ...prev].slice(0, 5));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return items;
}

// NOTE: Removed useGlobalNews — news is now fetched on-demand in EventModal

/* ========================================================================
3. CORE UI COMPONENTS
======================================================================== */

const Logo = ({ small }) => (
  <div className="flex items-center gap-3">
    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg', small ? 'text-sm' : 'text-lg', 'bg-gradient-to-br from-cyan-400 to-indigo-600')}>
      SS
    </div>
    <div className={clsx('font-semibold text-white', small ? 'text-sm' : 'text-base')}>
      StockSphere
    </div>
  </div>
);

const GlowButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="relative inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black transition-all duration-200 bg-amber-400 rounded-lg group hover:bg-amber-500"
  >
    <span className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-cyan-400 rounded-lg blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></span>
    <span className="relative">{children}</span>
  </button>
);

const LoginButton = () => (
  <a
    href="/login"
    className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white transition-all duration-200 border border-white/30 rounded-lg hover:bg-white/10"
  >
    Log in / Sign up
  </a>
);

/* ========================================================================
4. WEBGL & 3D COMPONENTS (R3F) - REDESIGNED
======================================================================== */

// Helper to convert Lat/Lon to 3D coordinates
const latLonToVector3 = (lat, lon, radius) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

// Inverse: 3D vector to Lat/Lon
const vector3ToLatLon = (v) => {
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  const phi = Math.acos(v.y / r);
  const lat = 90 - (phi * 180) / Math.PI;
  const theta = Math.atan2(v.z, -v.x);
  const lon = (theta * 180) / Math.PI - 180;
  return { lat, lon };
};

// Country helper: haversine distance in degrees approx
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fetch countries and their centroids (REST Countries)
function useCountries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    const fetchCountries = async () => {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,latlng');
        const data = await res.json();
        if (!isMounted) return;
        const mapped = data
          .filter(c => Array.isArray(c.latlng) && c.latlng.length === 2)
          .map(c => ({
            name: c.name?.common || c.cca2 || 'Unknown',
            code: c.cca2 || '',
            lat: c.latlng[0],
            lon: c.latlng[1],
          }));
        setCountries(mapped);
      } catch (e) {
        console.error('Failed to load countries:', e);
        setCountries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
    return () => { isMounted = false; };
  }, []);
  return { countries, loading };
}

const getNearestCountry = (lat, lon, countries) => {
  if (!countries || countries.length === 0) return null;
  let minD = Infinity;
  let nearest = null;
  for (const c of countries) {
    const d = haversine(lat, lon, c.lat, c.lon);
    if (d < minD) {
      minD = d;
      nearest = c;
    }
  }
  return nearest;
};

// Plausible events for late 2025, enhanced with country and representative stock symbol
const globalEvents = [
  { id: 1, lat: 51.5074, lon: -0.1278, city: 'London', event: 'AI Safety Summit', type: 'Tech', country: 'UK', stockSymbol: 'HSBC' },
  { id: 2, lat: 35.6895, lon: 139.6917, city: 'Tokyo', event: 'Global Tech Expo 2025', type: 'Tech', country: 'Japan', stockSymbol: 'TM' },
  { id: 3, lat: -23.5505, lon: -46.6333, city: 'São Paulo', event: 'G20 Finance Ministers Meeting', type: 'Economic', country: 'Brazil', stockSymbol: 'PBR' },
  { id: 4, lat: 39.9042, lon: 116.4074, city: 'Beijing', event: 'Central Economic Work Conference', type: 'Economic', country: 'China', stockSymbol: 'BABA' },
  { id: 5, lat: 37.7749, lon: -122.4194, city: 'San Francisco', event: 'Quantum Computing Symposium', type: 'Tech', country: 'USA', stockSymbol: 'AAPL' },
  { id: 6, lat: 48.8566, lon: 2.3522, city: 'Paris', event: 'European Climate Accord Negotiations', type: 'Political', country: 'France', stockSymbol: 'LVMUY' },
];

const EventMarker = ({ position, event, onHover, onSelect }) => {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 5 + event.id) * 0.1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); onHover({ type: 'event', event }); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(event); }}
    >
      <sphereGeometry args={[0.02, 32, 32]} />
      <meshBasicMaterial color="#00ffff" toneMapped={false} />
    </mesh>
  );
};

function Earth({ onHover, onSelect, countries, onSelectCountry }) {
  const meshRef = useRef();
  const [textureError, setTextureError] = useState(false);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      undefined,
      undefined,
      (error) => {
        console.error('Earth texture failed to load:', error);
        setTextureError(true);
      }
    );
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001; // Slower rotation for subtle spin
    }
  });

  const handlePointerMove = useCallback((e) => {
    if (!countries || countries.length === 0) return;
    const p = e.point; // world coords (sphere centered at 0)
    const { lat, lon } = vector3ToLatLon(p);
    const nearest = getNearestCountry(lat, lon, countries);
    if (nearest) {
      onHover({ type: 'country', country: nearest });
    }
  }, [countries, onHover]);

  const handlePointerOut = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback((e) => {
    if (!countries || countries.length === 0) return;
    const p = e.point;
    const { lat, lon } = vector3ToLatLon(p);
    const nearest = getNearestCountry(lat, lon, countries);
    if (nearest) {
      onSelectCountry(nearest);
    }
  }, [countries, onSelectCountry]);

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1.5, 128, 128]} />
        {!textureError ? (
          <meshStandardMaterial map={texture} roughness={0.7} metalness={0.1} />
        ) : (
          <meshStandardMaterial
            color="#4a90e2"
            wireframe={true}
            wireframeLinewidth={0.5}
            transparent
            opacity={0.8}
          />
        )}
        {globalEvents.map(event => (
          <EventMarker
            key={event.id}
            position={latLonToVector3(event.lat, event.lon, 1.5)}
            event={event}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </mesh>
    </group>
  );
}

function GlobeScene({ setTooltip, setSelected, countries, setSelectedCountry }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={3} />
      <Earth onHover={setTooltip} onSelect={setSelected} countries={countries} onSelectCountry={setSelectedCountry} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={true} autoRotate={false} rotateSpeed={0.5} />
    </>
  );
}

function NeonGlobe({ setTooltip, setSelected, countries, setSelectedCountry }) {
  return (
    <div className="w-full h-[360px] md:h-[520px] rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        <GlobeScene setTooltip={setTooltip} setSelected={setSelected} countries={countries} setSelectedCountry={setSelectedCountry} />
      </Canvas>
    </div>
  );
}

function CanvasGlobeFallback() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let w = c.clientWidth;
    let h = c.clientHeight;
    const DPR = window.devicePixelRatio || 1;
    let raf = 0;

    const onResize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * DPR;
      c.height = h * DPR;
      ctx.scale(DPR, DPR);
    };
    onResize();
    window.addEventListener('resize', onResize);

    const points = Array.from({ length: 150 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));

    let t = 0;
    const loop = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#04080f');
      g.addColorStop(1, '#03040a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      points.forEach((p, i) => {
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
        const alpha = 0.2 + Math.abs(Math.sin(t + i)) * 0.6;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(96,165,250,' + alpha + ')';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return <canvas ref={ref} className="w-full h-[360px] md:h-[520px] block rounded-xl" />;
}

/* ========================================================================
5. EVENT MODAL COMPONENT (FIXED TO FETCH ON-DEMAND)
======================================================================== */

const EventModal = ({ event, onClose }) => {
  const [news, setNews] = useState([]);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setNews([]);
      setStock(null);

      try {
        // Fetch news from Guardian API
        const guardianKey = process.env.NEXT_PUBLIC_GUARDIAN_KEY;
        if (!guardianKey) {
          throw new Error('Guardian API key not found. Add NEXT_PUBLIC_GUARDIAN_KEY to .env.local');
        }

        const query = encodeURIComponent(String(event.country) + ' ' + String(event.type) + ' ' + String(event.event));
        const newsUrl = 'https://content.guardianapis.com/search?q=' + query + '&api-key=' + guardianKey + '&page-size=5&order-by=newest&show-fields=trailText,headline,thumbnail';

        const newsRes = await fetch(newsUrl);
        if (!newsRes.ok) {
          throw new Error('Guardian API returned status ' + newsRes.status);
        }
        const newsData = await newsRes.json();
        setNews(newsData.response.results || []);
      } catch (e) {
        console.error('Guardian API error:', e);
        setError('Failed to load news');
      }

      try {
        // Fetch stock from Finnhub
        const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
        if (!finnhubKey) {
          throw new Error('Finnhub API key not found. Add NEXT_PUBLIC_FINNHUB_API_KEY to .env.local');
        }

        const stockUrl = 'https://finnhub.io/api/v1/quote?symbol=' + event.stockSymbol + '&token=' + finnhubKey;
        const stockRes = await fetch(stockUrl);
        if (!stockRes.ok) {
          throw new Error('Finnhub API returned status ' + stockRes.status);
        }
        const stockData = await stockRes.json();
        if (stockData.c) {
          setStock(stockData);
        }
      } catch (e) {
        console.error('Finnhub API error:', e);
        // Don't set error — news might still be available
      }

      setLoading(false);
    };

    fetchData();
  }, [event]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#071428] rounded-xl p-6 w-full max-w-lg border border-white/10 overflow-y-auto max-h-[80vh]"
      >
        <h4 className="text-lg font-bold text-white">{event.city}, {event.country} - {event.event}</h4>
        <p className="text-sm text-gray-400 mt-1">Type: {event.type}</p>

        {loading ? (
          <p className="text-gray-300 mt-4">Loading news and stock data...</p>
        ) : error ? (
          <p className="text-red-400 mt-4">{error}</p>
        ) : (
          <>
            <h5 className="text-md font-semibold text-white mt-6">Recent News</h5>
            {news.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {news.map((item, i) => (
                  <li key={i} className="text-sm text-gray-300">
                    <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
                      {item.webTitle}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No recent news found.</p>
            )}

            {stock ? (
              <>
                <h5 className="text-md font-semibold text-white mt-6">Stock Quote: {event.stockSymbol}</h5>
                <div className="mt-2 text-sm text-gray-300">
                  <p>Current Price: ${stock.c.toFixed(2)}</p>
                  <p className={clsx(stock.d >= 0 ? 'text-green-400' : 'text-red-400')}>
                    Change: {stock.d?.toFixed(2)} ({stock.dp?.toFixed(2)}%)
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-2">No stock data available.</p>
            )}
          </>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-amber-400 text-black font-semibold hover:bg-amber-500"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ========================================================================
5b. COUNTRY NEWS MODAL (CLICK ANY COUNTRY -> TOP HIGHLIGHTS)
======================================================================== */

const CountryNewsModal = ({ country, onClose }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCountryNews = async () => {
      setLoading(true);
      setError('');
      setNews([]);

      try {
        const guardianKey = process.env.NEXT_PUBLIC_GUARDIAN_KEY;
        if (!guardianKey) {
          throw new Error('Guardian API key not found. Add NEXT_PUBLIC_GUARDIAN_KEY to .env.local');
        }
        // Fetch top highlights for this country (recent, with fields)
        const query = encodeURIComponent(String(country.name));
        const url = 'https://content.guardianapis.com/search?q=' + query + '&api-key=' + guardianKey + '&page-size=8&order-by=newest&show-fields=trailText,headline,thumbnail,shortUrl';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Guardian API returned status ' + res.status);
        const data = await res.json();
        setNews(data.response.results || []);
      } catch (e) {
        console.error('Guardian API error (country):', e);
        setError('Failed to load country highlights');
      } finally {
        setLoading(false);
      }
    };

    if (country?.name) fetchCountryNews();
  }, [country]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#071428] rounded-xl p-6 w-full max-w-2xl border border-white/10 overflow-y-auto max-h-[85vh]"
      >
        <h4 className="text-lg font-bold text-white">Top Highlights — {country?.name}</h4>
        <p className="text-sm text-gray-400 mt-1">Latest from The Guardian</p>

        {loading ? (
          <p className="text-gray-300 mt-4">Loading highlights...</p>
        ) : error ? (
          <p className="text-red-400 mt-4">{error}</p>
        ) : news.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {news.map((n, i) => (
              <li key={n.id || i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                {n.fields?.thumbnail ? (
                  <img src={n.fields.thumbnail} alt="" className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-slate-700/50 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <a href={n.webUrl} target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-cyan-400 line-clamp-2">
                    {n.fields?.headline || n.webTitle}
                  </a>
                  {n.fields?.trailText ? (
                    <p className="text-sm text-gray-300 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: n.fields.trailText }} />
                  ) : null}
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.webPublicationDate).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mt-4">No recent highlights available.</p>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-amber-400 text-black font-semibold hover:bg-amber-500"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ========================================================================
6. PAGE SECTIONS & LAYOUT
======================================================================== */

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-black/50 backdrop-blur-lg' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-200">
          <a href="/stocks" className="hover:text-white transition-colors">
            Stocks
          </a>
          <a href="#how" className="hover:text-white transition-colors">
            How it works
          </a>
          <a href="#demo" className="hover:text-white transition-colors">
            Demo
          </a>
          <a href="#partners" className="hover:text-white transition-colors">
            Partners
          </a>
        </nav>
        <LoginButton />
      </div>
    </header>
  );
}

function Hero({ supportsWebGL, setTooltip, setSelected, countries, setSelectedCountry }) {
  return (
    <section className="min-h-[90vh] flex items-center pt-28 pb-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)] -z-10"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -translate-x-1/2 -z-20"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl translate-x-1/2 z-0"></div>
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-semibold text-sm">
            Now in Private Beta
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-white">
            AI that reads the world.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-amber-300">
              Predicts markets.
            </span>
          </h1>
          <p className="text-gray-300 max-w-xl">
            StockSphere ingests global news, events, and macro signals — producing explainable stock & sector
            recommendations with confidence and provenance.
          </p>
          <div className="flex items-center gap-4">
            <LoginButton />
            <a href="#demo" className="text-sm text-gray-300 hover:underline">
              See Live Demo →
            </a>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          {supportsWebGL ? (
            <NeonGlobe
              setTooltip={setTooltip}
              setSelected={setSelected}
              countries={countries}
              setSelectedCountry={setSelectedCountry}
            />
          ) : (
            <CanvasGlobeFallback />
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Ticker({ tickers }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="w-full overflow-hidden">
      <div
        className="flex"
        style={{
          animation: reducedMotion ? 'none' : 'marquee var(--duration) linear infinite',
          '--duration': String(tickers.length * 3) + 's',
        } as any}
      >
        {[...tickers, ...tickers].map((t, i) => (
          <div
            key={t.symbol + '-' + i}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-2 mx-4 bg-white/5 border border-white/10 rounded-lg"
          >
            <span className="font-medium text-white">{t.symbol}</span>
            <span className="text-sm text-gray-300">{t.price.toFixed(2)}</span>
            <span className={clsx('text-sm font-medium', t.change >= 0 ? 'text-green-400' : 'text-red-400')}>
              {t.change >= 0 ? '▲' : '▼'} {Math.abs(t.change).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { title: 'Collect', copy: 'Stream global news, filings, social, and event feeds.' },
    { title: 'Understand', copy: 'Semantic models extract causality, severity, and direction.' },
    { title: 'Act', copy: 'Rank and recommend stocks & sectors with confidence.' },
  ];
  return (
    <section id="how" className="py-20">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-white">How StockSphere works</h2>
        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
          A concise pipeline tuned for real-world events and market reaction.
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 p-6 rounded-xl border border-white/10"
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center font-bold text-black text-lg">
                {i + 1}
              </div>
              <h4 className="mt-4 font-semibold text-white">{s.title}</h4>
              <p className="text-sm text-gray-300 mt-2">{s.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveDemo({ headlines }) {
  return (
    <section id="demo" className="py-20">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-3">
          <h3 className="text-2xl font-bold text-white">Live Signal Feed</h3>
          <p className="text-gray-400 mt-2">
            AI-driven mapping from events to actionable signals — updated in real-time (mock).
          </p>
          <div className="mt-6 space-y-4">
            <AnimatePresence>
              {headlines.map((h, i) => (
                <motion.div
                  key={h + i}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="text-xs text-cyan-400 font-semibold">Incoming Signal...</div>
                  <div className="mt-2 font-medium text-white">{h}</div>
                  <div className="mt-2 text-xs text-gray-400">
                    Predicted impact: <span className="font-semibold text-gray-300">Sector: Tech • Confidence: 72%</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <aside className="lg:col-span-2 lg:sticky top-28">
          <div className="rounded-xl p-6 bg-gradient-to-br from-indigo-900/50 to-slate-900/50 border border-white/10">
            <div className="text-sm text-gray-300">Top Recommendation</div>
            <div className="mt-4">
              <div className="text-xs text-gray-400">Ticker</div>
              <div className="text-3xl font-bold text-white">NVDA • $450.76</div>
              <div className="text-sm text-amber-400 font-semibold mt-1">Confidence: 82% (High)</div>
            </div>
            <div className="mt-4 text-sm text-gray-300 bg-black/20 rounded p-3 border border-white/10">
              <span className="font-semibold">Rationale:</span> Tariff easing + demand uplift in EMEA — margin expansion
              expected in components suppliers.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Credibility() {
  return (
    <section className="py-12 bg-gradient-to-b from-transparent to-black/5">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
        <div className="rounded-xl p-6 bg-white/5 border border-white/10">
          <div className="text-sm text-gray-300">AI Model Accuracy</div>
          <div className="text-3xl font-bold text-white">82%</div>
          <div className="text-xs text-gray-400 mt-1">Ensemble consensus backtest</div>
        </div>
        <div className="rounded-xl p-6 bg-white/5 border border-white/10">
          <div className="text-sm text-gray-300">Systemic Risk Index</div>
          <div className="text-3xl font-bold text-amber-400">3.8</div>
          <div className="text-xs text-gray-400 mt-1">1-10 (lower is better)</div>
        </div>
        <div className="rounded-xl p-6 bg-white/5 border border-white/10">
          <div className="text-sm text-gray-300">Signal Latency</div>
          <div className="text-3xl font-bold text-white">8ms</div>
          <div className="text-xs text-gray-400 mt-1">Median event-to-signal time</div>
        </div>
      </div>
    </section>
  );
}

function Partners() {
  return (
    <section id="partners" className="py-12">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h4 className="text-xl font-bold text-white">Early Partners & Investors</h4>
        <p className="text-gray-400 mt-2">
          Research labs, quant funds, and data partners collaborating with StockSphere.
        </p>
        <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-4 items-center">
          {['Vector Capital', 'Alpha Labs', 'QuantumLeap', 'Momentum', 'Vertex', 'Nova'].map((name) => (
            <div key={name} className="h-12 flex items-center justify-center text-gray-400 font-semibold">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 p-12 text-center">
        <h3 className="text-3xl font-bold text-white">See StockSphere in action</h3>
        <p className="text-gray-300 mt-3 max-w-xl mx-auto">
          Join the private beta for early access, API integrations, and to help shape the future of market intelligence.
        </p>
        <div className="mt-8">
          <LoginButton />
        </div>
      </div>
    </section>
  );
}

function Footer({ children }) {
  return (
    <>
      <footer className="bg-black/50 text-gray-300 mt-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8">
          <div>
            <Logo small />
            <p className="mt-4 text-sm text-gray-500">Explainable market intelligence for the modern investor.</p>
          </div>
          <div>
            <h5 className="font-semibold text-white">Product</h5>
            <ul className="mt-3 text-sm space-y-2 text-gray-400">
              <li>
                <a href="/stocks" className="hover:text-white">
                  Stocks
                </a>
              </li>
              <li>
                <a href="#how" className="hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-white">
                  Demo
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  API
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white">Company</h5>
            <ul className="mt-3 text-sm space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white">Legal</h5>
            <ul className="mt-3 text-sm space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-sm text-center text-gray-500">
          © {new Date().getFullYear()} StockSphere Inc.
        </div>
      </footer>
      {children}
    </>
  );
}

// Main Page Component
export default function Page() {
  const tickers = useMockTickers();
  const headlines = useMockHeadlines();
  const supportsWebGL = useWebGLAvailability();
  const { countries } = useCountries();
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleMouseMove = (e) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#03040a] text-white antialiased selection:bg-amber-400/20">
      <Header />
      <main>
        <Hero
          supportsWebGL={supportsWebGL}
          setTooltip={setTooltip}
          setSelected={setSelectedEvent}
          countries={countries}
          setSelectedCountry={setSelectedCountry}
        />
        <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-10">
          <Ticker tickers={tickers} />
        </div>
        <HowItWorks />
        <LiveDemo headlines={headlines} />
        <Credibility />
        <Partners />
        <CTA />
      </main>
      <Footer>

        {/* Tooltip: Shows country or event info */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50 p-2 bg-slate-800/95 text-white text-xs rounded-md shadow-lg pointer-events-none border border-cyan-500/50 max-w-[220px] whitespace-normal"
              style={{
                left: tooltipPos.x + 15,
                top: tooltipPos.y + 15,
              }}
            >
              {tooltip.type === 'event' ? (
                <>
                  <p className="font-bold text-cyan-300">{tooltip.event.city}</p>
                  <p className="text-gray-200">{tooltip.event.event}</p>
                </>
              ) : tooltip.type === 'country' ? (
                <>
                  <p className="font-bold text-cyan-300">{tooltip.country.name}</p>
                  <p className="text-gray-200">Click to view top highlights</p>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Shows full news + stock when marker clicked */}
        <AnimatePresence>
          {selectedEvent && (
            <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          )}
        </AnimatePresence>

        {/* Modal: Shows country top highlights when clicking any country */}
        <AnimatePresence>
          {selectedCountry && (
            <CountryNewsModal country={selectedCountry} onClose={() => setSelectedCountry(null)} />
          )}
        </AnimatePresence>
      </Footer>
    </div>
  );
}
