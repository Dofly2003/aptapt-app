import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, ShieldCheck, HelpCircle, ArrowRight } from "lucide-react";
import { getEdukasi } from "../../services/edukasiService";

const ICONS = { FileText, ShieldCheck, HelpCircle };

const FALLBACK = {
  badge: "Layanan Online",
  title: "Daftar NIDI & SLO Online",
  subtitle: "Bingung mulai dari mana? Pelajari dasarnya dulu — atau langsung daftar kalau sudah tahu kebutuhanmu.",
  ctaLabel: "Daftar Sekarang",
  ctaUrl: "/daftar-nidi-slo",
  items: [
    {
      icon: "FileText",
      title: "Apa itu NIDI?",
      summary: "Nomor Identitas Instalasi — wajib untuk instalasi listrik baru sebelum disambungkan ke PLN.",
      content: "NIDI (Nomor Identifikasi Instalasi) adalah nomor unik yang diterbitkan oleh DJK (Direktorat Jenderal Ketenagalistrikan) sebagai bukti bahwa instalasi listrik milik konsumen telah didaftarkan dan memenuhi standar.\n\nKapan butuh NIDI?\n• Pasang baru listrik dari PLN\n• Tambah daya\n• Ubah daya\n\nProsedur:\n1. Pendaftaran online via Adytia\n2. Verifikasi data\n3. Penerbitan NIDI dari DJK",
    },
    {
      icon: "ShieldCheck",
      title: "Apa itu SLO?",
      summary: "Sertifikat Laik Operasi — bukti bahwa instalasi listrik aman dan layak dioperasikan.",
      content: "SLO (Sertifikat Laik Operasi) diterbitkan oleh Lembaga Inspeksi Teknis (LIT) setelah pemeriksaan instalasi listrik.\n\nKapan butuh SLO?\n• Instalasi industri / komersial\n• Daya besar (di atas tegangan rendah)\n• Sertifikasi ulang setelah modifikasi instalasi\n\nMasa berlaku SLO bervariasi tergantung jenis instalasi (5–15 tahun).",
    },
    {
      icon: "HelpCircle",
      title: "Saya butuh yang mana?",
      summary: "Panduan singkat memilih antara NIDI, SLO, atau keduanya.",
      content: "Pilih NIDI saja jika:\n✓ Instalasi rumah tangga, daya rendah\n✓ Pasang baru / tambah daya rumahan\n\nPilih SLO saja jika:\n✓ Sertifikasi ulang instalasi yang sudah ada\n✓ Kebutuhan industri tertentu\n\nPilih PAKET (NIDI + SLO) jika:\n✓ Instalasi industri / komersial baru\n✓ Mau sekali urus, semua beres\n\nKalau masih ragu, hubungi kami via WhatsApp untuk konsultasi gratis.",
    },
  ],
};

export default function EdukasiNidiSlo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openIdx, setOpenIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const d = await getEdukasi();
        setData(d?.title ? d : FALLBACK);
      } catch {
        setData(FALLBACK);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section id="info-nidi-slo" className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-5 sm:px-6 lg:px-12">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-4 mx-auto" />
          <div className="h-12 w-full max-w-2xl bg-slate-200 rounded animate-pulse mb-12 mx-auto" />
          <div className="space-y-3 max-w-3xl mx-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = data?.items || [];

  return (
    <section id="info-nidi-slo" className="py-16 md:py-24 bg-slate-50">
      <div className="container mx-auto px-5 sm:px-6 lg:px-12">

        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          {data.badge && (
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium tracking-wider uppercase mb-4">
              {data.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="text-slate-600 text-sm sm:text-base">
              {data.subtitle}
            </p>
          )}
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>

        {data.ctaUrl && data.ctaLabel && (
          <div className="text-center mt-10 md:mt-12">
            
             <a href={data.ctaUrl}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 group"
            >
              {data.ctaLabel}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function AccordionItem({ item, isOpen, onToggle }) {
  const Icon = ICONS[item.icon] || HelpCircle;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${
      isOpen ? "border-amber-300 shadow-md" : "border-slate-200"
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isOpen ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{item.title}</p>
          {item.summary && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.summary}</p>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
          isOpen ? "rotate-180" : ""
        }`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-5 pb-5 pt-1">
              <div className="pl-14">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {item.content}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}