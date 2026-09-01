// src/components/landing/ServicesSection.jsx
import { useMemo, useRef, useEffect } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Zap, Lightbulb, FileCheck, Cable, Wrench, ShieldCheck,
  Factory, Home as HomeIcon, Cpu, Activity, Plug, Bolt,
  ArrowRight, Monitor, Globe, Smartphone, Database,
  ClipboardList, Settings, Package, Server, Code, LayoutDashboard,
  Gauge, Radio, Building2, HardDrive, BarChart2, Cloud,
  MessageCircle, ChevronRight, Sparkles, Layers, BadgeCheck,
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

function resolveIcon(service) {
  const t = (service.title || '').toLowerCase();
  if (t.includes('pju') || t.includes('lampu') || t.includes('cahaya')) return Lightbulb;
  if (t.includes('perawatan') || t.includes('perbaikan') || t.includes('maintenance')) return Wrench;
  if (t.includes('cubicle') || t.includes('panel')) return Cpu;
  if (t.includes('pasang baru') || t.includes('instalasi baru')) return Plug;
  if (t.includes('nidi') || t.includes('slo') || t.includes('sertifikat')) return FileCheck;
  if (t.includes('drawing') || t.includes('perencanaan') || t.includes('gambar')) return Code;
  if (t.includes('transformator') || t.includes('trafo')) return Zap;
  if (t.includes('relay')) return Activity;
  if (t.includes('breaker') || t.includes('acb') || t.includes('vcb') || t.includes('mccb')) return ShieldCheck;
  if (t.includes('tambah daya') || (t.includes('tambah') && t.includes('daya'))) return Bolt;
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
  return ICON_MAP[service.icon] || Zap;
}

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
/*  Accent config                                                        */
/* ------------------------------------------------------------------ */
const ACCENT = {
  emerald: {
    glow:        'shadow-emerald-500/20',
    glowStrong:  'shadow-emerald-500/40',
    border:      'border-emerald-500/30',
    borderHov:   'hover:border-emerald-400/60',
    iconRing:    'ring-emerald-400/40',
    iconBg:      'bg-emerald-500/20',
    iconColor:   'text-emerald-300',
    tagBg:       'bg-emerald-500/15',
    tagFg:       'text-emerald-300',
    tagRing:     'ring-emerald-500/30',
    dot:         'bg-emerald-400',
    tabActive:   'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
    tabGlow:     'shadow-emerald-500/30',
    gradient:    'from-emerald-500 to-teal-600',
    ctaBtn:      'text-emerald-300 hover:text-emerald-100',
    ctaBtnBg:    'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 ring-emerald-500/40',
    number:      'text-emerald-400',
    featuredBg:  'from-emerald-950/60 to-teal-950/40',
    divider:     'border-emerald-500/20',
  },
  sky: {
    glow:        'shadow-sky-500/20',
    glowStrong:  'shadow-sky-500/40',
    border:      'border-sky-500/30',
    borderHov:   'hover:border-sky-400/60',
    iconRing:    'ring-sky-400/40',
    iconBg:      'bg-sky-500/20',
    iconColor:   'text-sky-300',
    tagBg:       'bg-sky-500/15',
    tagFg:       'text-sky-300',
    tagRing:     'ring-sky-500/30',
    dot:         'bg-sky-400',
    tabActive:   'bg-sky-500/20 border-sky-400/50 text-sky-300',
    tabGlow:     'shadow-sky-500/30',
    gradient:    'from-sky-500 to-blue-600',
    ctaBtn:      'text-sky-300 hover:text-sky-100',
    ctaBtnBg:    'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 ring-sky-500/40',
    number:      'text-sky-400',
    featuredBg:  'from-sky-950/60 to-blue-950/40',
    divider:     'border-sky-500/20',
  },
  amber: {
    glow:        'shadow-amber-500/20',
    glowStrong:  'shadow-amber-500/40',
    border:      'border-amber-500/30',
    borderHov:   'hover:border-amber-400/60',
    iconRing:    'ring-amber-400/40',
    iconBg:      'bg-amber-500/20',
    iconColor:   'text-amber-300',
    tagBg:       'bg-amber-500/15',
    tagFg:       'text-amber-300',
    tagRing:     'ring-amber-500/30',
    dot:         'bg-amber-400',
    tabActive:   'bg-amber-500/20 border-amber-400/50 text-amber-300',
    tabGlow:     'shadow-amber-500/30',
    gradient:    'from-amber-500 to-orange-500',
    ctaBtn:      'text-amber-300 hover:text-amber-100',
    ctaBtnBg:    'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 ring-amber-500/40',
    number:      'text-amber-400',
    featuredBg:  'from-amber-950/60 to-orange-950/40',
    divider:     'border-amber-500/20',
  },
  violet: {
    glow:        'shadow-violet-500/20',
    glowStrong:  'shadow-violet-500/40',
    border:      'border-violet-500/30',
    borderHov:   'hover:border-violet-400/60',
    iconRing:    'ring-violet-400/40',
    iconBg:      'bg-violet-500/20',
    iconColor:   'text-violet-300',
    tagBg:       'bg-violet-500/15',
    tagFg:       'text-violet-300',
    tagRing:     'ring-violet-500/30',
    dot:         'bg-violet-400',
    tabActive:   'bg-violet-500/20 border-violet-400/50 text-violet-300',
    tabGlow:     'shadow-violet-500/30',
    gradient:    'from-violet-500 to-purple-600',
    ctaBtn:      'text-violet-300 hover:text-violet-100',
    ctaBtnBg:    'bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 ring-violet-500/40',
    number:      'text-violet-400',
    featuredBg:  'from-violet-950/60 to-purple-950/40',
    divider:     'border-violet-500/20',
  },
  indigo: {
    glow:        'shadow-indigo-500/20',
    glowStrong:  'shadow-indigo-500/40',
    border:      'border-indigo-500/30',
    borderHov:   'hover:border-indigo-400/60',
    iconRing:    'ring-indigo-400/40',
    iconBg:      'bg-indigo-500/20',
    iconColor:   'text-indigo-300',
    tagBg:       'bg-indigo-500/15',
    tagFg:       'text-indigo-300',
    tagRing:     'ring-indigo-500/30',
    dot:         'bg-indigo-400',
    tabActive:   'bg-indigo-500/20 border-indigo-400/50 text-indigo-300',
    tabGlow:     'shadow-indigo-500/30',
    gradient:    'from-indigo-500 to-blue-700',
    ctaBtn:      'text-indigo-300 hover:text-indigo-100',
    ctaBtnBg:    'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 ring-indigo-500/40',
    number:      'text-indigo-400',
    featuredBg:  'from-indigo-950/60 to-blue-950/40',
    divider:     'border-indigo-500/20',
  },
  slate: {
    glow:        'shadow-slate-500/20',
    glowStrong:  'shadow-slate-500/30',
    border:      'border-slate-500/30',
    borderHov:   'hover:border-slate-400/50',
    iconRing:    'ring-slate-400/40',
    iconBg:      'bg-slate-500/20',
    iconColor:   'text-slate-300',
    tagBg:       'bg-slate-500/15',
    tagFg:       'text-slate-300',
    tagRing:     'ring-slate-500/30',
    dot:         'bg-slate-400',
    tabActive:   'bg-slate-500/20 border-slate-400/50 text-slate-300',
    tabGlow:     'shadow-slate-500/20',
    gradient:    'from-slate-600 to-slate-700',
    ctaBtn:      'text-slate-300 hover:text-slate-100',
    ctaBtnBg:    'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 ring-slate-500/40',
    number:      'text-slate-400',
    featuredBg:  'from-slate-900/60 to-slate-800/40',
    divider:     'border-slate-500/20',
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
/*  Ambient background                                                   */
/* ------------------------------------------------------------------ */
function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 10% 10%, rgba(245,158,11,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 90% 90%, rgba(14,165,233,0.06) 0%, transparent 70%), radial-gradient(ellipse 70% 30% at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)" }} />
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="svc-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#f59e0b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#svc-dots)" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3D tilt card (used for regular cards only)                           */
/* ------------------------------------------------------------------ */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 400, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 400, damping: 30 });
  const scale   = useSpring(1, { stiffness: 400, damping: 30 });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top)  / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, scale, transformStyle: 'preserve-3d', perspective: 800 }}
      onMouseMove={handleMove}
      onMouseEnter={() => scale.set(1.02)}
      onMouseLeave={() => { x.set(0); y.set(0); scale.set(1); }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento variant resolver                                              */
/* ------------------------------------------------------------------ */
function getBentoVariant(idx) {
  if (idx === 0) return 'featured';
  const cycle = (idx - 1) % 6;
  if (cycle >= 4) return 'wide';
  return 'regular';
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */
export default function ServicesSection() {
  const { data: services, loading, error } = useServices();
  const [activeTab, setActiveTab] = useState(0);

  const groups = useMemo(() => {
    const map = new Map();
    SERVICE_CATEGORIES.forEach((c) => map.set(c.key, []));
    (services || []).forEach((s) => {
      const key = s.category || 'electrical';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    for (const arr of map.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const ordered = [];
    SERVICE_CATEGORIES.forEach((c) => {
      const items = map.get(c.key) || [];
      if (items.length) ordered.push({ meta: c, items });
    });
    [...map.entries()].forEach(([k, items]) => {
      if (!SERVICE_CATEGORIES.find((c) => c.key === k) && items.length)
        ordered.push({ meta: getCategoryMeta(k), items });
    });
    return ordered;
  }, [services]);

  const totalServices = useMemo(() => groups.reduce((s, g) => s + g.items.length, 0), [groups]);
  const safeTab = Math.min(activeTab, Math.max(0, groups.length - 1));
  const activeGroup = groups[safeTab];

  return (
    <section id="services" className="relative py-24 lg:py-32 bg-[#080d1a] overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10 container mx-auto px-6 lg:px-12">

        {/* ── Section header ── */}
        <PremiumSectionHeader
          eyebrow="Layanan Kami"
          title={<>Solusi menyeluruh<br className="hidden sm:block" /> untuk bisnis Anda</>}
          subtitle="Dari instalasi industri, sertifikasi resmi, suplai material, otomasi cerdas, hingga pengembangan software — kami menanganinya end-to-end."
        />

        {/* ── Stats row ── */}
        {!loading && !error && groups.length > 0 && (
          <StatsRow catCount={groups.length} serviceCount={totalServices} />
        )}

        {loading ? (
          <div className="mt-12"><ServicesSkeleton /></div>
        ) : error ? (
          <DarkEmptyState message="Gagal memuat layanan. Silakan coba lagi." />
        ) : !groups.length ? (
          <DarkEmptyState message="Belum ada layanan yang ditampilkan." />
        ) : (
          <>
            {/* ── Tab navigation ── */}
            <CategoryTabs groups={groups} activeTab={safeTab} onTabChange={setActiveTab} />

            {/* ── Bento grid ── */}
            <AnimatePresence mode="wait">
              {activeGroup && (
                <motion.div
                  key={activeGroup.meta.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <BentoGrid group={activeGroup} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── CTA strip ── */}
            <CtaStrip />
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Premium section header                                              */
/* ------------------------------------------------------------------ */
function PremiumSectionHeader({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      className="max-w-3xl mb-8"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {eyebrow && (
        <motion.div
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="h-px w-8 bg-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            {eyebrow}
          </span>
        </motion.div>
      )}

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight">
        {title}
      </h2>

      <motion.div
        className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      />

      {subtitle && (
        <motion.p
          className="mt-5 text-base lg:text-lg text-slate-400 leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats row — trust signals                                           */
/* ------------------------------------------------------------------ */
function StatsRow({ catCount, serviceCount }) {
  const stats = [
    { icon: Layers,     label: `${catCount} Kategori`,        sub: 'bidang layanan' },
    { icon: BadgeCheck, label: `${serviceCount}+ Layanan`,    sub: 'solusi tersedia' },
    { icon: ShieldCheck, label: 'Bergaransi',                 sub: 'standar industri' },
  ];

  return (
    <motion.div
      className="flex flex-wrap items-center gap-3 mb-10"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {stats.map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
        >
          <Icon size={14} className="text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-sm font-bold text-white">{label}</span>
            <span className="hidden sm:inline text-slate-500 text-xs ml-1.5">{sub}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category tab bar                                                    */
/* ------------------------------------------------------------------ */
function CategoryTabs({ groups, activeTab, onTabChange }) {
  const tabRef = useRef(null);

  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    const activeEl = el.children[activeTab];
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const activeGroup = groups[activeTab];

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      {/* Tabs */}
      <div
        ref={tabRef}
        className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {groups.map((g, i) => {
          const a = getAccent(g.meta.accent);
          const CatIcon = CAT_ICON[g.meta.key] || Zap;
          const isActive = i === activeTab;

          return (
            <motion.button
              key={g.meta.key}
              onClick={() => onTabChange(i)}
              whileTap={{ scale: 0.97 }}
              className={`
                relative flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                border text-sm font-semibold transition-all duration-200
                ${isActive
                  ? `${a.tabActive} border shadow-lg ${a.tabGlow}`
                  : 'border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 bg-white/5'
                }
              `}
            >
              <CatIcon size={15} className={isActive ? '' : 'opacity-60'} />
              <span>{g.meta.title}</span>
              <span className={`
                text-[10px] font-bold px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-500'}
              `}>
                {g.items.length}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className={`absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full ${a.dot}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active category subtitle */}
      <AnimatePresence mode="wait">
        {activeGroup?.meta.subtitle && (
          <motion.p
            key={activeGroup.meta.key}
            className="mt-3 text-sm text-slate-500"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeGroup.meta.subtitle}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bento grid                                                          */
/* ------------------------------------------------------------------ */
function BentoGrid({ group }) {
  const a = getAccent(group.meta.accent);

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:auto-rows-[240px] gap-4"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="show"
    >
      {group.items.map((s, idx) => {
        const variant = getBentoVariant(idx);
        const spanClass = {
          featured: 'col-span-1 row-span-2 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2',
          wide:     'col-span-1 sm:col-span-2 lg:col-span-2',
          regular:  'col-span-1',
        }[variant];

        return (
          <motion.div
            key={s.id}
            className={spanClass}
            variants={{
              hidden: { opacity: 0, y: 28, scale: 0.96 },
              show: {
                opacity: 1, y: 0, scale: 1,
                transition: { type: 'spring', stiffness: 260, damping: 22 },
              },
            }}
          >
            {variant === 'featured' && (
              <FeaturedCard service={s} a={a} index={idx} catKey={group.meta.key} />
            )}
            {variant === 'regular' && (
              <TiltCard className="h-full">
                <RegularCard service={s} a={a} index={idx} catKey={group.meta.key} />
              </TiltCard>
            )}
            {variant === 'wide' && (
              <WideCard service={s} a={a} index={idx} catKey={group.meta.key} />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Featured card — 2×2, full rich info                                */
/* ------------------------------------------------------------------ */
function FeaturedCard({ service, a, index, catKey }) {
  const Icon = resolveIcon(service);
  const tags = getServiceTags(service, catKey);

  return (
    <div className={`
      relative h-full min-h-[380px] sm:min-h-0 rounded-2xl overflow-hidden flex flex-col
      bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-white/[0.02]
      border ${a.border} shadow-2xl ${a.glowStrong}
      backdrop-blur-sm
      transition-shadow duration-300
      hover:shadow-[0_25px_60px_-10px] hover:${a.glowStrong}
    `}>
      {/* Corner glow */}
      <div className={`absolute -top-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-br ${a.gradient} opacity-15 blur-3xl`} />
      <div className={`absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-tl ${a.gradient} opacity-10 blur-2xl`} />

      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative z-10 flex flex-col h-full p-6 lg:p-7">
        {/* Badge row */}
        <div className="flex items-center justify-between mb-5">
          <span className={`
            inline-flex items-center gap-1.5
            text-[10px] font-bold uppercase tracking-widest
            px-2.5 py-1 rounded-full
            bg-gradient-to-r ${a.gradient} text-white shadow-md
          `}>
            <Sparkles size={9} />
            Unggulan
          </span>
          <span className={`text-xs font-mono tabular-nums ${a.number} opacity-50`}>
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Icon */}
        <div className="mb-5">
          <div className={`
            relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl
            ${a.iconBg} ring-2 ${a.iconRing}
            flex items-center justify-center shadow-lg
          `}>
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${a.gradient} opacity-25 blur-sm`} />
            <Icon className={`relative z-10 w-7 h-7 lg:w-8 lg:h-8 ${a.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-white text-xl lg:text-2xl leading-tight mb-3">
          {service.title}
        </h4>

        {/* Description — always visible */}
        <p className="text-slate-400 text-sm leading-relaxed flex-1 line-clamp-4">
          {service.description || 'Layanan profesional sesuai standar industri dengan jaminan kualitas terbaik.'}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ring-1 ${a.tagBg} ${a.tagFg} ${a.tagRing}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <motion.a
          href={service.link || '#contact'}
          className={`
            mt-5 inline-flex items-center justify-center gap-2
            px-5 py-3 rounded-xl font-bold text-sm
            bg-gradient-to-r ${a.gradient} text-white
            shadow-lg transition-opacity duration-200
            hover:opacity-90 w-full sm:w-auto
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Konsultasi Sekarang
          <ArrowRight size={15} />
        </motion.a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Regular card — 1×1                                                  */
/* ------------------------------------------------------------------ */
function RegularCard({ service, a, index, catKey }) {
  const Icon = resolveIcon(service);
  const tags = getServiceTags(service, catKey);

  return (
    <div className={`
      relative h-full min-h-[180px] sm:min-h-0 rounded-2xl overflow-hidden flex flex-col
      bg-white/[0.04] backdrop-blur-sm
      border ${a.border} ${a.borderHov}
      shadow-lg ${a.glow}
      transition-all duration-300
      hover:shadow-xl hover:bg-white/[0.06]
    `}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative z-10 flex flex-col h-full p-4 lg:p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-mono tabular-nums ${a.number} opacity-50`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          {tags.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ring-1 ${a.tagBg} ${a.tagFg} ${a.tagRing}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-xl mb-3 flex-shrink-0
          ${a.iconBg} ring-1 ${a.iconRing}
          flex items-center justify-center
        `}>
          <Icon className={`w-5 h-5 ${a.iconColor}`} />
        </div>

        {/* Title */}
        <h4 className="font-bold text-white text-sm leading-snug mb-1.5 line-clamp-2">
          {service.title}
        </h4>

        {/* Description — always visible */}
        <p className="text-slate-500 text-[11px] leading-relaxed flex-1 line-clamp-2">
          {service.description || 'Layanan profesional berstandar industri.'}
        </p>

        {/* CTA */}
        <a
          href={service.link || '#contact'}
          className={`mt-3 inline-flex items-center gap-1 text-[11px] font-semibold ${a.ctaBtn} transition-colors`}
        >
          Lihat detail
          <ArrowRight size={11} />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wide card — 2×1, horizontal layout                                  */
/* ------------------------------------------------------------------ */
function WideCard({ service, a, index, catKey }) {
  const Icon = resolveIcon(service);
  const tags = getServiceTags(service, catKey);

  return (
    <div className={`
      relative h-full min-h-[120px] sm:min-h-0 rounded-2xl overflow-hidden
      flex items-center
      bg-white/[0.04] backdrop-blur-sm
      border ${a.border} ${a.borderHov}
      shadow-lg ${a.glow}
      transition-all duration-300
      hover:shadow-xl hover:bg-white/[0.06]
      group
    `}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Left: Icon column */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-center px-5 lg:px-6">
        <div className={`
          w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex-shrink-0
          ${a.iconBg} ring-2 ${a.iconRing}
          flex items-center justify-center shadow-md
          transition-transform duration-300 group-hover:scale-105
        `}>
          <Icon className={`w-6 h-6 lg:w-7 lg:h-7 ${a.iconColor}`} />
        </div>
      </div>

      {/* Divider */}
      <div className={`flex-shrink-0 self-stretch w-px my-4 border-l ${a.divider}`} />

      {/* Right: Content */}
      <div className="relative z-10 flex-1 flex items-center justify-between gap-3 px-5 py-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-mono tabular-nums ${a.number} opacity-50`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${a.tagBg} ${a.tagFg} ${a.tagRing}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <h4 className="font-bold text-white text-sm lg:text-base leading-snug truncate">
            {service.title}
          </h4>
          <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-1 mt-0.5">
            {service.description || 'Layanan profesional berstandar industri.'}
          </p>
        </div>

        <a
          href={service.link || '#contact'}
          className={`
            flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold
            px-3 py-2 rounded-lg ring-1 ${a.ctaBtnBg}
            transition-all duration-200 hover:scale-[1.03]
          `}
        >
          <span className="hidden sm:inline">Detail</span>
          <ChevronRight size={13} />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA strip                                                           */
/* ------------------------------------------------------------------ */
function CtaStrip() {
  return (
    <motion.div
      className="mt-14 relative rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55 }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent" />
      <div className="absolute inset-0 border border-amber-500/20 rounded-2xl" />
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-amber-600" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-6 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
            Butuh solusi lain?
          </p>
          <h3 className="text-xl lg:text-2xl font-bold text-white">
            Konsultasi gratis dengan tim kami
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Kami siap merancang solusi yang tepat sesuai kebutuhan Anda.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <motion.a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-3 rounded-xl transition-colors duration-200 shadow-lg shadow-amber-500/25"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <MessageCircle size={16} />
            WhatsApp Sekarang
          </motion.a>
          <motion.a
            href="#contact"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            whileHover={{ x: 3 }}
          >
            Hubungi kami
            <ChevronRight size={15} />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header — exported for reuse                                 */
/* ------------------------------------------------------------------ */
export function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-3xl mb-14">
      {eyebrow && (
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 leading-tight">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-base lg:text-lg text-slate-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function DarkEmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center mt-8">
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
