// src/components/landing/ProjectsShowcase.jsx
import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ArrowLeft, ArrowRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

import { useProjects } from '../../hooks/useContent';
import { SectionHeader } from './ServicesSection';
import ProjectsSkeleton from './skeletons/ProjectsSkeleton';

export default function ProjectsShowcase() {
  const { data: projects, loading, error } = useProjects();
  const [active, setActive] = useState(null); // selected project for modal
  const [imgIdx, setImgIdx] = useState(0);

  const open = (p) => { setActive(p); setImgIdx(0); };
  const close = () => setActive(null);

  return (
    <section id="projects" className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-6 lg:px-12">
        <SectionHeader
          eyebrow="Portofolio"
          title="Proyek yang telah kami selesaikan"
          subtitle="Setiap proyek adalah komitmen kami terhadap keamanan, kualitas, dan ketepatan waktu."
        />

        {loading ? (
          <ProjectsSkeleton />
        ) : error || !projects?.length ? (
          <p className="text-center text-slate-500 py-12">Belum ada proyek yang ditampilkan.</p>
        ) : (
          <>
            {/* Featured (first project) – large card on the left */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {projects[0] && (
                <ProjectCard
                  project={projects[0]}
                  featured
                  onClick={() => open(projects[0])}
                  className="lg:col-span-7 h-[420px]"
                />
              )}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {projects.slice(1, 5).map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => open(p)}
                    className="h-[200px]"
                  />
                ))}
              </div>
            </div>

            {/* Remaining projects in a Swiper carousel */}
            {projects.length > 5 && (
              <div className="mt-10">
                <Swiper
                  modules={[Autoplay, Pagination, Navigation]}
                  spaceBetween={20}
                  slidesPerView={1.2}
                  breakpoints={{
                    640: { slidesPerView: 2.2 },
                    1024: { slidesPerView: 3.2 },
                  }}
                  autoplay={{ delay: 5000, disableOnInteraction: false }}
                  loop
                  className="!pb-2"
                >
                  {projects.slice(5).map((p) => (
                    <SwiperSlide key={p.id}>
                      <ProjectCard project={p} onClick={() => open(p)} className="h-[260px]" />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {active && (
          <ProjectModal
            project={active}
            imgIdx={imgIdx}
            setImgIdx={setImgIdx}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ProjectCard({ project, featured, className = '', onClick }) {
  const cover = project.images?.[0]?.url || project.afterImage?.url;
  const hasBeforeAfter = project.beforeImage?.url && project.afterImage?.url;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl bg-slate-200 text-left ${className}`}
    >
      {cover ? (
        <img
          src={cover}
          alt={project.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

      <div className="absolute top-4 left-4 flex gap-2">
        {project.category && (
          <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-900 text-xs font-semibold">
            {project.category}
          </span>
        )}
        {hasBeforeAfter && (
          <span className="px-3 py-1 rounded-full bg-white/90 text-slate-900 text-xs font-semibold">
            Before / After
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h3 className={`font-bold mb-1 ${featured ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
          {project.title}
        </h3>
        {project.location && (
          <p className="flex items-center gap-1.5 text-sm text-slate-200">
            <MapPin className="w-3.5 h-3.5" /> {project.location}
          </p>
        )}
      </div>
    </motion.button>
  );
}

function ProjectModal({ project, imgIdx, setImgIdx, onClose }) {
  const images = project.images?.length ? project.images : [];
  const hasBeforeAfter = project.beforeImage?.url && project.afterImage?.url;
  const [tab, setTab] = useState(hasBeforeAfter ? 'after' : 'gallery');

  const next = () => setImgIdx((i) => (i + 1) % images.length);
  const prev = () => setImgIdx((i) => (i - 1 + images.length) % images.length);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative bg-slate-900 aspect-[16/10] max-h-[60vh]">
          {hasBeforeAfter && tab === 'compare' ? (
            <BeforeAfterCompare before={project.beforeImage.url} after={project.afterImage.url} />
          ) : (
            <>
              <img
                src={
                  tab === 'after'
                    ? project.afterImage?.url || images[imgIdx]?.url
                    : tab === 'before'
                    ? project.beforeImage?.url
                    : images[imgIdx]?.url
                }
                alt={project.title}
                className="w-full h-full object-contain"
              />
              {tab === 'gallery' && images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        {hasBeforeAfter && (
          <div className="flex gap-2 px-6 pt-4 border-b border-slate-200">
            {['before', 'after', 'compare'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === t ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'
                }`}
              >
                {t === 'before' ? 'Sebelum' : t === 'after' ? 'Sesudah' : 'Bandingkan'}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 overflow-y-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            {project.category && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {project.category}
              </span>
            )}
            {project.location && (
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {project.location}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">{project.title}</h3>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Drag-handle before/after compare slider */
function BeforeAfterCompare({ before, after }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative w-full h-full select-none">
      <img src={after} alt="Sesudah" className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt="Sebelum" className="absolute inset-0 w-full h-full object-contain" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(+e.target.value)}
        className="absolute inset-x-0 bottom-6 mx-auto w-3/4 accent-amber-500"
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none"
        style={{ left: `${pos}%` }}
      />
    </div>
  );
}