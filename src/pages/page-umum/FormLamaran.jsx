import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { db, storage } from "../../firebase/config";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  CheckCircle2, Loader2, AlertCircle, Upload, X,
  Briefcase, Calendar, Building2, Users, ShieldCheck, FileText, Image, Video,
} from "lucide-react";

/* ─── Constants ─── */
const ACCEPT_MAP = { pdf: "application/pdf", image: "image/*", video: "video/*" };
const TYPE_ICON = { pdf: FileText, image: Image, video: Video };
const TYPE_LABEL = { pdf: "PDF", image: "Gambar", video: "Video" };
const MIN_FILL_SEC = 6; // minimum detik mengisi form sebelum bisa submit

/* ─── Helpers ─── */
function storageKey(id) { return `lmr_submitted_${id}`; }

function formatDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-");
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(y, m - 1, d));
}

/* ─── DragDrop File Input ─── */
function FileDropInput({ field, file, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const accept = field.allowedTypes?.length
    ? field.allowedTypes.map(t => ACCEPT_MAP[t]).join(",")
    : "*/*";

  const validate = (f) => {
    if (!f) return null;
    const maxMB = field.maxSizeMB || 10;
    if (f.size > maxMB * 1024 * 1024) {
      alert(`Ukuran file maksimal ${maxMB} MB`);
      return null;
    }
    if (field.allowedTypes?.length) {
      const ok = field.allowedTypes.some(t => {
        if (t === "pdf") return f.type === "application/pdf";
        if (t === "image") return f.type.startsWith("image/");
        if (t === "video") return f.type.startsWith("video/");
        return true;
      });
      if (!ok) { alert(`Format tidak didukung. Gunakan: ${field.allowedTypes.map(t => TYPE_LABEL[t]).join(", ")}`); return null; }
    }
    return f;
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = validate(e.dataTransfer.files?.[0]);
    if (f) onChange(f);
  };

  const handleChange = (e) => {
    const f = validate(e.target.files?.[0]);
    if (f) onChange(f);
    e.target.value = "";
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all
          ${dragging
            ? "border-amber-400 bg-amber-50 scale-[1.01]"
            : file
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50"
          }`}
      >
        {file ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800 truncate max-w-xs">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Drag & drop atau <span className="text-amber-600">klik pilih file</span></p>
              {field.allowedTypes?.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                  {field.allowedTypes.map(t => {
                    const Icon = TYPE_ICON[t];
                    return (
                      <span key={t} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                        {Icon && <Icon className="w-3 h-3" />} {TYPE_LABEL[t]}
                      </span>
                    );
                  })}
                  {field.maxSizeMB && (
                    <span className="text-xs text-slate-400">· Maks {field.maxSizeMB} MB</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={handleChange} />
      </div>

      {file && (
        <button type="button" onClick={() => onChange(null)}
          className="mt-1.5 text-xs text-red-500 hover:text-red-600 flex items-center gap-1 ml-1">
          <X className="w-3 h-3" /> Hapus file
        </button>
      )}
    </div>
  );
}

/* ─── Full-page states ─── */
function FullPage({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      {children}
    </div>
  );
}

/* ─── Main Component ─── */
export default function FormLamaran() {
  const { id } = useParams();

  const [rekrutmen, setRekrutmen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // ── Security: honeypot & time gate
  const [honeypot, setHoneypot] = useState("");
  const loadTimeRef = useRef(Date.now());

  // ── Security: cek localStorage apakah sudah pernah submit dari browser ini
  useEffect(() => {
    if (localStorage.getItem(storageKey(id))) {
      setSubmitted(true);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "rekrutmen", id));
        if (!snap.exists()) { setError("Lowongan tidak ditemukan."); return; }
        setRekrutmen({ id: snap.id, ...snap.data() });
      } catch {
        setError("Gagal memuat formulir. Silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setVal = (fieldId, v) => setValues(p => ({ ...p, [fieldId]: v }));
  const setFile = (fieldId, f) => setFiles(p => ({ ...p, [fieldId]: f }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // ── Security layer 1: honeypot check
    if (honeypot.trim() !== "") {
      // Bot filled hidden field — pura-pura sukses tanpa menyimpan data
      setSubmitted(true);
      return;
    }

    // ── Security layer 2: time gate
    const elapsed = (Date.now() - loadTimeRef.current) / 1000;
    if (elapsed < MIN_FILL_SEC) {
      setSubmitError("Harap isi formulir dengan lengkap dan teliti.");
      return;
    }

    // ── Security layer 3: agreement checkbox
    if (!agreed) {
      setSubmitError("Anda harus menyetujui pernyataan di atas sebelum mengirim.");
      return;
    }

    setSubmitting(true);
    try {
      const submissionValues = {};

      for (const field of rekrutmen.formFields || []) {
        if (field.type === "file") {
          const file = files[field.id];
          if (!file && field.required) throw new Error(`File "${field.label}" wajib diisi.`);
          if (file) {
            setUploadProgress(p => ({ ...p, [field.id]: true }));
            const storageRef = ref(storage, `rekrutmen/${id}/${Date.now()}_${field.id}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            submissionValues[field.id] = { url, name: file.name, type: file.type };
            setUploadProgress(p => ({ ...p, [field.id]: false }));
          }
        } else {
          submissionValues[field.id] = values[field.id] || "";
        }
      }

      // Simpan submitter email sebagai field top-level jika ada, untuk dedup di admin
      const emailField = rekrutmen.formFields.find(f => f.type === "email");
      const submitterEmail = emailField ? (values[emailField.id] || "") : "";

      await addDoc(collection(db, "rekrutmen_submissions"), {
        rekrutmenId: id,
        posisi: rekrutmen.posisi,
        values: submissionValues,
        submitterEmail,
        createdAt: serverTimestamp(),
      });

      // ── Security layer 4: tandai sudah submit di browser ini
      localStorage.setItem(storageKey(id), "1");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Gagal mengirim lamaran. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <FullPage>
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Memuat formulir…</p>
      </div>
    </FullPage>
  );

  /* ── Error ── */
  if (error) return (
    <FullPage>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">Tidak Ditemukan</h2>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </FullPage>
  );

  /* ── Ditutup ── */
  if (rekrutmen.status !== "dibuka") return (
    <FullPage>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">Pendaftaran Ditutup</h2>
        <p className="text-slate-400 text-sm">Lowongan <strong className="text-slate-300">{rekrutmen.posisi}</strong> sudah tidak menerima lamaran baru.</p>
      </div>
    </FullPage>
  );

  /* ── Form belum dikonfigurasi ── */
  if (!rekrutmen.formFields?.length) return (
    <FullPage>
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Formulir belum dikonfigurasi.</p>
      </div>
    </FullPage>
  );

  /* ── Sudah submit ── */
  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Animated checkmark */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Lamaran Terkirim!</h2>
        <p className="text-slate-400 leading-relaxed">
          Terima kasih telah melamar posisi{" "}
          <span className="text-amber-400 font-semibold">{rekrutmen.posisi}</span>.{" "}
          Tim HR kami akan meninjau lamaran Anda dan menghubungi bila sesuai kualifikasi.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-800 px-4 py-2 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Data Anda tersimpan dengan aman
        </div>
      </div>
    </div>
  );

  /* ── Main Form ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Top bar */}
      <a href="/" className="border-b border-white/5 px-6 py-3.5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-md flex items-center justify-center">
          <img
            src="/icon-512.png"
            alt="Company Icon"
            className="w-7 h-7 rounded-lg object-cover"
          />
        </div>
        <span className="text-white/70 text-sm font-medium">PT Adytia Putra Tehnik</span>
        <span className="ml-auto text-xs text-white/30">Portal Rekrutmen</span>
      </a>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Hero section */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Lowongan Aktif
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            {rekrutmen.posisi}
          </h1>

          <div className="flex flex-wrap gap-3">
            {rekrutmen.departemen && (
              <div className="flex items-center gap-1.5 text-sm text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Building2 className="w-3.5 h-3.5" />
                {rekrutmen.departemen}
              </div>
            )}
            {rekrutmen.jumlahKebutuhan && (
              <div className="flex items-center gap-1.5 text-sm text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5" />
                {rekrutmen.jumlahKebutuhan} posisi tersedia
              </div>
            )}
            {rekrutmen.tanggalTutup && (
              <div className="flex items-center gap-1.5 text-sm text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                Batas {formatDate(rekrutmen.tanggalTutup)}
              </div>
            )}
          </div>

          {rekrutmen.kualifikasi && (
            <p className="mt-4 text-slate-400 text-sm leading-relaxed line-clamp-3">
              {rekrutmen.kualifikasi}
            </p>
          )}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">

          {/* Card header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-4">
            <h2 className="font-bold text-slate-900 text-lg">Formulir Lamaran</h2>
            <p className="text-slate-800/70 text-xs mt-0.5">
              Lengkapi semua field bertanda <span className="text-red-700 font-bold">*</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* ── Honeypot (tersembunyi dari pengguna, diisi bot) ── */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
              />
            </div>

            {/* Dynamic fields */}
            {rekrutmen.formFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    required={field.required}
                    placeholder={field.placeholder}
                    value={values[field.id] || ""}
                    onChange={e => setVal(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    required={field.required}
                    placeholder={field.placeholder}
                    rows={4}
                    value={values[field.id] || ""}
                    onChange={e => setVal(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400 resize-none"
                  />
                )}

                {field.type === "email" && (
                  <input
                    type="email"
                    required={field.required}
                    placeholder={field.placeholder || "nama@email.com"}
                    value={values[field.id] || ""}
                    onChange={e => setVal(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
                  />
                )}

                {field.type === "phone" && (
                  <input
                    type="tel"
                    required={field.required}
                    placeholder={field.placeholder || "08xxxxxxxxxx"}
                    value={values[field.id] || ""}
                    onChange={e => setVal(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 hover:bg-white transition-colors placeholder:text-slate-400"
                  />
                )}

                {field.type === "file" && (
                  <div className="relative">
                    <FileDropInput
                      field={field}
                      file={files[field.id] || null}
                      onChange={(f) => setFile(field.id, f)}
                    />
                    {uploadProgress[field.id] && (
                      <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mengupload…
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Agreement checkbox */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Saya menyatakan bahwa semua informasi yang diisi adalah benar dan dapat dipertanggungjawabkan.
                  Data akan digunakan hanya untuk keperluan proses rekrutmen PT Adytia Putra Tehnik.
                </span>
              </label>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !agreed}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 text-sm"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim lamaran…</>
                : "Kirim Lamaran Sekarang →"
              }
            </button>
          </form>
        </div>

        {/* Security footer */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Data terenkripsi & disimpan dengan aman · Tidak disebarkan ke pihak ketiga
        </div>
      </div>
    </div>
  );
}
