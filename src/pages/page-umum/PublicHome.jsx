// src/pages/page-umum/PublicHome.jsx
// Main public landing page. Composes all dynamic sections.
// Replace your existing PublicHome.jsx with this file.

import { useEffect } from 'react';
import { useSettings } from '../../hooks/useContent';
import LandingNav from '../../components/landing/LandingNav';
import HeroSlider from '../../components/landing/HeroSlider';
import StatsSection from '../../components/landing/StatsSection';
import ServicesSection from '../../components/landing/ServicesSection';
import ProjectsShowcase from '../../components/landing/ProjectsShowcase';
import TestimonialsSlider from '../../components/landing/TestimonialsSlider';
import Footer from '../../components/landing/Footer';
import WhatsAppFloat from '../../components/landing/WhatsAppFloat';
import EdukasiNidiSlo from '../../components/landing/EdukasiNidiSlo';
import BottomNav from '../../components/BottomNav';

export default function PublicHome() {
  const { data: settings } = useSettings();

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!settings) return;
    document.title = settings.metaTitle || 'PT. Adytia Putra Teknik';
    setMeta('description', settings.metaDescription);
    setMeta('keywords', settings.metaKeywords);
    setMeta('og:title', settings.metaTitle, true);
    setMeta('og:description', settings.metaDescription, true);
    setMeta('og:image', settings.ogImage, true);
    setMeta('og:type', 'website', true);
  }, [settings]);

  return (
    <div className="bg-white">
      <LandingNav />
      <main>
        <section id="hero">
          <HeroSlider />
          <EdukasiNidiSlo />
        </section>
        {/* <StatsSection /> */}
        <ServicesSection />
        <ProjectsShowcase />
        <TestimonialsSlider />
      </main>
      <Footer />
      <WhatsAppFloat />
      <BottomNav />
    </div>
  );
}

function setMeta(name, content, isProperty = false) {
  if (!content) return;
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}