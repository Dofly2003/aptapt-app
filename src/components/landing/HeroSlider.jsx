import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';

import { useSlides, useSettings } from '../../hooks/useContent';
import HeroSkeleton from './skeletons/HeroSkeleton';

const AUTOPLAY_DELAY = 6000;

/* Chip default per mockupType jika belum diisi di CMS */
const DEFAULT_CHIPS = {
  dashboard:   ['Web Dashboard', 'Admin Panel', 'Laporan Real-time'],
  mobile:      ['Aplikasi Mobile', 'Custom ERP', 'Otomasi Proses'],
  integration: ['UI/UX Design', 'Integrasi API', 'Company Profile'],
};

/* ─── MOCKUP: Dashboard ──────────────────────────────────── */

function DashboardMockup() {
  return (
    <div style={{ width: 680, background: '#fbf6f1', borderRadius: 20, boxShadow: '0 40px 90px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
      <div style={{ height: 44, background: '#efe7df', display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: '#d6cabd' }} />
        ))}
        <div style={{ marginLeft: 16, height: 22, flex: 1, maxWidth: 320, background: '#fff', borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', height: 380 }}>
        <div style={{ width: 72, background: '#241f1b', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ee7a3c', marginBottom: 4 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ width: 28, height: 10, borderRadius: 5, background: i === 0 ? '#ee7a3c' : '#4a423b' }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#2a2420' }}>Dashboard Operasional</div>
            <div style={{ background: '#ee7a3c', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 7 }}>Export</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Pendapatan', val: 'Rp 1,24M', delta: '▲ 12%' },
              { label: 'Pesanan', val: '3.480', delta: '▲ 8%' },
              { label: 'Efisiensi', val: '94%', delta: '▲ 24%' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#fff', border: '1px solid #ece2d8', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: '#9a8c7f' }}>{s.label}</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 19, color: '#2a2420' }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#3a9d6b', fontWeight: 600 }}>{s.delta}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #ece2d8', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#9a8c7f', fontWeight: 500 }}>Performa Bulanan</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              {[45, 68, 52, 88, 60, 78, 48].map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: '5px 5px 0 0', height: `${h}%`, background: i === 3 ? '#ee7a3c' : i === 5 ? '#f3a06b' : '#f0d9c8' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MOCKUP: Mobile + ERP ───────────────────────────────── */

function MobileERPMockup() {
  const rows = [
    { w1: 130, w2: 80, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
    { w1: 110, w2: 70, status: 'Cuti', stBg: '#fbe8da', stColor: '#d07a32' },
    { w1: 140, w2: 60, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
    { w1: 100, w2: 85, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
  ];
  return (
    <div style={{ position: 'relative', width: 580, height: 480 }}>
      <div style={{ position: 'absolute', left: 0, top: 20, width: 400, background: '#fbf6f1', borderRadius: 14, boxShadow: '0 30px 70px rgba(0,0,0,0.40)', overflow: 'hidden' }}>
        <div style={{ height: 36, background: '#efe7df', display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px' }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: '#d6cabd' }} />
          ))}
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 15, color: '#2a2420' }}>Manajemen Data Karyawan</div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ead9cc', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <div style={{ width: r.w1, height: 8, background: '#2a2420', borderRadius: 4 }} />
                <div style={{ width: r.w2, height: 6, background: '#cdbfb2', borderRadius: 4 }} />
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: r.stBg, color: r.stColor }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, bottom: 0, width: 218, height: 440, background: '#241f1b', borderRadius: 34, padding: 10, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ width: '100%', height: '100%', background: '#fbf6f1', borderRadius: 25, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#ee7a3c', padding: '26px 18px 18px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 11, opacity: 0.85 }}>ADYTIA Mobile</div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20 }}>Rp 24,5Jt</div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>Saldo Operasional</div>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ fontSize: 11, color: '#9a8c7f', fontWeight: 600 }}>Transaksi Terbaru</div>
            {[
              { bg: '#fbe8da', amt: '+1,2Jt', w1: 70, w2: 44 },
              { bg: '#e3f3ea', amt: '+820rb', w1: 60, w2: 52 },
              { bg: '#fbe8da', amt: '+3,4Jt', w1: 80, w2: 38 },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ width: t.w1, height: 7, background: '#2a2420', borderRadius: 4 }} />
                  <div style={{ width: t.w2, height: 5, background: '#cdbfb2', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2a2420' }}>{t.amt}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 48, borderTop: '1px solid #ece2d8', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 18px' }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#ee7a3c' : '#cdbfb2' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MOCKUP: Integration API ────────────────────────────── */

function IntegrationMockup() {
  const floatingChips = [
    { label: 'Payment Gateway', color: '#3a9d6b', top: 14, left: -16, right: 'auto', bottom: 'auto', anim: 'aptfloat 6s ease-in-out infinite' },
    { label: 'WhatsApp API', color: '#25d366', top: 50, right: -28, left: 'auto', bottom: 'auto', anim: 'aptfloat2 7s ease-in-out infinite' },
    { label: 'Google Maps', color: '#3b82f6', bottom: 70, left: -22, right: 'auto', top: 'auto', anim: 'aptfloat2 6.5s ease-in-out infinite' },
    { label: 'Email SMTP', color: '#ee7a3c', bottom: 34, right: -12, left: 'auto', top: 'auto', anim: 'aptfloat 7.5s ease-in-out infinite' },
  ];
  return (
    <div style={{ position: 'relative', width: 580, height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 310, background: '#fbf6f1', borderRadius: 18, boxShadow: '0 36px 80px rgba(0,0,0,0.45)', padding: 22, display: 'flex', flexDirection: 'column', gap: 15, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#ee7a3c', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
            <div style={{ width: 110, height: 10, background: '#2a2420', borderRadius: 5 }} />
            <div style={{ width: 70, height: 7, background: '#cdbfb2', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#9a8c7f' }}>Nama Proyek</div>
          <div style={{ height: 34, background: '#fff', border: '1px solid #e3d7cb', borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#9a8c7f' }}>Status Integrasi</div>
          <div style={{ height: 34, background: '#fff', border: '1px solid #e3d7cb', borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '6px 12px', borderRadius: 7, background: '#ee7a3c', color: '#fff', fontSize: 11, fontWeight: 600 }}>Aktif</span>
          <span style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e3d7cb', color: '#9a8c7f', fontSize: 11 }}>Draf</span>
          <span style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e3d7cb', color: '#9a8c7f', fontSize: 11 }}>Arsip</span>
        </div>
        <div style={{ background: '#ee7a3c', color: '#fff', textAlign: 'center', padding: 11, borderRadius: 9, fontWeight: 600, fontSize: 13 }}>
          Simpan &amp; Publikasikan
        </div>
      </div>
      {floatingChips.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: c.top, left: c.left, right: c.right, bottom: c.bottom,
            background: '#fff',
            borderRadius: 11,
            boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            padding: '9px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, fontWeight: 600, color: '#2a2420',
            animation: c.anim,
            zIndex: 3,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
          {c.label}
        </div>
      ))}
    </div>
  );
}

const MOCKUP_MAP = {
  dashboard: DashboardMockup,
  mobile: MobileERPMockup,
  integration: IntegrationMockup,
};

/* ─── SLIDE: image-based (existing CMS slides) ───────────── */

function ImageSlide({ slide, settings }) {
  const focalMobile = slide.focalPointMobile || '30% center';
  const focalDesktop = slide.focalPointDesktop || 'center';
  const hasButtons = Array.isArray(slide.buttons) && slide.buttons.length > 0;
  const hasLegacyCta = slide.ctaText && slide.ctaLink;

  return (
    <div className="relative w-full h-full">
      {/* Background image */}
      <img
        src={slide.image}
        alt={slide.title || 'Hero'}
        loading="eager"
        decoding="async"
        style={{ objectPosition: focalMobile }}
        className="md:hidden absolute inset-0 w-full h-full object-cover"
      />
      <img
        src={slide.image}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        style={{ objectPosition: focalDesktop }}
        className="hidden md:block absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-[1200ms] ease-out"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 md:hidden bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-slate-900/15" />
      <div className="absolute inset-0 hidden md:block bg-gradient-to-tr from-slate-950/92 via-slate-900/55 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full container mx-auto px-5 sm:px-6 lg:px-12 pb-16 md:pb-20 lg:pb-24">
          {(slide.eyebrow || settings?.heroBadge) && (
            <div className="inline-flex items-center gap-2.5 mb-4 md:mb-5">
              <span className="w-7 h-[2px] bg-amber-400 rounded-full" />
              <span className="font-barlow text-amber-400 font-semibold uppercase text-[11px] md:text-xs tracking-[0.3em] drop-shadow-md">
                {slide.eyebrow || settings?.heroBadge}
              </span>
            </div>
          )}
          <h1
            className="font-barlow-condensed font-black uppercase leading-[0.9] tracking-tight text-white text-[40px] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-4 md:mb-5"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.95),4px 4px 0 rgba(0,0,0,0.75),6px 6px 0 rgba(0,0,0,0.5),8px 8px 16px rgba(0,0,0,0.55)' }}
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <div className="border-l-[3px] border-amber-400/70 pl-4 mt-1 mb-1 max-w-xl">
              <p className="font-barlow text-slate-100/95 text-sm sm:text-base md:text-lg leading-relaxed drop-shadow-md">
                {slide.subtitle}
              </p>
            </div>
          )}
          {(hasButtons || hasLegacyCta) && (
            <div className="flex flex-wrap gap-3 md:gap-4 mt-6 md:mt-8">
              {hasButtons
                ? slide.buttons.map((btn, i) => <ImageCTAButton key={i} button={btn} />)
                : <ImageCTAButton button={{ label: slide.ctaText, url: slide.ctaLink, style: 'primary', showArrow: true }} />
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageCTAButton({ button }) {
  const { label, url, style = 'primary', showArrow } = button;
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/50 hover:-translate-y-0.5 group',
    outline: 'bg-transparent border-2 border-amber-400 text-amber-300 hover:bg-amber-400/10 group',
    glass: 'bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white',
  };
  const isExternal = url && /^https?:\/\//.test(url);
  return (
    <a
      href={url || '#'}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 font-semibold rounded-lg transition-all text-sm md:text-base ${variants[style] || variants.primary}`}
    >
      {label}
      {(showArrow || style === 'primary' || style === 'outline') && (
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      )}
    </a>
  );
}

/* ─── CTA untuk promo slide ──────────────────────────────── */

function PromoCTAs({ slide }) {
  const primaryStyle = { background: '#ee7a3c', color: '#221d19', border: 'none', padding: '13px 26px', borderRadius: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' };
  const outlineStyle = { background: 'transparent', color: '#f2e9e0', border: '1px solid rgba(255,255,255,0.22)', padding: '13px 22px', borderRadius: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 15, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'border-color 0.2s' };

  const hasButtons = Array.isArray(slide?.buttons) && slide.buttons.length > 0;

  if (hasButtons) {
    return (
      <div className="flex flex-wrap gap-3 xl:gap-[14px]">
        {slide.buttons.map((btn, i) => {
          const isExt = /^https?:\/\//.test(btn.url);
          return (
            <a key={i} href={btn.url || '#'} target={isExt ? '_blank' : undefined} rel={isExt ? 'noopener noreferrer' : undefined}
               className={i === 0 ? 'apt-cta-primary' : 'apt-cta-outline'} style={i === 0 ? primaryStyle : outlineStyle}>
              {btn.label}
            </a>
          );
        })}
      </div>
    );
  }

  const primaryLabel = slide?.ctaText || 'Konsultasi Gratis';
  const primaryUrl   = slide?.ctaLink || '#contact';

  return (
    <div className="flex flex-wrap gap-3 xl:gap-[14px]">
      <a href={primaryUrl} className="apt-cta-primary" style={primaryStyle}>{primaryLabel}</a>
      <a href="#layanan"   className="apt-cta-outline" style={outlineStyle}>Lihat Layanan</a>
    </div>
  );
}

/* ─── SLIDE: promo mockup ────────────────────────────────── */

function PromoSlide({ slide }) {
  const chips = Array.isArray(slide.chips) && slide.chips.length
    ? slide.chips
    : (DEFAULT_CHIPS[slide.mockupType] || []);
  const MockupComp = MOCKUP_MAP[slide.mockupType];

  return (
    <div
      className="relative w-full h-full flex items-center overflow-hidden"
      style={{ background: '#221d19', fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Glow dekoratif */}
      <div aria-hidden="true" style={{ position: 'absolute', top: -160, right: -60, width: 780, height: 780, borderRadius: '50%', background: 'radial-gradient(circle, rgba(238,122,60,0.28), rgba(238,122,60,0) 65%)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: -220, left: -120, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(238,122,60,0.10), rgba(238,122,60,0) 68%)', pointerEvents: 'none' }} />

      {/* Kolom kiri: teks */}
      <div
        className="flex flex-col gap-4 xl:gap-6 py-8 sm:py-10 xl:py-0 xl:w-[830px] w-full relative z-10"
        style={{ paddingLeft: 'clamp(20px, 6.77vw, 130px)', paddingRight: 20 }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" style={{ width: 10, height: 10, background: '#ee7a3c', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2.5, color: '#f0a06a', textTransform: 'uppercase' }}>
            {slide.eyebrow}
          </span>
        </div>

        <h1
          className="m-0 text-[32px] sm:text-4xl xl:text-[56px]"
          style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.5, color: '#f7f1ea', maxWidth: 640 }}
        >
          {slide.title}
        </h1>

        {slide.subtitle && (
          <p
            className="m-0 text-sm sm:text-base xl:text-[19px]"
            style={{ lineHeight: 1.6, color: '#c0b2a4', maxWidth: 540 }}
          >
            {slide.subtitle}
          </p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, ci) => (
              <span key={ci} style={{ padding: '6px 13px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, color: '#d8cabd', fontSize: 12, letterSpacing: 0.3 }}>
                {chip}
              </span>
            ))}
          </div>
        )}

        <PromoCTAs slide={slide} />
      </div>

      {/* Kolom kanan: mockup (desktop only) — overflow:visible agar chip negatif tidak terpotong */}
      <div className="apt-mockup-col hidden xl:flex flex-1 h-full items-center justify-center relative z-10" style={{ paddingRight: 70 }}>
        <div className="apt-mockup-wrap">
          {MockupComp && <MockupComp />}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN HERO SLIDER ───────────────────────────────────── */

export default function HeroSlider() {
  const { data: cmsSlides, loading, error } = useSlides();
  const { data: settings } = useSettings();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const swiperRef = useRef(null);

  if (loading) return <HeroSkeleton />;

  // Semua slide dari Firebase — type 'image' dan 'promo' digabung urut berdasarkan field order
  const allSlides = Array.isArray(cmsSlides) ? cmsSlides : [];

  const totalSlides = allSlides.length;
  const activeSlide = allSlides[activeIndex];

  // Tentukan warna progress bar sesuai slide aktif
  const isPromoActive = activeSlide?.type === 'promo';

  return (
    <>
      <style>{`
        @keyframes aptfloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-13px)} }
        @keyframes aptfloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(11px)}  }
        @keyframes heroProgress { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .apt-cta-primary:hover { background: #f6884a !important; }
        .apt-cta-outline:hover { border-color: rgba(255,255,255,0.5) !important; }
        .apt-hero-btn:hover { background: rgba(255,255,255,0.16) !important; }

        /* Setiap slide harus clip kontennya sendiri agar tidak bleeding ke slide tetangga */
        .swiper-slide { overflow: hidden; }

        /* Mockup responsive scaling */
        .apt-mockup-col { overflow: visible; }
        .apt-mockup-wrap { transform-origin: center center; }
        @media (min-width: 1280px) and (max-width: 1439px) {
          .apt-mockup-wrap { transform: scale(0.68); }
        }
        @media (min-width: 1440px) and (max-width: 1599px) {
          .apt-mockup-wrap { transform: scale(0.80); }
        }
        @media (min-width: 1600px) and (max-width: 1799px) {
          .apt-mockup-wrap { transform: scale(0.90); }
        }
        @media (min-width: 1800px) {
          .apt-mockup-wrap { transform: scale(1); }
        }

        /* Pagination dots */
        .hero-dots .swiper-pagination-bullet {
          width: 14px; height: 14px; border-radius: 7px;
          opacity: 1; transition: all 0.4s ease; cursor: pointer;
          margin: 0 5px !important;
        }
        .hero-dots-image .swiper-pagination-bullet {
          background: rgba(255,255,255,0.3);
        }
        .hero-dots-image .swiper-pagination-bullet:hover {
          background: rgba(255,255,255,0.6);
        }
        .hero-dots-image .swiper-pagination-bullet-active {
          background: #f59e0b; width: 44px;
        }
        .hero-dots-promo .swiper-pagination-bullet {
          background: rgba(255,255,255,0.28);
        }
        .hero-dots-promo .swiper-pagination-bullet:hover {
          background: rgba(255,255,255,0.5);
        }
        .hero-dots-promo .swiper-pagination-bullet-active {
          background: #ee7a3c; width: 44px;
        }
      `}</style>

      <section
        className="relative w-full overflow-hidden h-[85svh] min-h-[600px] max-h-[820px] md:h-[82vh] md:min-h-[660px] xl:min-h-[800px]"
      >
        {/* Progress bar */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] z-30 ${isPromoActive ? 'bg-white/10' : 'bg-white/10'}`}>
          <div
            key={progressKey}
            className="h-full origin-left"
            style={{
              background: isPromoActive ? '#ee7a3c' : '#f59e0b',
              animation: `heroProgress ${AUTOPLAY_DELAY}ms linear forwards`,
            }}
          />
        </div>

        <Swiper
          modules={[Autoplay, Navigation]}
          autoplay={{ delay: AUTOPLAY_DELAY, disableOnInteraction: false }}
          loop={totalSlides > 1}
          navigation={{ prevEl: '.hero-prev', nextEl: '.hero-next' }}
          onSwiper={(s) => { swiperRef.current = s; }}
          onSlideChange={(s) => {
            setActiveIndex(s.realIndex);
            setProgressKey((k) => k + 1);
          }}
          className="w-full h-full"
        >
          {allSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              {slide.type === 'promo'
                ? <PromoSlide slide={slide} />
                : <ImageSlide slide={slide} settings={settings} />
              }
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Slide counter (kanan atas) */}
        <div className="absolute top-5 right-5 md:top-8 md:right-12 z-20 pointer-events-none">
          <span className={`font-mono text-xs md:text-sm tracking-[0.2em] ${isPromoActive ? 'text-white/60' : 'text-white/85'}`}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
        </div>

        {/* Navigasi panah */}
        {totalSlides > 1 && (
          <>
            <button
              className="hero-prev apt-hero-btn hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 items-center justify-center"
              aria-label="Slide sebelumnya"
              style={{
                left: isPromoActive ? 38 : 20,
                width: isPromoActive ? 56 : 44,
                height: isPromoActive ? 56 : 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${isPromoActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.30)'}`,
                color: '#f2e9e0',
                fontSize: isPromoActive ? 28 : 22,
                cursor: 'pointer',
                transition: 'all 0.2s',
                lineHeight: 1,
              }}
            >
              ‹
            </button>
            <button
              className="hero-next apt-hero-btn hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 items-center justify-center"
              aria-label="Slide berikutnya"
              style={{
                right: isPromoActive ? 38 : 20,
                width: isPromoActive ? 56 : 44,
                height: isPromoActive ? 56 : 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${isPromoActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.30)'}`,
                color: '#f2e9e0',
                fontSize: isPromoActive ? 28 : 22,
                cursor: 'pointer',
                transition: 'all 0.2s',
                lineHeight: 1,
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Dot indicators */}
        {totalSlides > 1 && (
          <div
            className={`absolute z-20 flex items-center bottom-6 md:bottom-10 ${isPromoActive ? '' : 'right-5 md:right-12'}`}
            style={isPromoActive ? { left: 'clamp(20px, 6.77vw, 130px)' } : {}}
          >
            {allSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => swiperRef.current?.slideTo(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === activeIndex ? 44 : 14,
                  height: 14,
                  borderRadius: 7,
                  background: i === activeIndex
                    ? (isPromoActive ? '#ee7a3c' : '#f59e0b')
                    : 'rgba(255,255,255,0.28)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  margin: '0 5px',
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
