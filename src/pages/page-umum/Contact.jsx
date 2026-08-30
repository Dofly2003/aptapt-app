import NavPublic from "../../components/NavPublic";
import { useState } from "react";
import { motion } from "framer-motion";
export default function Contact() {
  const [form, setForm] = useState({
    nama: "",
    email: "",
    pesan: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const text = `Halo, saya ingin konsultasi:

Nama: ${form.nama}
Email: ${form.email}
Pesan: ${form.pesan}`;

    window.open(
      `https://api.whatsapp.com/send?phone=6282228904486&text=${encodeURIComponent(text)}`
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
      >
        <NavPublic />

        {/* 🔥 HERO MODERN */}
        <section className="relative h-[50vh] flex items-center justify-center text-white">

          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1581091870627-3a5b0c6c3b8c?q=80&w=2070')"
            }}
          />

          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10 text-center px-6">
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Hubungi Kami
            </h1>
            <p className="text-gray-200">
              Konsultasi proyek, instalasi listrik, atau kerja sama bisnis
            </p>
          </div>
        </section>

        {/* 🔥 CONTENT */}
        <section className="py-16 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

          {/* FORM */}
          <div className="bg-white shadow-xl rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-4">
              Kirim Pesan
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                name="nama"
                value={form.nama}
                onChange={handleChange}
                placeholder="Nama"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <textarea
                name="pesan"
                value={form.pesan}
                onChange={handleChange}
                placeholder="Pesan"
                rows="4"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <button className="bg-blue-600 text-white py-3 rounded-lg w-full hover:bg-blue-700 transition">
                Kirim via WhatsApp
              </button>

            </form>

          </div>

          {/* INFO */}
          <div className="space-y-6">

            <div>
              <h2 className="text-xl font-bold mb-4">
                Informasi Kontak
              </h2>

              <div className="space-y-3 text-gray-600">
                <p>📍 Gresik, Indonesia</p>
                <p>📧 info@adytiateknik.com</p>
                <p>📞 082228904486</p>
              </div>
            </div>

            {/* 🔥 MAP REAL */}
            <div className="rounded-xl overflow-hidden shadow">
              <iframe
                src="https://www.google.com/maps?q=-7.2746745,112.5564987&output=embed"
                className="w-full h-60 border-0 rounded-xl shadow"
                loading="lazy"
              ></iframe>
            </div>

            {/* 🔥 QUICK WHATSAPP */}
            <a
              href="https://wa.me/6282228904486"
              className="block text-center bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition"
            >
              💬 Chat WhatsApp Sekarang
            </a>

          </div>

        </section>

        {/* 🔥 CTA */}
        <section className="bg-blue-900 text-white py-12 text-center">
          <h2 className="text-xl font-semibold mb-3">
            Ingin langsung daftar NIDI / SLO?
          </h2>

          <a
            href="/daftar-nidi-slo"
            className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500"
          >
            ⚡ Daftar Sekarang
          </a>
        </section>

        {/* FOOTER */}
        <footer className="bg-black text-white text-center py-6 text-sm">
          © {new Date().getFullYear()} PT Adytia Teknik
        </footer>
      </motion.div>
    </>
  );
}