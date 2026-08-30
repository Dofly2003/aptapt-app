// src/components/landing/TestimonialsSlider.jsx
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

import { useTestimonials } from '../../hooks/useContent';
import { SectionHeader } from './ServicesSection';
import TestimonialsSkeleton from './skeletons/TestimonialsSkeleton';

export default function TestimonialsSlider() {
  const { data: items, loading, error } = useTestimonials();

  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(245,158,11,1)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,1)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="container mx-auto px-6 lg:px-12 relative">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-400 mb-3">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Apa kata klien kami
          </h2>
          <p className="text-lg text-slate-300">
            Kepercayaan klien adalah investasi paling berharga dari setiap proyek kami.
          </p>
        </div>

        {loading ? (
          <TestimonialsSkeleton />
        ) : error || !items?.length ? (
          <p className="text-center text-slate-400 py-12">Belum ada testimoni.</p>
        ) : (
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={28}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 2 },
              1280: { slidesPerView: 3 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={items.length > 3}
            pagination={{ clickable: true, el: '.tst-pagination' }}
            className="!pb-12"
          >
            {items.map((t, i) => (
              <SwiperSlide key={t.id}>
                <TestimonialCard item={t} index={i} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        <div className="tst-pagination flex justify-center gap-2" />
      </div>

      <style>{`
        .tst-pagination .swiper-pagination-bullet {
          width: 8px; height: 8px; background: rgba(255,255,255,0.3); opacity: 1;
        }
        .tst-pagination .swiper-pagination-bullet-active {
          background: #f59e0b; width: 24px; border-radius: 4px;
        }
      `}</style>
    </section>
  );
}

function TestimonialCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 h-full flex flex-col"
    >
      <Quote className="w-9 h-9 text-amber-500 mb-4" />

      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
            }`}
          />
        ))}
      </div>

      <p className="text-slate-200 leading-relaxed flex-1 mb-6 italic">
        "{item.review}"
      </p>

      <div className="flex items-center gap-4 pt-5 border-t border-white/10">
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/50"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-white">
            {item.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-white">{item.name}</p>
          <p className="text-sm text-slate-400">
            {item.role}{item.company ? ` · ${item.company}` : ''}
          </p>
        </div>
      </div>
    </motion.div>
  );
}