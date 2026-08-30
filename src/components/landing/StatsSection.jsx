// src/components/landing/StatsSection.jsx
import { motion } from 'framer-motion';
import { Award, Users, ShieldCheck, Briefcase } from 'lucide-react';

const STATS = [
  { icon: Briefcase, value: '500+', label: 'Proyek selesai' },
  { icon: Users, value: '300+', label: 'Klien terpercaya' },
  { icon: Award, value: '15+', label: 'Tahun pengalaman' },
  { icon: ShieldCheck, value: '100%', label: 'Bersertifikat resmi' },
];

export default function StatsSection() {
  return (
    <section className="py-12 bg-amber-500">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-4 text-slate-900"
            >
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-3xl font-bold leading-none mb-1">{s.value}</p>
                <p className="text-sm font-medium opacity-80">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}