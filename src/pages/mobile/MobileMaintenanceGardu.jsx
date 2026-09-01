import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Camera, X, Loader, Check, CheckCircle2,
  FileText, Building2, Zap, Droplets, ClipboardCheck,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import CameraButton from "../../components/CameraButton";
import OfflineBanner from "../../offline/OfflineBanner";
import { isOnline as getOnlineStatus, onNetworkChange } from "../../offline/networkWatcher";
import {
  createMaintenanceGardu,
  updateMaintenanceGardu,
  getMaintenanceGarduById,
  uploadGarduPhoto,
  deleteGarduPhoto,
} from "../../services/maintenanceGarduService";

// ─── config ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Info",   Icon: FileText      },
  { id: 1, label: "Area",   Icon: Building2     },
  { id: 2, label: "LV",     Icon: Zap           },
  { id: 3, label: "Purify", Icon: Droplets      },
  { id: 4, label: "Selesai",Icon: ClipboardCheck},
];

const KONDISI_AREA  = [
  { value: "kotor",  label: "Kotor"  },
  { value: "sedang", label: "Sedang" },
  { value: "bersih", label: "Bersih" },
];
const KONDISI_LV    = [
  { value: "baik",            label: "Baik"            },
  { value: "perlu_perhatian", label: "Perlu Perhatian" },
  { value: "rusak",           label: "Rusak"           },
];
const KONDISI_PURIFY = [
  { value: "baik",            label: "Baik"            },
  { value: "perlu_perhatian", label: "Perlu Perhatian" },
  { value: "perlu_purifying", label: "Perlu Purifying" },
  { value: "kritis",          label: "Kritis"          },
];
const CHECKLIST_ITEMS = [
  { key: "sampah",        label: "Sampah / kotoran"        },
  { key: "sarang_burung", label: "Sarang burung / binatang" },
  { key: "debu_tebal",    label: "Debu tebal"              },
  { key: "vegetasi",      label: "Vegetasi / tanaman liar" },
  { key: "karat",         label: "Karat / korosi"          },
];
const METODE_PURIFY = [
  { value: "penyaringan",         label: "Penyaringan Minyak"   },
  { value: "ganti_sebagian",      label: "Ganti Minyak Sebagian"},
  { value: "ganti_penuh",         label: "Ganti Minyak Penuh"   },
  { value: "bersihkan_bushing",   label: "Bersihkan Bushing"    },
  { value: "bersihkan_isolator",  label: "Bersihkan Isolator"   },
  { value: "tidak_dilakukan",     label: "Tidak Dilakukan"      },
];

const EMPTY_CHECKLIST = {
  sampah: false, sarang_burung: false, debu_tebal: false, vegetasi: false, karat: false,
};

const EMPTY_FORM = {
  noLaporan:    "",
  namaGardu:    "",
  namaPelanggan:"",
  alamatGardu:  "",
  tanggal:      new Date().toISOString().split("T")[0],
  teknisi:      "",

  areaGardu: {
    kondisiBefore:    "",
    kondisiAfter:     "",
    catatanBefore:    "",
    catatanAfter:     "",
    checklistBefore:  { ...EMPTY_CHECKLIST },
    checklistAfter:   { ...EMPTY_CHECKLIST },
  },

  cekLV: {
    kondisiBefore: "",
    kondisiAfter:  "",
    tegBefore:  { rs: "", st: "", tr: "", rn: "", sn: "", tn: "" },
    tegAfter:   { rs: "", st: "", tr: "", rn: "", sn: "", tn: "" },
    arusBefore: { r: "", s: "", t: "" },
    arusAfter:  { r: "", s: "", t: "" },
    catatan:    "",
  },

  purifying: {
    jenisIsolasi:    "minyak",
    kondisiBefore:   "",
    kondisiAfter:    "",
    nilaiBefore:     "",
    nilaiAfter:      "",
    metodePurifying: "",
    catatanBefore:   "",
    catatanAfter:    "",
  },

  catatanUmum: "",
};

const EMPTY_PHOTOS = {
  areaGardu: { before: [], after: [] },
  cekLV:     { before: [], after: [] },
  purifying:  { before: [], after: [] },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function buildCleanPhotos(photos) {
  const result = {};
  for (const sec of ["areaGardu", "cekLV", "purifying"]) {
    result[sec] = { before: [], after: [] };
    for (const type of ["before", "after"]) {
      result[sec][type] = (photos[sec]?.[type] || [])
        .filter(p => p.url)
        .map(p => ({ url: p.url, path: p.path }));
    }
  }
  return result;
}

function countPhotos(photos) {
  return Object.values(photos).reduce(
    (sum, sec) => sum + (sec.before?.length || 0) + (sec.after?.length || 0), 0
  );
}

// ─── small components ─────────────────────────────────────────────────────────
function Lbl({ children }) {
  return (
    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );
}

function Inp({ value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <input
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
        focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white ${className}`}
    />
  );
}

function Sel({ value, onChange, options, placeholder = "Pilih..." }) {
  return (
    <select
      value={value ?? ""}
      onChange={onChange}
      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
        focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TA({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
        focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
    />
  );
}

function BAToggle({ value, onChange }) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
      {["before", "after"].map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
            ${value === t ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"}`}
        >
          {t === "before" ? "Sebelum" : "Sesudah"}
        </button>
      ))}
    </div>
  );
}

function PhotoGrid({ photos = [], onAdd, onRemove, uploading = false }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p, i) => (
        <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
          <img src={p.preview || p.url} alt="" className="w-full h-full object-cover" />
          {!p.url && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Loader className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
      {photos.length < 6 && (
        <CameraButton
          onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); }}
          className="aspect-square rounded-xl border-2 border-dashed border-amber-300 flex flex-col
            items-center justify-center bg-amber-50 cursor-pointer active:bg-amber-100 transition-colors"
        >
          {uploading
            ? <Loader className="w-6 h-6 text-amber-400 animate-spin" />
            : <><Camera className="w-6 h-6 text-amber-400 mb-1" /><span className="text-[10px] text-amber-500 font-medium">Foto</span></>
          }
        </CameraButton>
      )}
    </div>
  );
}

function Card({ children, title }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
      {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
      {children}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function MobileMaintenanceGardu() {
  const { id } = useParams();
  const isNew  = !id;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [step,    setStep]    = useState(0);
  const [baType,  setBaType]  = useState("before");
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [photos,  setPhotos]  = useState(EMPTY_PHOTOS);
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [online,  setOnline]  = useState(getOnlineStatus());
  const [toast,   setToast]   = useState({ msg: "", type: "" });

  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 2500);
  };

  // Network watcher
  useEffect(() => {
    const unsub = onNetworkChange(setOnline);
    return unsub;
  }, []);

  // Load existing record
  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const data = await getMaintenanceGarduById(id);
        if (!data) { show("Data tidak ditemukan", "error"); return; }
        const { photos: savedPhotos, id: _id, ...rest } = data;
        setForm(prev => ({ ...EMPTY_FORM, ...prev, ...rest }));
        if (savedPhotos) {
          setPhotos({
            areaGardu: {
              before: savedPhotos.areaGardu?.before || [],
              after:  savedPhotos.areaGardu?.after  || [],
            },
            cekLV: {
              before: savedPhotos.cekLV?.before || [],
              after:  savedPhotos.cekLV?.after  || [],
            },
            purifying: {
              before: savedPhotos.purifying?.before || [],
              after:  savedPhotos.purifying?.after  || [],
            },
          });
        }
      } catch { show("Gagal memuat data", "error"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  // Pre-fill teknisi from user
  useEffect(() => {
    if (user && !form.teknisi) {
      setForm(f => ({ ...f, teknisi: user.displayName || user.email || "" }));
    }
  }, [user]);

  // ── form setters ────────────────────────────────────────────────────────────
  const setF   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSec = (sec, k, v) => setForm(f => ({ ...f, [sec]: { ...f[sec], [k]: v } }));
  const setNested = (sec, sub, k, v) =>
    setForm(f => ({ ...f, [sec]: { ...f[sec], [sub]: { ...(f[sec]?.[sub] || {}), [k]: v } } }));

  // ── photo handlers ──────────────────────────────────────────────────────────
  const addPhoto = (section, type, file) => {
    const preview = URL.createObjectURL(file);
    setPhotos(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [type]: [...prev[section][type], { file, preview, url: null, path: null }],
      },
    }));
  };

  const removePhoto = (section, type, index) => {
    setPhotos(prev => {
      const arr = [...prev[section][type]];
      const removed = arr.splice(index, 1)[0];
      if (removed?.path) deleteGarduPhoto(removed.path);
      return { ...prev, [section]: { ...prev[section], [type]: arr } };
    });
  };

  // ── save ────────────────────────────────────────────────────────────────────
  const saveAll = async (newStatus = "draft") => {
    setSaving(true);
    try {
      let docId = isNew ? null : id;
      const cleanPhotos = buildCleanPhotos(photos);
      const payload = {
        ...form,
        photos: cleanPhotos,
        status: newStatus,
        createdBy: user?.uid || "",
      };

      if (!docId) {
        docId = await createMaintenanceGardu(payload);
        navigate(`/app-mobile/maintenance-gardu/${docId}`, { replace: true });
      } else {
        await updateMaintenanceGardu(docId, payload);
      }

      // Upload pending photos
      const updated = {
        areaGardu: { before: [...photos.areaGardu.before], after: [...photos.areaGardu.after] },
        cekLV:     { before: [...photos.cekLV.before],     after: [...photos.cekLV.after]     },
        purifying:  { before: [...photos.purifying.before], after: [...photos.purifying.after] },
      };
      let hasNew = false;

      for (const sec of ["areaGardu", "cekLV", "purifying"]) {
        for (const t of ["before", "after"]) {
          for (let i = 0; i < updated[sec][t].length; i++) {
            const p = updated[sec][t][i];
            if (p.file) {
              setUploading(`${sec}_${t}`);
              const result = await uploadGarduPhoto(p.file, docId, sec, t);
              if (p.preview) URL.revokeObjectURL(p.preview);
              updated[sec][t][i] = result;
              hasNew = true;
            }
          }
        }
      }
      setUploading(null);

      if (hasNew) {
        await updateMaintenanceGardu(docId, { photos: buildCleanPhotos(updated) });
        setPhotos(updated);
      }

      show(newStatus === "selesai" ? "Laporan diselesaikan!" : "Draft tersimpan");
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const baKey   = (field)     => baType === "before" ? `${field}Before` : `${field}After`;
  const baLabel = (pre, post) => baType === "before" ? pre : post;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      {/* offline banner */}
      {!online && <OfflineBanner />}

      {/* toast */}
      {toast.msg && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-xl
          text-sm font-medium shadow-lg whitespace-nowrap
          ${toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/app-mobile/maintenance-gardu")} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">
              {isNew ? "Laporan Baru" : "Edit Laporan"}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {form.namaGardu || "Maintenance Gardu Pelanggan"}
            </p>
          </div>
        </div>

        {/* step tabs */}
        <div className="flex border-t border-slate-100">
          {STEPS.map(({ id: sid, label, Icon }) => (
            <button
              key={sid}
              type="button"
              onClick={() => setStep(sid)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold
                transition-colors relative
                ${step === sid ? "text-amber-500" : "text-slate-400"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {step === sid && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── content ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-4">

        {/* ══ STEP 0 — Info Umum ══ */}
        {step === 0 && (
          <Card title="Informasi Umum">
            <div>
              <Lbl>No. Laporan</Lbl>
              <Inp value={form.noLaporan} onChange={e => setF("noLaporan", e.target.value)} placeholder="MG-001/VII/2026" />
            </div>
            <div>
              <Lbl>Nama Gardu</Lbl>
              <Inp value={form.namaGardu} onChange={e => setF("namaGardu", e.target.value)} placeholder="Gardu Distribusi GT-001" />
            </div>
            <div>
              <Lbl>Nama Pelanggan</Lbl>
              <Inp value={form.namaPelanggan} onChange={e => setF("namaPelanggan", e.target.value)} placeholder="PT. Contoh Pelanggan" />
            </div>
            <div>
              <Lbl>Alamat Gardu</Lbl>
              <Inp value={form.alamatGardu} onChange={e => setF("alamatGardu", e.target.value)} placeholder="Jl. Raya No. 1, Kota" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>Tanggal</Lbl>
                <Inp type="date" value={form.tanggal} onChange={e => setF("tanggal", e.target.value)} />
              </div>
              <div>
                <Lbl>Teknisi</Lbl>
                <Inp value={form.teknisi} onChange={e => setF("teknisi", e.target.value)} placeholder="Nama teknisi" />
              </div>
            </div>
          </Card>
        )}

        {/* ══ STEP 1 — Area Gardu ══ */}
        {step === 1 && (
          <>
            <BAToggle value={baType} onChange={v => setBaType(v)} />

            <Card title={baLabel("Kondisi Sebelum Pembersihan", "Kondisi Sesudah Pembersihan")}>
              <div>
                <Lbl>Kondisi Area</Lbl>
                <Sel
                  value={form.areaGardu[baKey("kondisi")]}
                  onChange={e => setSec("areaGardu", baKey("kondisi"), e.target.value)}
                  options={KONDISI_AREA}
                />
              </div>

              <div>
                <Lbl>Temuan {baLabel("Sebelum", "Sesudah")}</Lbl>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map(({ key, label }) => {
                    const sub = baKey("checklist");
                    const checked = form.areaGardu[sub]?.[key] || false;
                    return (
                      <label key={key}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 cursor-pointer select-none"
                      >
                        <div
                          onClick={() => setNested("areaGardu", sub, key, !checked)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${checked ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white"}`}
                        >
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <Lbl>Catatan</Lbl>
                <TA
                  value={form.areaGardu[baKey("catatan")]}
                  onChange={e => setSec("areaGardu", baKey("catatan"), e.target.value)}
                  placeholder="Kondisi area, temuan lain..."
                />
              </div>
            </Card>

            <Card title={`Foto ${baLabel("Sebelum", "Sesudah")}`}>
              <PhotoGrid
                photos={photos.areaGardu[baType]}
                onAdd={f => addPhoto("areaGardu", baType, f)}
                onRemove={i => removePhoto("areaGardu", baType, i)}
                uploading={uploading === `areaGardu_${baType}`}
              />
            </Card>
          </>
        )}

        {/* ══ STEP 2 — Cek LV ══ */}
        {step === 2 && (
          <>
            <BAToggle value={baType} onChange={setBaType} />

            <Card title={baLabel("Data LV Sebelum", "Data LV Sesudah")}>
              <div>
                <Lbl>Kondisi Panel LV</Lbl>
                <Sel
                  value={form.cekLV[baKey("kondisi")]}
                  onChange={e => setSec("cekLV", baKey("kondisi"), e.target.value)}
                  options={KONDISI_LV}
                />
              </div>

              {/* Tegangan antar fasa */}
              <div>
                <Lbl>Tegangan Antar Fasa (Volt)</Lbl>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "rs", lbl: "R-S" },
                    { k: "st", lbl: "S-T" },
                    { k: "tr", lbl: "T-R" },
                  ].map(({ k, lbl }) => (
                    <div key={k}>
                      <div className="text-[10px] text-slate-400 mb-1 font-semibold">{lbl}</div>
                      <Inp
                        type="number"
                        value={form.cekLV[baType === "before" ? "tegBefore" : "tegAfter"]?.[k] ?? ""}
                        onChange={e => setNested("cekLV", baType === "before" ? "tegBefore" : "tegAfter", k, e.target.value)}
                        placeholder="380"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tegangan fasa-netral */}
              <div>
                <Lbl>Tegangan Fasa–Netral (Volt)</Lbl>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "rn", lbl: "R-N" },
                    { k: "sn", lbl: "S-N" },
                    { k: "tn", lbl: "T-N" },
                  ].map(({ k, lbl }) => (
                    <div key={k}>
                      <div className="text-[10px] text-slate-400 mb-1 font-semibold">{lbl}</div>
                      <Inp
                        type="number"
                        value={form.cekLV[baType === "before" ? "tegBefore" : "tegAfter"]?.[k] ?? ""}
                        onChange={e => setNested("cekLV", baType === "before" ? "tegBefore" : "tegAfter", k, e.target.value)}
                        placeholder="220"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Arus */}
              <div>
                <Lbl>Arus Beban (Ampere)</Lbl>
                <div className="grid grid-cols-3 gap-2">
                  {["r", "s", "t"].map(k => (
                    <div key={k}>
                      <div className="text-[10px] text-slate-400 mb-1 font-semibold">Fasa {k.toUpperCase()}</div>
                      <Inp
                        type="number"
                        value={form.cekLV[baType === "before" ? "arusBefore" : "arusAfter"]?.[k] ?? ""}
                        onChange={e => setNested("cekLV", baType === "before" ? "arusBefore" : "arusAfter", k, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Lbl>Catatan LV</Lbl>
                <TA
                  value={form.cekLV.catatan}
                  onChange={e => setSec("cekLV", "catatan", e.target.value)}
                  placeholder="Kondisi kabel, busbar, koneksi, dll..."
                />
              </div>
            </Card>

            <Card title={`Foto Panel LV ${baLabel("Sebelum", "Sesudah")}`}>
              <PhotoGrid
                photos={photos.cekLV[baType]}
                onAdd={f => addPhoto("cekLV", baType, f)}
                onRemove={i => removePhoto("cekLV", baType, i)}
                uploading={uploading === `cekLV_${baType}`}
              />
            </Card>
          </>
        )}

        {/* ══ STEP 3 — Purifying ══ */}
        {step === 3 && (
          <>
            <Card title="Jenis Isolasi Trafo">
              <div className="flex gap-2">
                {[
                  { value: "minyak",      label: "Minyak"       },
                  { value: "kering",      label: "Kering"       },
                  { value: "resin_epoxy", label: "Resin Epoxy"  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSec("purifying", "jenisIsolasi", opt.value)}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-all
                      ${form.purifying.jenisIsolasi === opt.value
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-slate-600 border-slate-200"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Card>

            <BAToggle value={baType} onChange={setBaType} />

            <Card title={baLabel("Kondisi Sebelum Purifying", "Kondisi Sesudah Purifying")}>
              <div>
                <Lbl>Kondisi Isolasi</Lbl>
                <Sel
                  value={form.purifying[baKey("kondisi")]}
                  onChange={e => setSec("purifying", baKey("kondisi"), e.target.value)}
                  options={KONDISI_PURIFY}
                />
              </div>

              <div>
                <Lbl>
                  {form.purifying.jenisIsolasi === "minyak"
                    ? "Nilai Tegangan Tembus (kV)"
                    : "Resistansi Isolasi (MOhm)"}
                </Lbl>
                <Inp
                  type="number"
                  value={form.purifying[baKey("nilai")]}
                  onChange={e => setSec("purifying", baKey("nilai"), e.target.value)}
                  placeholder={form.purifying.jenisIsolasi === "minyak" ? "30" : "1000"}
                />
              </div>

              <div>
                <Lbl>Catatan {baLabel("Sebelum", "Sesudah")}</Lbl>
                <TA
                  value={form.purifying[baKey("catatan")]}
                  onChange={e => setSec("purifying", baKey("catatan"), e.target.value)}
                  placeholder={baType === "before"
                    ? "Warna minyak, kondisi fisik, temuan..."
                    : "Hasil purifying, rekomendasi..."}
                />
              </div>
            </Card>

            {/* Metode purifying hanya tampil di tab Sesudah */}
            {baType === "after" && (
              <Card title="Metode Purifying yang Dilakukan">
                <div className="grid grid-cols-2 gap-2">
                  {METODE_PURIFY.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSec("purifying", "metodePurifying", opt.value)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-xl border text-left transition-all
                        ${form.purifying.metodePurifying === opt.value
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card title={`Foto Purifying ${baLabel("Sebelum", "Sesudah")}`}>
              <PhotoGrid
                photos={photos.purifying[baType]}
                onAdd={f => addPhoto("purifying", baType, f)}
                onRemove={i => removePhoto("purifying", baType, i)}
                uploading={uploading === `purifying_${baType}`}
              />
            </Card>
          </>
        )}

        {/* ══ STEP 4 — Submit ══ */}
        {step === 4 && (
          <>
            <Card title="Catatan Umum">
              <TA
                value={form.catatanUmum}
                onChange={e => setF("catatanUmum", e.target.value)}
                placeholder="Catatan tambahan, rekomendasi tindak lanjut, keluhan pelanggan..."
                rows={4}
              />
            </Card>

            <Card title="Ringkasan Laporan">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[
                  ["Gardu",        form.namaGardu || "—"],
                  ["Pelanggan",    form.namaPelanggan || "—"],
                  ["Tanggal",      form.tanggal || "—"],
                  ["Teknisi",      form.teknisi || "—"],
                  ["Area (sesudah)",  form.areaGardu.kondisiAfter  || form.areaGardu.kondisiBefore  || "—"],
                  ["LV (sesudah)",    form.cekLV.kondisiAfter     || form.cekLV.kondisiBefore     || "—"],
                  ["Purifying",    form.purifying.metodePurifying || "—"],
                  ["Jenis Trafo",  form.purifying.jenisIsolasi || "—"],
                ].map(([label, val]) => (
                  <div key={label} className="contents">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="text-slate-800 font-medium truncate">{val}</dd>
                  </div>
                ))}
              </dl>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Total foto: {countPhotos(photos)} foto
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── bottom action bar ───────────────────────────────────────────────── */}
      <div className="fixed bottom-[56px] left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-100 px-4 py-3 z-20">
        <div className="flex gap-3">
          {/* Simpan Draft (semua step) */}
          <button
            type="button"
            onClick={() => saveAll("draft")}
            disabled={saving}
            className="flex-1 py-3 border-2 border-amber-400 text-amber-600 text-sm font-semibold
              rounded-xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center"
          >
            {saving && !toast.msg
              ? <Loader className="w-4 h-4 animate-spin" />
              : "Simpan Draft"}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => { setStep(s => s + 1); setBaType("before"); }}
              className="flex-1 py-3 bg-amber-500 text-white text-sm font-semibold
                rounded-xl active:scale-95 transition-all"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => saveAll("selesai")}
              disabled={saving}
              className="flex-1 py-3 bg-emerald-500 text-white text-sm font-semibold
                rounded-xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {saving
                ? <Loader className="w-4 h-4 animate-spin" />
                : <><CheckCircle2 className="w-4 h-4" /> Tandai Selesai</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
