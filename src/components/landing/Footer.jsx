// src/components/landing/Footer.jsx
import { Mail, Phone, MapPin, Clock, Instagram, Facebook, Youtube, Zap } from 'lucide-react';
import { useSettings } from '../../hooks/useContent';

export default function Footer() {
  const { data: settings } = useSettings();

  return (
    <footer id="contact" className="bg-slate-950 text-slate-300 pt-20 pb-8">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Company */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" fill="white" />
              </div>
              <p className="font-bold text-white text-lg">
                {settings?.companyName || 'PT. Adytia Putra Teknik'}
              </p>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              {settings?.description ||
                'Solusi kelistrikan profesional & bersertifikat untuk industri, komersial, dan rumah tangga.'}
            </p>
            <div className="flex gap-3">
              {settings?.socials?.instagram && (
                <SocialLink href={settings.socials.instagram} icon={Instagram} label="Instagram" />
              )}
              {settings?.socials?.facebook && (
                <SocialLink href={settings.socials.facebook} icon={Facebook} label="Facebook" />
              )}
              {settings?.socials?.youtube && (
                <SocialLink href={settings.socials.youtube} icon={Youtube} label="YouTube" />
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Tautan Cepat</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#hero" className="hover:text-amber-400 transition">Beranda</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition">Layanan</a></li>
              <li><a href="#projects" className="hover:text-amber-400 transition">Portofolio</a></li>
              <li><a href="#testimonials" className="hover:text-amber-400 transition">Testimoni</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Kontak</h4>
            <ul className="space-y-3 text-sm">
              {settings?.phone && (
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="hover:text-amber-400">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-amber-400 break-all">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.workingHours && (
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{settings.workingHours}</span>
                </li>
              )}
            </ul>
          </div>

          {/* CTA box */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-slate-900">
            <h4 className="font-bold text-lg mb-2">Butuh konsultasi?</h4>
            <p className="text-sm mb-4 text-slate-800">
              Tim teknisi kami siap membantu menjawab kebutuhan kelistrikan Anda.
            </p>
            {settings?.whatsappNumber && (
              <a
                href={`https://wa.me/${String(settings.whatsappNumber).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition"
              >
                Chat WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            © {new Date().getFullYear()} {settings?.companyName || 'PT. Adytia Putra Teknik'}. Hak cipta dilindungi.
          </p>
          <p>Bersertifikat SLO · NIDI · Anggota AKLI</p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-900 flex items-center justify-center transition-colors"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}