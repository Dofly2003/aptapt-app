import { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection, addDoc, serverTimestamp, getDocs, doc, getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Select from "react-select";
import {
  ArrowLeft, ArrowRight, Check, Zap, MapPin, User, ClipboardCheck,
  Lock, MessageCircle, Package, LogIn, Building2,
} from "lucide-react";
import LandingNav from '../../components/landing/LandingNav';
const STEPS = [
  { id: "identitas", label: "Identitas", icon: User },
  { id: "lokasi",    label: "Lokasi",    icon: MapPin },
  { id: "instalasi", label: "Instalasi", icon: Zap },
  { id: "review",    label: "Review",    icon: ClipboardCheck },
];

const PERUNTUKAN_OPTIONS = [
  { value: "rumah_tangga",   label: "Rumah Tangga" },
  { value: "bisnis",         label: "Bisnis" },
  { value: "industri",       label: "Industri" },
  { value: "sosial",         label: "Sosial" },
  { value: "publik",         label: "Publik" },
  { value: "layanan_khusus", label: "Layanan Khusus" },
  { value: "lainnya",        label: "Lainnya" },
];

const PAKET_OPTIONS = [
  { value: "paket", label: "Paket NIDI + SLO", desc: "Hemat — sertifikasi lengkap dalam satu proses" },
  { value: "slo",   label: "SLO Saja",         desc: "Sertifikat Laik Operasi untuk instalasi yang sudah ada" },
  { value: "nidi",  label: "NIDI Saja",        desc: "Nomor Identitas Instalasi untuk pasang baru / tambah daya" },
];

const initialForm = {
  nama: "", nik: "",
  provinsi: "", kota: "", kecamatan: "", desa: "", alamat: "", kodePos: "",
  peruntukan: "", keperluan: "", daya: "",
};

const formatRupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
const generateRegister = () => "REG-" + Date.now();

// Lighter sanitize — strip only HTML tags, preserve all other chars (apostrophe, dashes, etc)
const sanitize = (v) =>
  String(v ?? "").replace(/<[^>]*>/g, "").trimStart();

export default function DataEntryUmum() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [paket, setPaket] = useState("paket");

  const [user, setUser] = useState(null);
  const [hargaMap, setHargaMap] = useState({});
  const [paymentSettings, setPaymentSettings] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);

  const botField = useRef("");
  const lastSubmit = useRef(0);

  // ============ AUTH ============
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // ============ LOAD DATA ============
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "harga_daya"));
        const map = {};
        snap.forEach((d) => {
          const x = d.data();
          map[x.daya] = { slo: x.slo, nidi: x.nidi };
        });
        setHargaMap(map);
      } catch (err) { console.error("harga", err); }

      try {
        const ps = await getDoc(doc(db, "settings", "payment"));
        if (ps.exists()) setPaymentSettings(ps.data());
      } catch (err) { console.error("payment", err); }
    })();
  }, []);

  // ============ LOAD DRAFT ============
  useEffect(() => {
    const saved = localStorage.getItem("pendingNidiForm");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.paket) setPaket(parsed.paket);
      } catch {}
    }
  }, []);

  // ============ DEBOUNCED AUTOSAVE ============
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem("pendingNidiForm",
        JSON.stringify({ form, paket }));
    }, 500);
    return () => clearTimeout(t);
  }, [form, paket]);

  // ============ HARGA ============
  const harga = (() => {
    if (!form.daya) return { slo: 0, nidi: 0, base: 0, adminFee: 0, total: 0 };
    const dayaNumber = parseInt(form.daya.replace(/\D/g, ""));
    const h = hargaMap[dayaNumber] || { slo: 0, nidi: 0 };
    let base = 0;
    if (paket === "paket") base = (h.slo || 0) + (h.nidi || 0);
    else if (paket === "slo") base = h.slo || 0;
    else if (paket === "nidi") base = h.nidi || 0;
    const adminFee = Math.round(base * 0.025);
    return { ...h, base, adminFee, total: base + adminFee };
  })();

  // ============ HANDLERS ============
  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: sanitize(v) }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };
  const blurField = (k) => setTouched((t) => ({ ...t, [k]: true }));

  // ============ VALIDATION ============
  const validateField = (k, v) => {
    switch (k) {
      case "nama":
        if (!v?.trim()) return "Nama wajib diisi";
        if (v.trim().length < 3) return "Nama minimal 3 karakter";
        return null;
      case "nik":
        if (!v?.trim()) return "NIK wajib diisi";
        if (!/^\d+$/.test(v)) return "NIK hanya boleh angka";
        if (v.length < 8) return "NIK minimal 8 digit";
        return null;
      case "alamat":
        if (!v?.trim()) return "Alamat wajib diisi";
        return null;
      case "peruntukan":
        if (!v) return "Pilih peruntukan";
        return null;
      case "daya":
        if (!v) return "Pilih daya";
        return null;
      default:
        return null;
    }
  };

  const validateStep = (idx) => {
    const fields = {
      0: ["nama", "nik"],
      1: ["alamat"],
      2: ["peruntukan", "daya"],
      3: [],
    }[idx] || [];
    const errs = {};
    fields.forEach((f) => {
      const e = validateField(f, form[f]);
      if (e) errs[f] = e;
    });
    setErrors((prev) => ({ ...prev, ...errs }));
    setTouched((prev) => {
      const next = { ...prev };
      fields.forEach((f) => (next[f] = true));
      return next;
    });
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============ SUBMIT ============
  const handleSubmit = async () => {
    if (botField.current) return;
    if (Date.now() - lastSubmit.current < 5000) return;
    if (submitting) return;

    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      alert("Ada field wajib yang belum terisi");
      return;
    }

    if (!user) {
      localStorage.setItem("afterLoginRedirect", "/daftar-nidi-slo");
      setAlertMsg("Silakan login terlebih dahulu untuk melanjutkan");
      setTimeout(() => (window.location.href = "/login"), 1800);
      return;
    }

    if (Object.keys(hargaMap).length === 0) return alert("Harga belum siap");
    if (harga.total === 0) return alert("Harga tidak ditemukan untuk daya ini");

    setSubmitting(true);
    lastSubmit.current = Date.now();

    try {
      const register = generateRegister();
      await addDoc(collection(db, "nidi_data"), {
        ...form,
        paket,
        register,
        harga_slo: harga.slo,
        harga_nidi: harga.nidi,
        biaya_admin: harga.adminFee,
        total_harga: harga.total,
        userId: user.uid,
        userEmail: user.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setModal({ register, total: harga.total, admin: harga.adminFee });
      setForm(initialForm);
      localStorage.removeItem("pendingNidiForm");
    } catch (err) {
      console.error(err);
      alert("Gagal simpan: " + err.message);
      lastSubmit.current = 0;  // izinkan retry
    } finally {
      setSubmitting(false);
    }
  };

  // ============ DAYA OPTIONS ============
  const dayaOptions = Object.keys(hargaMap).flatMap((d) =>
    ["PASKABAYAR", "PRABAYAR"].map((j) => ({
      value: `${j} ${d}`,
      label: `${j} ${d}`,
    }))
  );

  // ============ RENDER ============
  return (
    <>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32 lg:pb-12">

        {alertMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-900 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
            <Lock className="w-4 h-4" /> {alertMsg}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-10">

          {/* HEADER */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900">
              Pengajuan NIDI & SLO
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Lengkapi data berikut untuk memulai proses sertifikasi instalasi listrik Anda
            </p>
          </div>
          {/* LOGIN STATUS */}
          <LoginBanner user={user} />

          {/* STEPPER */}
          <Stepper steps={STEPS} current={step} onJump={(i) => i < step && setStep(i)} />

          {/* MAIN GRID: form + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-6">

            {/* FORM CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7">

              {/* Honeypot — proper invisible */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                onChange={(e) => (botField.current = e.target.value)}
                style={{ position: "absolute", left: "-9999px", width: 0, height: 0 }}
              />

              {step === 0 && (
                <StepIdentitas
                  form={form} errors={errors} touched={touched}
                  setField={setField} blurField={blurField}
                />
              )}
              {step === 1 && (
                <StepLokasi
                  form={form} errors={errors} touched={touched}
                  setField={setField} blurField={blurField}
                />
              )}
              {step === 2 && (
                <StepInstalasi
                  form={form} paket={paket} setPaket={setPaket}
                  dayaOptions={dayaOptions}
                  errors={errors} touched={touched}
                  setField={setField} blurField={blurField}
                />
              )}
              {step === 3 && (
                <StepReview
                  form={form} paket={paket} harga={harga}
                  user={user}
                  onJump={setStep}
                />
              )}

              {/* NAV BUTTONS — desktop saja, mobile pakai sticky bottom */}
              <div className="hidden lg:flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition"
                  >
                    Lanjut <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Mengirim..." : (user ? "Kirim Pengajuan" : "Login & Kirim")}
                    {!submitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* SIDEBAR HARGA — desktop sticky */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <PriceCard harga={harga} paket={paket} form={form} />
              </div>
            </div>
          </div>
        </div>

        {/* STICKY BOTTOM — mobile */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-2xl z-30">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-lg font-bold text-amber-600">
                {formatRupiah(harga.total)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="px-4 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow"
                >
                  Lanjut <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : (user ? "Kirim" : "Login & Kirim")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {modal && (
          <PaymentModal
            modal={modal}
            paymentSettings={paymentSettings}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </>
  );
}

/* ============ STEPPER ============ */
function Stepper({ steps, current, onJump }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 overflow-x-auto">
      <div className="flex items-center min-w-max md:min-w-0">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === current;
          const isDone = i < current;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isDone && onJump(i)}
                disabled={!isDone && !isActive}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition
                  ${isActive ? "bg-amber-500 text-slate-900 shadow-md" :
                    isDone   ? "text-amber-600 hover:bg-amber-50 cursor-pointer" :
                               "text-slate-400 cursor-default"}
                `}
              >
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive ? "bg-slate-900 text-amber-400" :
                    isDone   ? "bg-amber-500 text-slate-900" :
                               "bg-slate-200 text-slate-500"}
                `}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < current ? "bg-amber-400" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ FIELD COMPONENTS ============ */
function FormField({ label, error, touched, required, children, hint }) {
  const showError = touched && error;
  return (
    <div>
      <label className="block text-sm text-slate-700 mb-1.5 font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {showError && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!showError && hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, onBlur, hasError, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`
        w-full px-3.5 py-2.5 border rounded-lg text-sm
        focus:outline-none focus:ring-2 transition
        ${hasError
          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
          : "border-slate-300 focus:ring-amber-200 focus:border-amber-400"}
      `}
      {...rest}
    />
  );
}

/* ============ STEP 1: IDENTITAS ============ */
function StepIdentitas({ form, errors, touched, setField, blurField }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Identitas Pemohon</h2>
      <p className="text-sm text-slate-500 mb-6">Data sesuai KTP pemilik instalasi</p>

      <div className="space-y-4">
        <FormField label="Nama Lengkap" error={errors.nama} touched={touched.nama} required>
          <TextInput
            value={form.nama}
            onChange={(e) => setField("nama", e.target.value)}
            onBlur={() => blurField("nama")}
            placeholder="Sesuai KTP"
            hasError={touched.nama && errors.nama}
            autoFocus
          />
        </FormField>

        <FormField label="NIK" error={errors.nik} touched={touched.nik} required hint="16 digit angka">
          <TextInput
            value={form.nik}
            onChange={(e) => setField("nik", e.target.value.replace(/\D/g, ""))}
            onBlur={() => blurField("nik")}
            placeholder="3201234567890123"
            inputMode="numeric"
            maxLength={20}
            hasError={touched.nik && errors.nik}
          />
        </FormField>
      </div>
    </div>
  );
}

/* ============ STEP 2: LOKASI ============ */
function StepLokasi({ form, errors, touched, setField, blurField }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Lokasi Instalasi</h2>
      <p className="text-sm text-slate-500 mb-6">Alamat dimana instalasi listrik berada</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Provinsi">
          <TextInput value={form.provinsi}
            onChange={(e) => setField("provinsi", e.target.value)}
            placeholder="Jawa Timur" />
        </FormField>
        <FormField label="Kota / Kabupaten">
          <TextInput value={form.kota}
            onChange={(e) => setField("kota", e.target.value)}
            placeholder="Gresik" />
        </FormField>
        <FormField label="Kecamatan">
          <TextInput value={form.kecamatan}
            onChange={(e) => setField("kecamatan", e.target.value)}
            placeholder="Menganti" />
        </FormField>
        <FormField label="Desa / Kelurahan">
          <TextInput value={form.desa}
            onChange={(e) => setField("desa", e.target.value)}
            placeholder="Gading Watu" />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Alamat Lengkap" error={errors.alamat} touched={touched.alamat} required>
            <textarea
              value={form.alamat}
              onChange={(e) => setField("alamat", e.target.value)}
              onBlur={() => blurField("alamat")}
              rows={3}
              placeholder="Jalan, RT/RW, nomor rumah, patokan..."
              className={`
                w-full px-3.5 py-2.5 border rounded-lg text-sm resize-none
                focus:outline-none focus:ring-2 transition
                ${touched.alamat && errors.alamat
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-300 focus:ring-amber-200 focus:border-amber-400"}
              `}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

/* ============ STEP 3: INSTALASI ============ */
function StepInstalasi({ form, paket, setPaket, dayaOptions, errors, touched, setField, blurField }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Detail Instalasi</h2>
      <p className="text-sm text-slate-500 mb-6">Jenis dan kapasitas listrik yang akan disertifikasi</p>

      <div className="space-y-5">
        <FormField label="Peruntukan Bangunan" error={errors.peruntukan} touched={touched.peruntukan} required>
          <select
            value={form.peruntukan}
            onChange={(e) => setField("peruntukan", e.target.value)}
            onBlur={() => blurField("peruntukan")}
            className={`
              w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white
              focus:outline-none focus:ring-2 transition
              ${touched.peruntukan && errors.peruntukan
                ? "border-red-300 focus:ring-red-200"
                : "border-slate-300 focus:ring-amber-200 focus:border-amber-400"}
            `}
          >
            <option value="">— Pilih Peruntukan —</option>
            {PERUNTUKAN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Keperluan" hint="Contoh: Kos, Toko, Bengkel, dll">
          <TextInput
            value={form.keperluan}
            onChange={(e) => setField("keperluan", e.target.value)}
            placeholder="Untuk apa listriknya?"
          />
        </FormField>

        <FormField label="Daya Listrik" error={errors.daya} touched={touched.daya} required>
          <Select
            options={dayaOptions}
            placeholder="Pilih jenis & kapasitas daya"
            value={form.daya ? dayaOptions.find(o => o.value === form.daya) : null}
            onChange={(s) => setField("daya", s?.value || "")}
            onBlur={() => blurField("daya")}
            styles={{
              control: (b, s) => ({
                ...b,
                borderColor: touched.daya && errors.daya ? "#fca5a5" :
                             s.isFocused ? "#fbbf24" : "#cbd5e1",
                boxShadow: s.isFocused ? "0 0 0 2px #fde68a" : "none",
                "&:hover": { borderColor: "#fbbf24" },
                minHeight: 42,
              }),
            }}
          />
        </FormField>

        <FormField label="Paket Layanan" required>
          <div className="grid gap-2">
            {PAKET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition
                  ${paket === opt.value
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"}
                `}
              >
                <input
                  type="radio"
                  checked={paket === opt.value}
                  onChange={() => setPaket(opt.value)}
                  className="mt-1 accent-amber-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    </div>
  );
}

/* ============ STEP 4: REVIEW ============ */
function StepReview({ form, paket, harga, user, onJump }) {
  const paketLabel = PAKET_OPTIONS.find(p => p.value === paket)?.label || paket;
  const peruntukanLabel = PERUNTUKAN_OPTIONS.find(p => p.value === form.peruntukan)?.label || "—";

  const sections = [
    {
      title: "Identitas", step: 0,
      items: [
        ["Nama", form.nama],
        ["NIK", form.nik],
      ]
    },
    {
      title: "Lokasi", step: 1,
      items: [
        ["Provinsi", form.provinsi],
        ["Kota", form.kota],
        ["Kecamatan", form.kecamatan],
        ["Desa", form.desa],
        ["Alamat", form.alamat],
      ]
    },
    {
      title: "Instalasi", step: 2,
      items: [
        ["Peruntukan", peruntukanLabel],
        ["Keperluan", form.keperluan || "—"],
        ["Daya", form.daya],
        ["Paket", paketLabel],
      ]
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Review Data</h2>
      <p className="text-sm text-slate-500 mb-6">Periksa semua data sebelum mengirim</p>

      <div className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.title} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-700 text-sm">{sec.title}</p>
              <button type="button" onClick={() => onJump(sec.step)}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {sec.items.map(([k, v]) => (
                <div key={k} className="flex">
                  <dt className="text-slate-500 w-28 shrink-0">{k}</dt>
                  <dd className="text-slate-900 font-medium break-words">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4">
          <p className="font-semibold text-slate-700 text-sm mb-2">Total Pembayaran</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Biaya Layanan</span>
              <span>{formatRupiah(harga.base)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Admin (2.5%)</span>
              <span>{formatRupiah(harga.adminFee)}</span>
            </div>
            <div className="border-t border-amber-300 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-lg text-amber-700">{formatRupiah(harga.total)}</span>
            </div>
          </div>
        </div>

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm">
            <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <span className="text-blue-900">
              Anda akan diarahkan ke halaman login sebelum data dikirim.
              Data form sudah disimpan otomatis.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ PRICE CARD (sidebar) ============ */
function PriceCard({ harga, paket, form }) {
  const paketLabel = PAKET_OPTIONS.find(p => p.value === paket)?.label || paket;
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-amber-400" />
        <p className="font-semibold text-sm">Ringkasan Pesanan</p>
      </div>

      <div className="space-y-2 text-sm border-b border-white/10 pb-4 mb-4">
        <div className="flex justify-between text-slate-300">
          <span>Paket</span>
          <span className="text-white text-right">{paketLabel}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Daya</span>
          <span className="text-white text-right text-xs">{form.daya || "—"}</span>
        </div>
      </div>

      <div className="space-y-1.5 text-sm mb-4">
        <div className="flex justify-between text-slate-300">
          <span>Biaya Layanan</span>
          <span>{formatRupiah(harga.base)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Biaya Admin</span>
          <span>{formatRupiah(harga.adminFee)}</span>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
        <span className="text-sm text-slate-300">Total</span>
        <span className="text-2xl font-bold text-amber-400">{formatRupiah(harga.total)}</span>
      </div>

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        💡 Pembayaran dilakukan setelah pengajuan dikirim. Konfirmasi via WhatsApp.
      </p>
    </div>
  );
}
/* ============ LOGIN BANNER ============ */
function LoginBanner({ user }) {
  // ============ LOGGED IN ============
  if (user) {
    const displayName = user.displayName || user.email?.split("@")[0] || "User";
    const initial = (displayName[0] || "U").toUpperCase();
    const email = user.email;

    return (
      <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Sudah login</p>
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
          {email && email !== displayName && (
            <p className="text-xs text-slate-500 truncate">{email}</p>
          )}
        </div>
      </div>
    );
  }

  // ============ NOT LOGGED IN ============
  const handleLogin = () => {
    localStorage.setItem("afterLoginRedirect", "/daftar-nidi-slo");
    window.location.href = "/login";
  };

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">Belum login</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Login dulu supaya pesanan bisa dilacak di "Pesanan Saya"
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm shadow-md shadow-amber-500/30 transition shrink-0"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Masuk</span>
      </button>
    </div>
  );
}

/* ============ PAYMENT MODAL ============ */
function PaymentModal({ modal, paymentSettings, onClose }) {
  const banks = paymentSettings?.banks || [];
  const waNumber = paymentSettings?.whatsappNumber;
  const instructions = paymentSettings?.instructions || "Transfer sesuai nominal\nUpload bukti via WhatsApp";

  const handleWhatsApp = () => {
    if (!waNumber) {
      alert("Nomor WhatsApp belum diatur. Hubungi admin.");
      return;
    }
    const text = `Halo admin, saya sudah melakukan pembayaran NIDI/SLO.\n\n` +
                 `No Register: ${modal.register}\n` +
                 `Total: ${formatRupiah(modal.total)}\n\n` +
                 `Mohon dicek 🙏`;
    window.open(
      `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-5 rounded-t-2xl text-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-5 h-5" />
            <p className="font-semibold">Pengajuan Diterima</p>
          </div>
          <p className="text-sm text-slate-800">No. Register</p>
          <p className="text-xl font-bold tracking-wider">{modal.register}</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5">Total Pembayaran</p>
            <p className="text-2xl font-bold text-slate-900">{formatRupiah(modal.total)}</p>
          </div>

          {banks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Transfer ke salah satu rekening:
              </p>
              {banks.map((b, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <p className="font-semibold text-slate-900 text-sm">{b.bankName}</p>
                  </div>
                  <p className="font-mono font-bold tracking-wide text-base text-slate-900">
                    {b.accountNumber}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">a.n {b.accountName}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              Info rekening belum diatur. Silakan hubungi admin via WhatsApp untuk pembayaran.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Instruksi
            </p>
            <ul className="text-xs text-slate-600 space-y-1 whitespace-pre-line">
              {instructions.split("\n").map((line, i) => line.trim() && (
                <li key={i} className="flex gap-2">
                  <span>•</span><span>{line.trim()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <button onClick={handleWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
              <MessageCircle className="w-4 h-4" /> Konfirmasi via WhatsApp
            </button>
            <button onClick={() => {
              onClose();
              window.location.href = "/pesanan-saya";
            }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg font-semibold transition">
              Lihat Pesanan Saya
            </button>
            <button onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}