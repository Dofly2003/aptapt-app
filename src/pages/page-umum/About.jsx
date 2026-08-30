import NavPublic from "../../components/NavPublic";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
export default function About() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.4 }}
      >
        <NavPublic />

        {/* 🔥 HERO MODERN */}
        <section className="relative h-[60vh] flex items-center justify-center text-white">

          {/* BACKGROUND */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070')"
            }}
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-black/60" />

          {/* CONTENT */}
          <div className="relative z-10 text-center px-6 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Tentang PT Adytia Teknik
            </h1>

            <p className="text-gray-200">
              Solusi Electrical Engineering, Instalasi Listrik, dan Digital System Modern
            </p>
          </div>
        </section>

        {/* 🔥 DESKRIPSI */}
        <section className="py-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-gray-600 leading-relaxed text-lg">
            PT Adytia Teknik hadir sebagai solusi untuk kebutuhan instalasi listrik,
            pengurusan NIDI & SLO, serta pengembangan sistem monitoring modern.
            Kami berkomitmen memberikan layanan terbaik dengan standar keamanan tinggi
            dan teknologi terkini untuk berbagai kebutuhan industri maupun rumah tangga.
          </p>
        </section>

        {/* 🔥 STATS (BIAR TERLIHAT PROFESIONAL) */}
        <section className="bg-blue-700 text-white py-12">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 text-center gap-6">

            <div>
              <h3 className="text-2xl font-bold">100+</h3>
              <p className="text-sm">Project Selesai</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold">50+</h3>
              <p className="text-sm">Client</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold">10+</h3>
              <p className="text-sm">Teknisi</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold">24/7</h3>
              <p className="text-sm">Support</p>
            </div>

          </div>
        </section>

        {/* 🔥 VISI MISI */}
        <section className="bg-gray-100 py-16 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

            <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
              <h2 className="text-xl font-bold mb-3 text-blue-700">Visi</h2>
              <p className="text-gray-600">
                Menjadi perusahaan terdepan dalam bidang electrical engineering
                dan solusi digital berbasis teknologi modern.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
              <h2 className="text-xl font-bold mb-3 text-blue-700">Misi</h2>
              <ul className="text-gray-600 list-disc ml-5 space-y-2">
                <li>Menyediakan layanan instalasi listrik berkualitas</li>
                <li>Mengembangkan sistem monitoring berbasis IoT</li>
                <li>Meningkatkan efisiensi dan keamanan sistem listrik</li>
                <li>Memberikan pelayanan profesional dan terpercaya</li>
              </ul>
            </div>

          </div>
        </section>

        {/* 🔥 KEUNGGULAN */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto text-center">

            <h2 className="text-2xl font-bold mb-10">
              Keunggulan Kami
            </h2>

            <div className="grid md:grid-cols-3 gap-6">

              {[
                {
                  title: "Teknisi Profesional",
                  desc: "Dikerjakan oleh tenaga ahli bersertifikat dan berpengalaman"
                },
                {
                  title: "Standar Nasional",
                  desc: "Menggunakan material dan instalasi sesuai standar SNI"
                },
                {
                  title: "Teknologi Modern",
                  desc: "Menggunakan sistem digital dan cloud untuk efisiensi kerja"
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white shadow rounded-2xl p-6 hover:scale-105 transition"
                >
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              ))}

            </div>

          </div>
        </section>

        {/* 🔥 CTA */}
        <section className="bg-blue-900 text-white py-16 text-center px-6">
          <h2 className="text-2xl font-bold mb-4">
            Siap Mengurus NIDI / SLO?
          </h2>

          <Link
            to="/daftar-nidi-slo"
            className="bg-yellow-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition"
          >
            🚀 Daftar Sekarang
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="bg-black text-white text-center py-6 text-sm">
          © {new Date().getFullYear()} PT Adytia Teknik
        </footer>
      </motion.div>
    </>
  );
}