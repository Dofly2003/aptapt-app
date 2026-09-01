import React, { useState, useEffect, useCallback } from 'react';

/* ─── SLIDES DATA ──────────────────────────────── */
const slides = [
  {
    eyebrow: 'PT Adytia Putra Teknik',
    headline: 'Sistem Manajemen Web untuk Operasional yang Lebih Efisien',
    sub: 'Dashboard dan admin panel terpusat untuk mengelola data, proses, dan tim perusahaan dalam satu platform terintegrasi.',
    chips: ['Web Dashboard', 'Admin Panel', 'Laporan Real-time'],
  },
  {
    eyebrow: 'PT Adytia Putra Teknik',
    headline: 'Aplikasi Mobile & Custom Software / ERP',
    sub: 'Solusi terukur — dari aplikasi mobile hingga sistem ERP yang dirancang mengikuti alur kerja bisnis Anda.',
    chips: ['Aplikasi Mobile', 'Custom ERP', 'Otomasi Proses'],
  },
  {
    eyebrow: 'PT Adytia Putra Teknik',
    headline: 'Desain UI/UX & Integrasi API yang Mulus',
    sub: 'Pengalaman pengguna yang elegan dipadukan integrasi sistem yang andal, siap untuk skala perusahaan.',
    chips: ['UI/UX Design', 'Integrasi API', 'Company Profile'],
  },
];

/* ─── MOCKUP COMPONENTS ────────────────────────── */

function DashboardMockup() {
  return (
    <div style={{ width: 760, background: '#fbf6f1', borderRadius: 20, boxShadow: '0 40px 90px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
      {/* Browser bar */}
      <div style={{ height: 46, background: '#efe7df', display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#d6cabd' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#d6cabd' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#d6cabd' }} />
        <div style={{ marginLeft: 16, height: 22, flex: 1, maxWidth: 340, background: '#fff', borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', height: 432 }}>
        {/* Sidebar */}
        <div style={{ width: 80, background: '#241f1b', padding: '22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ee7a3c', marginBottom: 6 }} />
          <div style={{ width: 30, height: 11, borderRadius: 5, background: '#ee7a3c' }} />
          <div style={{ width: 30, height: 11, borderRadius: 5, background: '#4a423b' }} />
          <div style={{ width: 30, height: 11, borderRadius: 5, background: '#4a423b' }} />
          <div style={{ width: 30, height: 11, borderRadius: 5, background: '#4a423b' }} />
          <div style={{ width: 30, height: 11, borderRadius: 5, background: '#4a423b' }} />
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 18, color: '#2a2420' }}>Dashboard Operasional</div>
            <div style={{ background: '#ee7a3c', color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>Export</div>
          </div>
          {/* Stat cards */}
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: 'Pendapatan', val: 'Rp 1,24M', delta: '▲ 12%' },
              { label: 'Pesanan', val: '3.480', delta: '▲ 8%' },
              { label: 'Efisiensi', val: '94%', delta: '▲ 24%' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#fff', border: '1px solid #ece2d8', borderRadius: 13, padding: 15, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 12, color: '#9a8c7f' }}>{s.label}</div>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22, color: '#2a2420' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#3a9d6b', fontWeight: 600 }}>{s.delta}</div>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div style={{ flex: 1, background: '#fff', border: '1px solid #ece2d8', borderRadius: 13, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#9a8c7f', fontWeight: 500 }}>Performa Bulanan</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {[45, 68, 52, 88, 60, 78, 48].map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: '6px 6px 0 0', height: `${h}%`, background: i === 3 ? '#ee7a3c' : i === 5 ? '#f3a06b' : '#f0d9c8' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileERPMockup() {
  const rows = [
    { w1: 140, w2: 90, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
    { w1: 120, w2: 80, status: 'Cuti', stBg: '#fbe8da', stColor: '#d07a32' },
    { w1: 150, w2: 70, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
    { w1: 110, w2: 95, status: 'Aktif', stBg: '#e3f3ea', stColor: '#2f8f5f' },
  ];
  return (
    <div style={{ position: 'relative', width: 660, height: 540 }}>
      {/* Back window */}
      <div style={{ position: 'absolute', left: 0, top: 24, width: 470, background: '#fbf6f1', borderRadius: 16, boxShadow: '0 30px 70px rgba(0,0,0,0.40)', overflow: 'hidden' }}>
        <div style={{ height: 40, background: '#efe7df', display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d6cabd' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d6cabd' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d6cabd' }} />
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 16, color: '#2a2420' }}>Manajemen Data Karyawan</div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#ead9cc', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                <div style={{ width: r.w1, height: 9, background: '#2a2420', borderRadius: 4 }} />
                <div style={{ width: r.w2, height: 7, background: '#cdbfb2', borderRadius: 4 }} />
              </div>
              <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: r.stBg, color: r.stColor }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Phone */}
      <div style={{ position: 'absolute', right: 0, bottom: 0, width: 248, height: 500, background: '#241f1b', borderRadius: 38, padding: 11, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ width: '100%', height: '100%', background: '#fbf6f1', borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#ee7a3c', padding: '30px 20px 22px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>ADYTIA Mobile</div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 24 }}>Rp 24,5Jt</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Saldo Operasional</div>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9a8c7f', fontWeight: 600 }}>Transaksi Terbaru</div>
            {[{ bg: '#fbe8da', amt: '+1,2Jt', w1: 80, w2: 50 }, { bg: '#e3f3ea', amt: '+820rb', w1: 70, w2: 60 }, { bg: '#fbe8da', amt: '+3,4Jt', w1: 90, w2: 45 }].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: t.bg, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ width: t.w1, height: 8, background: '#2a2420', borderRadius: 4 }} />
                  <div style={{ width: t.w2, height: 6, background: '#cdbfb2', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2a2420' }}>{t.amt}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 56, borderTop: '1px solid #ece2d8', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 22px' }}>
            {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i === 0 ? '#ee7a3c' : '#cdbfb2' }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationMockup() {
  const chips = [
    { label: 'Payment Gateway', color: '#3a9d6b', top: 18, left: -18, right: 'auto', bottom: 'auto', anim: 'aptfloat 6s ease-in-out infinite' },
    { label: 'WhatsApp API', color: '#25d366', top: 56, right: -30, left: 'auto', bottom: 'auto', anim: 'aptfloat2 7s ease-in-out infinite' },
    { label: 'Google Maps', color: '#3b82f6', bottom: 80, left: -26, right: 'auto', top: 'auto', anim: 'aptfloat2 6.5s ease-in-out infinite' },
    { label: 'Email SMTP', color: '#ee7a3c', bottom: 40, right: -14, left: 'auto', top: 'auto', anim: 'aptfloat 7.5s ease-in-out infinite' },
  ];
  return (
    <div style={{ position: 'relative', width: 640, height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Central card */}
      <div style={{ width: 340, background: '#fbf6f1', borderRadius: 20, boxShadow: '0 36px 80px rgba(0,0,0,0.45)', padding: 26, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 50, height: 50, borderRadius: '50%', background: '#ee7a3c', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ width: 130, height: 11, background: '#2a2420', borderRadius: 5 }} />
            <div style={{ width: 80, height: 8, background: '#cdbfb2', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 11, color: '#9a8c7f' }}>Nama Proyek</div>
          <div style={{ height: 38, background: '#fff', border: '1px solid #e3d7cb', borderRadius: 9 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 11, color: '#9a8c7f' }}>Status Integrasi</div>
          <div style={{ height: 38, background: '#fff', border: '1px solid #e3d7cb', borderRadius: 9 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ padding: '7px 14px', borderRadius: 8, background: '#ee7a3c', color: '#fff', fontSize: 12, fontWeight: 600 }}>Aktif</span>
          <span style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e3d7cb', color: '#9a8c7f', fontSize: 12, fontWeight: 600 }}>Draf</span>
          <span style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e3d7cb', color: '#9a8c7f', fontSize: 12, fontWeight: 600 }}>Arsip</span>
        </div>
        <div style={{ background: '#ee7a3c', color: '#fff', textAlign: 'center', padding: 13, borderRadius: 10, fontWeight: 600, fontSize: 14 }}>Simpan &amp; Publikasikan</div>
      </div>
      {/* Floating chips */}
      {chips.map((c, i) => (
        <div key={i} style={{ position: 'absolute', top: c.top, left: c.left, right: c.right, bottom: c.bottom, background: '#fff', borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.25)', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: '#2a2420', animation: c.anim }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
          {c.label}
        </div>
      ))}
    </div>
  );
}

const mockups = [DashboardMockup, MobileERPMockup, IntegrationMockup];

/* ─── MAIN HERO SLIDER ─────────────────────────── */

export default function HeroSlider({ autoplaySeconds = 6, pauseOnHover = true, showArrows = true }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const goTo = useCallback((i) => {
    setActive(((i % total) + total) % total);
  }, [total]);

  useEffect(() => {
    const ms = autoplaySeconds * 1000;
    const id = setInterval(() => {
      if (!paused) setActive((prev) => (prev + 1) % total);
    }, ms);
    return () => clearInterval(id);
  }, [paused, autoplaySeconds, total]);

  const Mockup = mockups[active];

  return (
    <>
      {/* Keyframes for floating animation */}
      <style>{`
        @keyframes aptfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
        @keyframes aptfloat2{0%,100%{transform:translateY(0)}50%{transform:translateY(11px)}}
      `}</style>

      <div
        onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
        onMouseLeave={() => setPaused(false)}
        style={{ position: 'relative', width: '100%', maxWidth: 1920, height: 800, overflow: 'hidden', background: '#221d19', fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {/* Glow */}
        <div style={{ position: 'absolute', top: -160, right: -60, width: 780, height: 780, borderRadius: '50%', background: 'radial-gradient(circle, rgba(238,122,60,0.30), rgba(238,122,60,0) 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -220, left: -120, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(238,122,60,0.10), rgba(238,122,60,0) 68%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Track */}
        <div style={{ display: 'flex', width: total * 1920, height: '100%', transform: `translateX(-${active * 1920}px)`, transition: 'transform 0.85s cubic-bezier(0.65,0,0.35,1)', position: 'relative', zIndex: 1 }}>
          {slides.map((slide, idx) => {
            const MockupComp = mockups[idx];
            return (
              <section key={idx} style={{ width: 1920, height: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
                {/* Left: text content */}
                <div style={{ width: 830, paddingLeft: 130, display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 10, height: 10, background: '#ee7a3c', borderRadius: 2 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2.5, color: '#f0a06a', textTransform: 'uppercase' }}>{slide.eyebrow}</span>
                  </div>
                  <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 63, lineHeight: 1.08, letterSpacing: -0.5, color: '#f7f1ea', margin: 0, maxWidth: 640 }}>{slide.headline}</h1>
                  <p style={{ fontSize: 21, lineHeight: 1.65, color: '#c0b2a4', margin: 0, maxWidth: 540 }}>{slide.sub}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {slide.chips.map((chip, ci) => (
                      <span key={ci} style={{ padding: '7px 15px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, color: '#d8cabd', fontSize: 13, letterSpacing: 0.3 }}>{chip}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                    <button style={{ background: '#ee7a3c', color: '#221d19', border: 'none', padding: '17px 34px', borderRadius: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 17, cursor: 'pointer' }}>Konsultasi Gratis</button>
                    <button style={{ background: 'transparent', color: '#f2e9e0', border: '1px solid rgba(255,255,255,0.22)', padding: '17px 30px', borderRadius: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 17, cursor: 'pointer' }}>Lihat Layanan</button>
                  </div>
                </div>

                {/* Right: mockup visual */}
                <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 70 }}>
                  <MockupComp />
                </div>
              </section>
            );
          })}
        </div>

        {/* Arrows */}
        {showArrows && (
          <>
            <button onClick={() => goTo(active - 1)} style={{ position: 'absolute', left: 38, top: '50%', transform: 'translateY(-50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#f2e9e0', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>‹</button>
            <button onClick={() => goTo(active + 1)} style={{ position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#f2e9e0', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>›</button>
          </>
        )}

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 42, left: 130, display: 'flex', alignItems: 'center', gap: 10, zIndex: 5 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i === active ? 44 : 14, height: 14, borderRadius: 7, background: i === active ? '#ee7a3c' : 'rgba(255,255,255,0.28)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.4s ease' }} />
          ))}
        </div>
      </div>
    </>
  );
}

/*
  USAGE:
  ──────
  import HeroSlider from './HeroSlider';

  // In your page:
  <HeroSlider />

  // With props:
  <HeroSlider autoplaySeconds={8} pauseOnHover={true} showArrows={false} />

  FONTS (add to your HTML head or layout):
  ────────────────────────────────────────
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
*/
