# Handoff: Hero Slider — PT Adytia Putra Teknik

## Overview
Hero slider banner promosi untuk website PT Adytia Putra Teknik. Menampilkan 3 slide yang berganti otomatis, masing-masing mempromosikan layanan berbeda: Sistem Manajemen Web, Aplikasi Mobile & Custom ERP, dan UI/UX & Integrasi API.

## Tentang File Desain
File dalam bundle ini adalah **referensi desain dalam HTML** — prototipe yang menunjukkan tampilan dan perilaku yang diinginkan, BUKAN kode produksi untuk dicopy langsung. Tugas Anda adalah **mereproduksi desain ini di codebase target** (React/Next.js/Vue/dll.) menggunakan pattern dan library yang sudah ada di project tersebut.

File `HeroSlider.jsx` disertakan sebagai referensi React — sesuaikan dengan framework dan struktur project Anda.

## Fidelity
**High-fidelity (hifi)** — Mockup pixel-perfect dengan warna, tipografi, spacing, dan interaksi final. Developer harus mereproduksi UI secara akurat menggunakan library dan pattern yang ada di codebase.

---

## Design Tokens

### Warna
| Token | Hex | Kegunaan |
|-------|-----|----------|
| Background utama | `#221d19` | Latar gelap warm charcoal |
| Sidebar gelap | `#241f1b` | Panel sidebar mockup |
| Aksen utama (oranye) | `#ee7a3c` | CTA, aksen, highlight |
| Aksen hover | `#f6884a` | Hover state tombol |
| Aksen sekunder | `#f3a06b` | Chart bar sekunder |
| Aksen ringan | `#f0d9c8` | Chart bar default |
| Eyebrow teks | `#f0a06a` | Label atas oranye muda |
| Headline teks | `#f7f1ea` | Judul putih hangat |
| Body teks | `#c0b2a4` | Paragraf abu warm |
| Chip teks | `#d8cabd` | Label chip |
| Chip border | `rgba(255,255,255,0.14)` | Border chip |
| Tombol border | `rgba(255,255,255,0.22)` | Border tombol sekunder |
| Mockup card BG | `#fbf6f1` | Latar kartu mockup |
| Mockup topbar | `#efe7df` | Bar atas browser mockup |
| Mockup dot | `#d6cabd` | Titik traffic light |
| Mockup border | `#ece2d8` | Border kartu stat |
| Mockup label | `#9a8c7f` | Label kecil abu |
| Mockup teks gelap | `#2a2420` | Teks utama dalam mockup |
| Status hijau BG | `#e3f3ea` | Badge "Aktif" |
| Status hijau teks | `#2f8f5f` | Teks badge hijau |
| Status oranye BG | `#fbe8da` | Badge "Cuti" |
| Status oranye teks | `#d07a32` | Teks badge oranye |
| Delta hijau | `#3a9d6b` | Indikator naik |
| Glow oranye | `rgba(238,122,60,0.30)` | Radial gradient dekoratif |
| Nav sidebar inaktif | `#4a423b` | Item sidebar non-aktif |
| Skeleton bar | `#cdbfb2` | Placeholder bar abu |
| Arrow BG | `rgba(255,255,255,0.08)` | Latar tombol panah |
| Arrow border | `rgba(255,255,255,0.18)` | Border tombol panah |
| Dot inaktif | `rgba(255,255,255,0.28)` | Dot navigasi non-aktif |

### Tipografi
| Elemen | Font | Weight | Size | Line-height | Letter-spacing |
|--------|------|--------|------|-------------|----------------|
| Eyebrow | IBM Plex Sans | 600 | 14px | — | 2.5px, uppercase |
| Headline (h1) | Archivo | 800 | 63px | 1.08 | -0.5px |
| Body paragraph | IBM Plex Sans | 400 | 21px | 1.65 | — |
| Chip label | IBM Plex Sans | 400 | 13px | — | 0.3px |
| CTA button | IBM Plex Sans | 600 | 17px | — | — |
| Mockup title | Archivo | 700 | 16-18px | — | — |
| Mockup stat value | Archivo | 800 | 22px | — | — |
| Mockup small label | IBM Plex Sans | 400-500 | 11-13px | — | — |

### Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
```

### Spacing & Sizing
| Token | Value |
|-------|-------|
| Container width | 1920px |
| Container height | 800px |
| Content padding-left | 130px |
| Content column width | 830px |
| Content gap (vertical) | 28px |
| CTA row gap | 14px |
| Chip row gap | 10px |
| Button padding (primary) | 17px 34px |
| Button padding (secondary) | 17px 30px |
| Button border-radius | 11px |
| Chip padding | 7px 15px |
| Chip border-radius | 999px |
| Arrow button size | 56×56px |
| Arrow position from edge | 38px |
| Dot height | 14px |
| Dot active width | 44px |
| Dot inactive width | 14px |
| Dot border-radius | 7px |
| Dots position | bottom: 42px, left: 130px |
| Dots gap | 10px |

### Shadows
| Elemen | Shadow |
|--------|--------|
| Dashboard card | 0 40px 90px rgba(0,0,0,0.45) |
| Window card slide 2 | 0 30px 70px rgba(0,0,0,0.40) |
| Phone bezel | 0 40px 80px rgba(0,0,0,0.50) |
| Central form card | 0 36px 80px rgba(0,0,0,0.45) |
| Floating API chip | 0 16px 40px rgba(0,0,0,0.25) |

---

## Screens / Views

### Slide 1 — Sistem Manajemen Web
**Layout:** Flex row, align center. Left 830px text column, right flex:1 mockup area.

**Left Content:**
- Eyebrow: orange square 10×10px + "PT ADYTIA PUTRA TEKNIK" uppercase
- Headline: "Sistem Manajemen Web untuk Operasional yang Lebih Efisien" (max-width 640px)
- Body: "Dashboard dan admin panel terpusat untuk mengelola data, proses, dan tim perusahaan dalam satu platform terintegrasi." (max-width 540px)
- Chips: "Web Dashboard", "Admin Panel", "Laporan Real-time"
- CTAs: "Konsultasi Gratis" (filled orange) + "Lihat Layanan" (outline)

**Right Mockup — Browser Dashboard:**
- 760px wide, cream bg (#fbf6f1), border-radius 20px
- Top bar: 3 gray dots + URL bar placeholder
- Sidebar: 80px wide, dark (#241f1b), orange logo square + 5 nav bars
- Main area: header "Dashboard Operasional" + "Export" button
- 3 stat cards: Pendapatan (Rp 1,24M, +12%), Pesanan (3.480, +8%), Efisiensi (94%, +24%)
- Bar chart: 7 bars, heights [45%, 68%, 52%, 88%, 60%, 78%, 48%], tallest bar orange

### Slide 2 — Aplikasi Mobile & Custom ERP
**Left Content:**
- Same eyebrow pattern
- Headline: "Aplikasi Mobile & Custom Software / ERP"
- Body: "Solusi terukur — dari aplikasi mobile hingga sistem ERP yang dirancang mengikuti alur kerja bisnis Anda."
- Chips: "Aplikasi Mobile", "Custom ERP", "Otomasi Proses"
- Same CTAs

**Right Mockup — Desktop Window + Phone:**
- Container 660×540px, position: relative
- Back: Desktop window 470px wide, top 24px, employee data table with 4 rows (avatar circle, skeleton bars, status badges "Aktif"/"Cuti")
- Front: Phone frame 248×500px, absolute right:0 bottom:0, dark bezel 38px radius
  - Orange header: "ADYTIA Mobile", "Rp 24,5Jt", "Saldo Operasional"
  - Transaction list: 3 rows with icon, skeleton bars, amounts
  - Bottom nav: 4 dots, first orange

### Slide 3 — UI/UX & Integrasi API
**Left Content:**
- Same eyebrow pattern
- Headline: "Desain UI/UX & Integrasi API yang Mulus"
- Body: "Pengalaman pengguna yang elegan dipadukan integrasi sistem yang andal, siap untuk skala perusahaan."
- Chips: "UI/UX Design", "Integrasi API", "Company Profile"
- Same CTAs

**Right Mockup — Form Card + Floating API Chips:**
- Container 640×520px, flex center
- Central card 340px: avatar circle (orange), skeleton bars, 2 form fields, status tabs (Aktif/Draf/Arsip), submit button "Simpan & Publikasikan"
- 4 floating chips with colored dots, absolute positioned around center:
  - "Payment Gateway" (green #3a9d6b) — top:18, left:-18, animation aptfloat 6s
  - "WhatsApp API" (#25d366) — top:56, right:-30, animation aptfloat2 7s
  - "Google Maps" (blue #3b82f6) — bottom:80, left:-26, animation aptfloat2 6.5s
  - "Email SMTP" (orange #ee7a3c) — bottom:40, right:-14, animation aptfloat 7.5s

---

## Interactions & Behavior

### Autoplay
- Slides auto-advance every 6 seconds (configurable via `autoplaySeconds` prop)
- Pauses on mouse hover (configurable via `pauseOnHover` prop)
- Resumes on mouse leave

### Navigation
- Left/right arrow buttons: circular, 56px, semi-transparent
- Dot indicators: bottom-left, pill-shaped, active dot elongates to 44px
- All transitions: 0.85s with `cubic-bezier(0.65, 0, 0.35, 1)` easing
- Track-based sliding: translateX by -1920px × activeIndex

### Hover States
- Primary CTA: #ee7a3c → #f6884a
- Secondary CTA: border opacity 0.22 → 0.5
- Arrow buttons: bg opacity 0.08 → 0.16

### Animations
- Floating API chips (slide 3): up/down float using CSS keyframes
  - `aptfloat`: translateY(0) → translateY(-13px) → translateY(0), ease-in-out
  - `aptfloat2`: translateY(0) → translateY(11px) → translateY(0), ease-in-out

### Decorative Elements
- Top-right: orange radial glow 780×780px, 30% opacity
- Bottom-left: orange radial glow 560×560px, 10% opacity

### Persistence
- Active slide index saved to `localStorage` key `apt_hero_slide`
- Restored on page load

---

## State Management
```
state = {
  active: number    // 0, 1, or 2 — current slide index
  paused: boolean   // true when mouse is hovering
}
```

### Props (configurable)
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| autoplaySeconds | number | 6 | Detik antar pergantian slide |
| pauseOnHover | boolean | true | Jeda autoplay saat hover |
| showArrows | boolean | true | Tampilkan tombol panah navigasi |

---

## Responsive Notes
Desain dibuat fixed 1920×800px. Untuk implementasi responsif:
- Di layar < 1280px: pertimbangkan stack layout (teks di atas, mockup di bawah) atau sembunyikan mockup
- Di mobile (< 768px): full-width teks saja, perkecil font size sesuai skala, sembunyikan mockup visual
- Mockup visual bersifat dekoratif — konten esensial ada di sisi kiri (teks + CTA)

---

## Files
| File | Deskripsi |
|------|-----------|
| `Hero Slider.dc.html` | Desain referensi HTML (buka di browser untuk melihat) |
| `HeroSlider.jsx` | Komponen React — referensi implementasi |
| `slides/01-hero-slide.png` | Screenshot slide 1 |
| `slides/02-hero-slide.png` | Screenshot slide 2 |
| `slides/03-hero-slide.png` | Screenshot slide 3 |

---

## Prompt untuk Claude Code

Salin prompt di bawah ini dan berikan ke Claude Code bersama folder handoff ini:

```
Saya punya hero slider yang sudah ada di project saya. Tolong integrasikan desain hero slider baru ini ke slider yang sudah ada.

Lihat file referensi di folder design_handoff_hero_slider/:
- README.md berisi spesifikasi lengkap (warna, font, spacing, interaksi)
- HeroSlider.jsx berisi referensi komponen React

Yang perlu dilakukan:
1. Cari file hero slider yang sudah ada di project saya
2. Sesuaikan struktur komponen dengan framework yang digunakan (React/Next.js/Vue/dll.)
3. Implementasikan 3 slide dengan konten dan visual mockup sesuai spec:
   - Slide 1: Sistem Manajemen Web (mockup dashboard)
   - Slide 2: Aplikasi Mobile & ERP (mockup tabel + phone)
   - Slide 3: UI/UX & Integrasi API (form card + floating chips)
4. Implementasikan fitur:
   - Autoplay 6 detik, pause on hover
   - Navigasi panah kiri/kanan + dot indicator
   - Transisi sliding 0.85s cubic-bezier(0.65,0,0.35,1)
   - Floating animation untuk chip API di slide 3
   - Simpan posisi slide ke localStorage
5. Gunakan design tokens dari README (warna, font, spacing)
6. Tambahkan Google Fonts: Archivo (600-800) + IBM Plex Sans (400-600)
7. Pastikan responsif: stack layout di < 1280px, sembunyikan mockup di < 768px
8. Gunakan library/pattern yang sudah ada di project untuk slider (Swiper, Embla, dll.) jika tersedia — jika tidak, buat vanilla implementation

Jangan ubah halaman lain. Hanya ganti/update bagian hero slider.
```
