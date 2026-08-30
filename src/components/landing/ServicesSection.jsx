// src/components/landing/ServicesSection.jsx
import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Lightbulb, FileCheck, Cable, Wrench, ShieldCheck,
  Factory, Home as HomeIcon, Cpu, Activity, Plug, Bolt,
  ArrowRight, X, Monitor, Globe, Smartphone, Database,
  ClipboardList, Settings, Package, Server, Code, LayoutDashboard,
  Gauge, Radio, Building2, HardDrive, BarChart2, Cloud,
} from 'lucide-react';

import { useServices } from '../../hooks/useContent';
import { SERVICE_CATEGORIES, getCategoryMeta } from '../../constants/serviceCategories';
import ServicesSkeleton from './skeletons/ServicesSkeleton';

/* ------------------------------------------------------------------ */
/*  Icon registry                                                        */
/* ------------------------------------------------------------------ */
const ICON_MAP = {
  bolt: Bolt, zap: Zap, lightbulb: Lightbulb, 'file-check': FileCheck,
  cable: Cable, wrench: Wrench, shield: ShieldCheck, factory: Factory,
  home: HomeIcon, cpu: Cpu, activity: Activity, plug: Plug,
  monitor: Monitor, globe: Globe, smartphone: Smartphone,
  database: Database, clipboard: ClipboardList, settings: Settings,
  package: Package, server: Server, code: Code, layout: LayoutDashboard,
  gauge: Gauge, radio: Radio, building: Building2, harddrive: HardDrive,
  barchart: BarChart2, cloud: Cloud,
};

/**
 * Smart icon resolver — title keyword takes priority over Firestore value
 * so each service card gets a meaningful unique icon even if the CMS
 * has all icons set to the same generic value.
 */
function resolveIcon(service) {
  const t = (service.title || '').toLowerCase();

  // Keyword-first matching (most specific to least)
  if (t.includes('pju') || t.includes('lampu') || t.includes('cahaya')) return Lightbulb;
  if (t.includes('perawatan') || t.includes('perbaikan') || t.includes('maintenance')) return Wrench;
  if (t.includes('cubicle') || t.includes('panel')) return Cpu;
  if (t.includes('pasang baru') || t.includes('instalasi baru')) return Plug;
  if (t.includes('nidi') || t.includes('slo') || t.includes('sertifikat')) return FileCheck;
  if (t.includes('drawing') || t.includes('perencanaan') || t.includes('gambar')) return Code;
  if (t.includes('transformator') || t.includes('trafo')) return Zap;
  if (t.includes('relay')) return Activity;
  if (t.includes('breaker') || t.includes('acb') || t.includes('vcb') || t.includes('mccb')) return ShieldCheck;
  if (t.includes('tambah daya') || t.includes('tambah') && t.includes('daya')) return Bolt;
  if (t.includes('instalasi')) return Plug;
  if (t.includes('cmms') || t.includes('pemeliharaan')) return Settings;
  if (t.includes('wms') || t.includes('gudang') || t.includes('warehouse')) return Database;
  if (t.includes('ehms') || t.includes('k3') || t.includes('hse') || t.includes('safety')) return ShieldCheck;
  if (t.includes('website') || t.includes('web')) return Globe;
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return Smartphone;
  if (t.includes('erp') || t.includes('sistem bisnis')) return LayoutDashboard;
  if (t.includes('iot') || t.includes('otomasi') || t.includes('sensor')) return Radio;
  if (t.includes('monitoring') || t.includes('dashboard')) return BarChart2;
  if (t.includes('cloud') || t.includes('hosting')) return Cloud;
  if (t.includes('server') || t.includes('infrastruktur')) return Server;
  if (t.includes('material') || t.includes('komponen') || t.includes('suplai')) return Package;

  // Fallback: Firestore icon field, then Zap
  return ICON_MAP[service.icon] || Zap;
}

/** Generate up to 2 descriptive tag chips per service */
function getServiceTags(service, catKey) {
  const t = (service.title || '').toLowerCase();
  const d = (service.description || '').toLowerCase();
  const tags = [];

  if (t.includes('pju') || d.includes('pju')) tags.push('PJU');
  if (t.includes('industri') || d.includes('industri')) tags.push('Industri');
  if (t.includes('rumah tangga') || d.includes('rumah tangga') || d.includes('residensial') || d.includes('rumah')) tags.push('Residensial');
  if (t.includes('baru') && !t.includes('pasang baru')) tags.push('Pemasangan Baru');
  if (t.includes('pasang baru')) tags.push('Pasang Baru');
  if (t.includes('perawatan') || t.includes('maintenance')) tags.push('Maintenance');
  if (t.includes('perbaikan')) tags.push('Perbaikan');
  if (t.includes('cubicle')) tags.push('Cubicle');
  if (t.includes('nidi')) tags.push('NIDI');
  if (t.includes('slo')) tags.push('SLO');
  if (t.includes('drawing') || t.includes('gambar')) tags.push('Gambar Teknik');
  if (t.includes('perencanaan')) tags.push('Perencanaan');
  if (t.includes('transformator') || t.includes('trafo')) tags.push('Trafo');
  if (t.includes('relay')) tags.push('Relay');
  if (t.includes('breaker') || t.includes('acb') || t.includes('vcb')) tags.push('Circuit Breaker');
  if (t.includes('daya')) tags.push('Tambah Daya');
  if (t.includes('cmms')) tags.push('CMMS');
  if (t.includes('wms')) tags.push('WMS');
  if (t.includes('ehms') || t.includes('k3') || t.includes('hse')) tags.push('HSE & K3');
  if (t.includes('website')) tags.push('Website');
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) tags.push('Mobile App');
  if (t.includes('erp')) tags.push('ERP');
  if (d.includes('energi') || d.includes('hemat')) tags.push('Hemat Energi');
  if (d.includes('standar') || d.includes('sni') || d.includes('regulasi')) tags.push('Standar SNI');
  if (d.includes('otomasi') || d.includes('smart') || d.includes('iot')) tags.push('Smart System');
  if (d.includes('custom') || d.includes('sesuai kebutuhan')) tags.push('Custom');

  if (tags.length === 0) {
    const catFallback = {
      electrical: ['Kelistrikan', 'Teknik'],
      legal: ['Resmi', 'Perizinan'],
      material: ['Bergaransi', 'Industri'],
      iot: ['Smart', 'Monitoring'],
      software: ['Digital', 'Custom'],
    };
    return (catFallback[catKey] || ['Layanan']).slice(0, 2);
  }

  return tags.slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Accent palette                                                       */
/* ------------------------------------------------------------------ */
const ACCENT = {
  emerald: {
    gradient:   'from-emerald-500 to-emerald-700',
    gradientAlt:'from-emerald-600 to-teal-700',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-emerald-100/80',
    tagFg:      'text-emerald-800',
    btn:        'text-emerald-600 hover:text-emerald-800',
    panelTag:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot:        'bg-emerald-500',
  },
  sky: {
    gradient:   'from-sky-500 to-blue-600',
    gradientAlt:'from-sky-600 to-indigo-600',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-sky-100/80',
    tagFg:      'text-sky-800',
    btn:        'text-sky-600 hover:text-sky-800',
    panelTag:   'bg-sky-50 text-sky-700 ring-sky-200',
    dot:        'bg-sky-500',
  },
  amber: {
    gradient:   'from-amber-400 to-orange-500',
    gradientAlt:'from-amber-500 to-red-500',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-amber-100/80',
    tagFg:      'text-amber-900',
    btn:        'text-amber-700 hover:text-amber-900',
    panelTag:   'bg-amber-50 text-amber-700 ring-amber-200',
    dot:        'bg-amber-500',
  },
  violet: {
    gradient:   'from-violet-500 to-purple-700',
    gradientAlt:'from-violet-600 to-fuchsia-700',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-violet-100/80',
    tagFg:      'text-violet-800',
    btn:        'text-violet-600 hover:text-violet-800',
    panelTag:   'bg-violet-50 text-violet-700 ring-violet-200',
    dot:        'bg-violet-500',
  },
  indigo: {
    gradient:   'from-indigo-500 to-blue-700',
    gradientAlt:'from-indigo-600 to-violet-700',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-indigo-100/80',
    tagFg:      'text-indigo-800',
    btn:        'text-indigo-600 hover:text-indigo-800',
    panelTag:   'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dot:        'bg-indigo-500',
  },
  slate: {
    gradient:   'from-slate-500 to-slate-700',
    gradientAlt:'from-slate-600 to-slate-800',
    count:      'bg-white/20 text-white ring-white/30',
    tagBg:      'bg-slate-100/80',
    tagFg:      'text-slate-700',
    btn:        'text-slate-600 hover:text-slate-800',
    panelTag:   'bg-slate-50 text-slate-600 ring-slate-200',
    dot:        'bg-slate-500',
  },
};
const getAccent = (key) => ACCENT[key] || ACCENT.slate;

const CAT_ICON = {
  electrical: Bolt,
  legal:      FileCheck,
  material:   Package,
  iot:        Cpu,
  software:   Monitor,
};

/* ------------------------------------------------------------------ */
/*  SVG illustration per category (inside header banner)               */
/* ------------------------------------------------------------------ */
function CategoryIllustration({ catKey }) {
  const content = {
    electrical: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="50" cy="50" r="44" stroke="white" strokeWidth="1.5" strokeDasharray="7 4" />
        <circle cx="50" cy="50" r="28" stroke="white" strokeWidth="2" />
        <path d="M50 16 L60 44 H40 L50 84" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="6" fill="white" fillOpacity="0.6" />
        <line x1="10" y1="50" x2="24" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="76" y1="50" x2="90" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    legal: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="20" y="10" width="60" height="80" rx="5" stroke="white" strokeWidth="2" />
        <line x1="32" y1="32" x2="68" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="44" x2="68" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="56" x2="56" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="68" cy="72" r="12" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2" />
        <path d="M62 72 L66 76 L74 66" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    material: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M50 10 L88 66 H12 Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="30" y="52" width="40" height="28" rx="3" stroke="white" strokeWidth="2" />
        <line x1="40" y1="52" x2="40" y2="80" stroke="white" strokeWidth="1.5" />
        <line x1="60" y1="52" x2="60" y2="80" stroke="white" strokeWidth="1.5" />
        <line x1="30" y1="65" x2="70" y2="65" stroke="white" strokeWidth="1.5" />
        <circle cx="50" cy="32" r="5" fill="white" fillOpacity="0.4" />
      </svg>
    ),
    iot: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="50" cy="50" r="8" fill="white" fillOpacity="0.7" />
        <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="36" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="16" cy="28" r="5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5" />
        <circle cx="84" cy="28" r="5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5" />
        <circle cx="50" cy="88" r="5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5" />
        <circle cx="16" cy="72" r="5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5" />
        <circle cx="84" cy="72" r="5" fill="white" fillOpacity="0.5" stroke="white" strokeWidth="1.5" />
        <line x1="20" y1="31" x2="33" y2="38" stroke="white" strokeWidth="1.5" />
        <line x1="80" y1="31" x2="67" y2="38" stroke="white" strokeWidth="1.5" />
        <line x1="50" y1="83" x2="50" y2="70" stroke="white" strokeWidth="1.5" />
        <line x1="20" y1="68" x2="32" y2="61" stroke="white" strokeWidth="1.5" />
        <line x1="80" y1="68" x2="68" y2="61" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
    software: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect x="8" y="18" width="84" height="58" rx="5" stroke="white" strokeWidth="2" />
        <line x1="8" y1="32" x2="92" y2="32" stroke="white" strokeWidth="2" />
        <circle cx="20" cy="25" r="3" fill="white" fillOpacity="0.7" />
        <circle cx="30" cy="25" r="3" fill="white" fillOpacity="0.7" />
        <circle cx="40" cy="25" r="3" fill="white" fillOpacity="0.7" />
        <path d="M20 48 L28 55 L20 62" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="34" y1="62" x2="55" y2="62" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="34" y1="48" x2="80" y2="48" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="34" y1="55" x2="72" y2="55" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="80" x2="64" y2="80" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 lg:w-28 lg:h-28 opacity-30 pointer-events-none hidden sm:block">
      {content[catKey] || null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */
export default function ServicesSection() {
  const { data: services, loading, error } = useServices();

  const groups = useMemo(() => {
    const map = new Map();
    SERVICE_CATEGORIES.forEach((c) => map.set(c.key, []));

    (services || []).forEach((s) => {
      const key = s.category || 'electrical';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });

    for (const arr of map.values()) {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    const ordered = [];
    SERVICE_CATEGORIES.forEach((c) => {
      const items = map.get(c.key) || [];
      if (items.length) ordered.push({ meta: c, items });
    });
    [...map.entries()].forEach(([k, items]) => {
      if (!SERVICE_CATEGORIES.find((c) => c.key === k) && items.length) {
        ordered.push({ meta: getCategoryMeta(k), items });
      }
    });
    return ordered;
  }, [services]);

  return (
    <section id="services" className="py-20 lg:py-28 bg-slate-50">
      <div className="container mx-auto px-6 lg:px-12">
        <SectionHeader
          eyebrow="Layanan Kami"
          title="Solusi menyeluruh untuk bisnis Anda"
          subtitle="Dari instalasi industri, sertifikasi resmi, suplai material, otomasi cerdas, hingga pengembangan software — kami menanganinya end-to-end."
        />

        {loading ? (
          <ServicesSkeleton />
        ) : error ? (
          <EmptyState message="Gagal memuat layanan. Silakan coba lagi." />
        ) : !groups.length ? (
          <EmptyState message="Belum ada layanan yang ditampilkan." />
        ) : (
          <div className="space-y-16">
            {groups.map((g) => (
              <CategoryBlock key={g.meta.key} meta={g.meta} items={g.items} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Category block                                                      */
/* ------------------------------------------------------------------ */
function CategoryBlock({ meta, items }) {
  const a = getAccent(meta.accent);
  const CatIcon = CAT_ICON[meta.key] || Zap;
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild;
    if (!firstCard) return;
    // gap-4 = 16px
    const slot = firstCard.offsetWidth + 16;
    setActiveIdx(Math.min(Math.max(0, Math.round(el.scrollLeft / slot)), items.length - 1));
  };

  const scrollToIdx = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild;
    if (!firstCard) return;
    const slot = firstCard.offsetWidth + 16;
    el.scrollTo({ left: i * slot, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55 }}
    >
      {/* Category header banner */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${a.gradient} mb-6`}>
        {/* Decorative blob shapes */}
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-52 h-52 rounded-full bg-black/10 pointer-events-none" />

        {/* SVG illustration */}
        <CategoryIllustration catKey={meta.key} />

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4 p-6 lg:p-7 pr-28 sm:pr-36">
          {/* Icon box */}
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/30 shadow-inner">
            <CatIcon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
          </div>

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg lg:text-2xl font-bold text-white leading-snug">
                {meta.title}
              </h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${a.count}`}>
                {items.length} layanan
              </span>
            </div>
            {meta.subtitle && (
              <p className="mt-1 text-sm text-white/75 leading-relaxed line-clamp-1">
                {meta.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card carousel (mobile) / grid (desktop sm+) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((s, idx) => (
          <ServiceCard key={s.id} service={s} a={a} index={idx} catKey={meta.key} />
        ))}
      </div>

      {/* Dot indicators — mobile carousel only */}
      {items.length > 1 && (
        <div className="flex justify-center items-center gap-2 mt-3 sm:hidden">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIdx(i)}
              aria-label={`Layanan ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === activeIdx ? `w-5 h-2 ${a.dot}` : 'w-2 h-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service card — slide-up reveal                                      */
/*  Mobile: tap to open/close via React state                           */
/*  Desktop (sm+): CSS group-hover takes over, state has no effect      */
/* ------------------------------------------------------------------ */
function ServiceCard({ service, a, index, catKey }) {
  const Icon = resolveIcon(service);
  const tags = getServiceTags(service, catKey);
  const [revealed, setRevealed] = useState(false);
  const hasImage = Boolean(service.image);

  // Rotate gradient direction per card to break visual monotony
  const gradientDir = ['to-br', 'to-tr', 'to-b', 'to-r'][index % 4];

  // Mobile: state controls visibility. Desktop: CSS group-hover overrides.
  const revealClass = revealed
    ? 'translate-y-0'
    : 'translate-y-full sm:translate-y-full sm:group-hover:translate-y-0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="h-60 flex-shrink-0 snap-start w-[75vw] max-w-[230px] sm:w-auto sm:max-w-none"
    >
      <div
        className="relative w-full h-full overflow-hidden rounded-2xl cursor-pointer select-none group"
        onClick={() => setRevealed((r) => !r)}
        role="button"
        tabIndex={0}
        aria-label={service.title}
        onKeyDown={(e) => e.key === 'Enter' && setRevealed((r) => !r)}
      >
        {/* ── Front face ── */}
        <div className={`absolute inset-0 bg-gradient-${gradientDir} ${a.gradient} flex flex-col items-start justify-between p-5`}>

          {/* Full-bleed photo + category overlay (only when image exists) */}
          {hasImage && (
            <>
              <img
                src={service.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-${gradientDir} ${a.gradient} opacity-70`} />
            </>
          )}

          {/* Top row: order number + tags */}
          <div className="relative z-10 flex items-center justify-between w-full">
            <span className="text-white/40 text-xs font-mono tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.tagBg} ${a.tagFg} backdrop-blur-sm`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Center: icon — only when no image */}
          {!hasImage && (
            <div className="relative z-10 flex-1 flex items-center justify-center w-full">
              <div className="absolute w-24 h-24 rounded-full bg-white/10 blur-sm" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 ring-2 ring-white/30 flex items-center justify-center shadow-lg">
                <Icon className="w-9 h-9 text-white drop-shadow-md" />
              </div>
            </div>
          )}

          {/* Bottom: title + mobile hint */}
          <div className="relative z-10 w-full">
            <h4 className="font-bold text-white text-sm lg:text-base leading-snug line-clamp-2">
              {service.title}
            </h4>
            <p className="mt-1 text-white/50 text-xs sm:hidden">Ketuk untuk detail</p>
          </div>

          {/* Decorative circles — only without image */}
          {!hasImage && (
            <>
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-10 -left-8 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />
            </>
          )}
        </div>

        {/* ── Reveal panel ── */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 bg-white/95 backdrop-blur-sm rounded-t-2xl p-4 sm:p-5 transition-transform duration-300 ease-out ${revealClass}`}
          style={{ height: '88%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header: title + close btn (mobile only) */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                  {service.title}
                </h4>
              </div>
              <button
                className="sm:hidden flex-shrink-0 p-1 -mr-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                onClick={(e) => { e.stopPropagation(); setRevealed(false); }}
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tag chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${a.panelTag}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1 overflow-hidden line-clamp-5">
              {service.description}
            </p>

            {/* CTA */}
            <a
              href={service.link || '#'}
              className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${a.btn} transition-colors`}
              onClick={(e) => e.stopPropagation()}
            >
              Lihat detail
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header — exported for reuse by other sections              */
/* ------------------------------------------------------------------ */
export function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-3xl mb-14">
      {eyebrow && (
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base lg:text-lg text-slate-600 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
