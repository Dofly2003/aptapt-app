import { useState, useEffect } from 'react';
import { Home, Zap, Folders, Star, MessageCircle } from 'lucide-react';

const navItems = [
  { id: 'hero',         label: 'Beranda',   Icon: Home          },
  { id: 'services',     label: 'Layanan',   Icon: Zap           },
  { id: 'projects',     label: 'Proyek',    Icon: Folders       },
  { id: 'testimonials', label: 'Testimoni', Icon: Star          },
  { id: 'contact',      label: 'Kontak',    Icon: MessageCircle },
];

const glassStyle = {
  background: 'rgba(10, 15, 30, 0.82)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.10)',
  boxShadow:
    '0 8px 32px rgba(0,0,0,0.42), 0 2px 6px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
};

export default function BottomNav() {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const sections = ['hero', 'services', 'projects', 'testimonials', 'contact'];

    const onScroll = () => {
      // Detection line = 35% from top of viewport
      const threshold = window.scrollY + window.innerHeight * 0.35;
      let current = sections[0];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= threshold) current = id;
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center md:hidden px-4">
      <nav className="flex items-center gap-1 px-2 py-2 rounded-[28px]" style={glassStyle}>
        {navItems.map(({ id, label, Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 min-w-[52px]"
              style={{ background: active ? 'rgba(5, 150, 105, 0.18)' : 'transparent' }}
              aria-label={label}
            >
              {/* Active dot */}
              <span
                className="w-1 h-1 rounded-full transition-all duration-200"
                style={{ background: active ? '#10b981' : 'transparent' }}
              />

              {/* Icon */}
              <Icon
                size={active ? 20 : 22}
                className="transition-all duration-200"
                style={{
                  color: active ? '#10b981' : 'rgba(255,255,255,0.55)',
                  strokeWidth: active ? 2.5 : 1.8,
                }}
              />

              {/* Label — hanya muncul saat aktif */}
              <span
                className="text-[10px] font-medium leading-none transition-all duration-200 overflow-hidden whitespace-nowrap"
                style={{
                  color: active ? '#10b981' : 'transparent',
                  maxHeight: active ? '14px' : '0px',
                  opacity: active ? 1 : 0,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
