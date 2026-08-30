// src/components/landing/WhatsAppFloat.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useSettings } from '../../hooks/useContent';

export default function WhatsAppFloat() {
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show a one-time tooltip nudge after 6s of viewing the page.
  useEffect(() => {
    const seen = sessionStorage.getItem('wa_tooltip');
    if (seen) return;
    const t = setTimeout(() => {
      setShowTooltip(true);
      sessionStorage.setItem('wa_tooltip', '1');
      setTimeout(() => setShowTooltip(false), 5000);
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  if (!settings?.whatsappNumber) return null;

  const phone = String(settings.whatsappNumber).replace(/\D/g, '');
  const message = encodeURIComponent(settings.whatsappMessage || 'Halo, saya tertarik dengan layanan Anda.');
  const link = `https://wa.me/${phone}?text=${message}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden"
          >
            <div className="bg-[#25D366] text-white p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{settings.companyName || 'Tim Kami'}</p>
                <p className="text-xs text-white/80">Biasanya membalas dalam beberapa menit</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover">
              <div className="bg-white rounded-lg p-3 shadow-sm text-sm text-slate-700 max-w-[85%]">
                Halo! 👋 Ada yang bisa kami bantu seputar layanan kelistrikan?
              </div>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[#25D366] hover:bg-[#1ebe5a] text-white text-center font-semibold py-3 transition-colors"
            >
              Mulai Chat di WhatsApp
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnimatePresence>
          {showTooltip && !open && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap shadow-xl"
            >
              Ada pertanyaan? Chat kami!
              <span className="absolute top-1/2 right-[-6px] -translate-y-1/2 w-3 h-3 bg-slate-900 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((o) => !o)}
          className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-2xl shadow-green-500/40 flex items-center justify-center transition-colors"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        </motion.button>
      </div>
    </div>
  );
}