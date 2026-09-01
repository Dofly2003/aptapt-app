import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { inlineImgsForPrint } from "../../utils/inlineImgsForPrint";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  ArrowLeft, Save, Printer, ChevronDown, ChevronUp,
  Plus, Trash2, Upload, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button, Field, Input, Select, useToast } from "../../components/admin/AdminUI";
import {
  getLaikOperasi, createLaikOperasi, updateLaikOperasi,
  uploadLoPhoto, deleteLoPhoto,
  getLaikOperasiFromPengujian, saveLaikOperasiToPengujian,
} from "../../services/laikOperasiService";
import { getAllInstansi } from "../../services/instansiService";
import TemplateLaikOperasi, { defaultDataLaikOperasi }
  from "../../templates/laikoperasi/TemplateLaikOperasi";
import { deriveLaikOperasiFromPengujian, mergeLaikOperasiData }
  from "../../utils/deriveLaikOperasi";

const TODAY = () => new Date().toISOString().slice(0, 10);

const makeEmpty = () => ({
  ...defaultDataLaikOperasi,
  tanggal: TODAY(),
  instansiId: "",
  status: "draft",
});

// ─── Accordion section wrapper ─────────────────────────────────────────────
function Sec({ title, open, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
      >
        <span className="font-semibold text-slate-700 text-sm">{title}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

// ─── Photo upload cell ─────────────────────────────────────────────────────
function PhotoSlot({ value, onUpload, onRemove, label, uploading }) {
  const ref = useRef();
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <div
        className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-teal-400"
        style={{ height: 100 }}
        onClick={() => !uploading && ref.current?.click()}
      >
        {value?.url
          ? <img src={value.url} alt={label} className="w-full h-full object-contain" />
          : uploading
            ? <span className="text-xs text-teal-600 animate-pulse">Mengupload…</span>
            : <div className="flex flex-col items-center gap-1 text-slate-400">
                <Upload size={18} />
                <span className="text-xs">Klik untuk upload</span>
              </div>}
        {value?.url && !uploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

// ─── Main editor ───────────────────────────────────────────────────────────
export default function LaikOperasiEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const [searchParams] = useSearchParams();
  const pengujianId = searchParams.get("pengujianId");
  const isPengujianMode = !!pengujianId;

  const [form, setForm]             = useState(makeEmpty);
  const [instansiList, setInstansiList] = useState([]);
  const [loading, setLoading]       = useState(isEdit || isPengujianMode);
  const [saving, setSaving]         = useState(false);
  const [zoom, setZoom]             = useState(55);
  const [tab, setTab]               = useState("form");
  const [uploading, setUploading]   = useState({});
  const [docId, setDocId]           = useState(id ?? null);

  const [open, setOpen] = useState({
    info: true, jarak: true, fotoJarak: false, konstruksi: false, phbTm: false, phbTr: false,
  });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const printRef = useRef(null);

  /* ── Load ── */
  useEffect(() => {
    getAllInstansi({ aktifOnly: true })
      .then((list) => {
        setInstansiList(list);
        if (!isEdit && !isPengujianMode && list[0])
          setForm((f) => ({ ...f, instansiId: list[0].id }));
      })
      .catch(console.error);
  }, [isEdit, isPengujianMode]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getLaikOperasi(id)
      .then((data) => {
        if (!data) { show("Dokumen tidak ditemukan", "error"); navigate("/dashboard/laik-operasi"); return; }
        setForm({ ...makeEmpty(), ...data });
        setDocId(id);
      })
      .catch(() => show("Gagal memuat", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isPengujianMode) return;
    setLoading(true);
    getDoc(doc(db, "pengujian", pengujianId))
      .then((snap) => {
        if (!snap.exists()) { show("Dokumen pengujian tidak ditemukan", "error"); return; }
        const d = snap.data();
        const derived = deriveLaikOperasiFromPengujian(d);
        const merged = mergeLaikOperasiData({ ...makeEmpty(), ...derived }, d.laikOperasi ?? {});
        setForm({ ...merged, instansiId: d.instansiId ?? "" });
      })
      .catch(() => show("Gagal memuat data pengujian", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pengujianId]);

  /* ── Derived ── */
  const selectedInstansi = instansiList.find((i) => i.id === form.instansiId) ?? null;
  const pjList = selectedInstansi?.penanggungJawab ?? [];

  /* ── Setters ── */
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setJarak = (perangkat, arah, v) =>
    setForm((f) => ({
      ...f,
      jarakBebas: { ...f.jarakBebas, [perangkat]: { ...f.jarakBebas?.[perangkat], [arah]: v } },
    }));

  /* ── Photo helpers ── */
  const getStorageDocId = async (currentForm) => {
    if (isPengujianMode) return pengujianId;
    if (docId) return docId;
    // Create document first to get real ID
    const newId = await createLaikOperasi(currentForm);
    setDocId(newId);
    navigate(`/dashboard/laik-operasi/${newId}`, { replace: true });
    return newId;
  };

  const handlePhotoUpload = async (file, setter, slotKey) => {
    setUploading((u) => ({ ...u, [slotKey]: true }));
    try {
      const useId = await getStorageDocId(form);
      const uploaded = await uploadLoPhoto(file, useId, slotKey);
      setter(uploaded);
    } catch (e) { console.error(e); show("Gagal upload foto", "error"); }
    finally { setUploading((u) => ({ ...u, [slotKey]: false })); }
  };

  const handlePhotoRemove = async (current, setter, slotKey) => {
    if (current?.path) await deleteLoPhoto(current.path);
    setter(null);
  };

  // Foto Jarak Bebas helpers
  const setFotoJarak = (perangkat, tipe, val) =>
    setForm((f) => ({
      ...f,
      fotoJarakBebas: {
        ...f.fotoJarakBebas,
        [perangkat]: { ...f.fotoJarakBebas?.[perangkat], [tipe]: val },
      },
    }));

  // Foto Konstruksi helpers
  const setFotoKonstruksi = (key, val) =>
    setForm((f) => ({ ...f, fotoKonstruksi: { ...f.fotoKonstruksi, [key]: val } }));

  // Foto LBS helpers
  const setFotoLbs = (idx, val) =>
    setForm((f) => {
      const arr = [...(f.fotoLbs ?? [null, null])];
      arr[idx] = val;
      return { ...f, fotoLbs: arr };
    });

  // Interlock rows
  const setInterlockRow = (idx, field, val) =>
    setForm((f) => {
      const rows = [...(f.interlockPhbTm ?? [])];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...f, interlockPhbTm: rows };
    });

  const addInterlockRow = () =>
    setForm((f) => ({
      ...f,
      interlockPhbTm: [...(f.interlockPhbTm ?? []), { indikasi: "", hasilUji: "Baik / Berfungsi", keterangan: "" }],
    }));

  const removeInterlockRow = (idx) =>
    setForm((f) => ({ ...f, interlockPhbTm: f.interlockPhbTm.filter((_, i) => i !== idx) }));

  // PHB TM kontrol rows
  const setKontrolTmRow = (idx, field, val) =>
    setForm((f) => {
      const rows = [...(f.interlockPhbTmKontrol ?? [])];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...f, interlockPhbTmKontrol: rows };
    });

  // Foto PHB TR helpers
  const setFotoPhbTr = (idx, val) =>
    setForm((f) => {
      const arr = [...(f.fotoPhbTr ?? [null, null])];
      arr[idx] = val;
      return { ...f, fotoPhbTr: arr };
    });

  // PHB TR interlock rows
  const setInterlockTrRow = (idx, field, val) =>
    setForm((f) => {
      const rows = [...(f.interlockPhbTr ?? [])];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...f, interlockPhbTr: rows };
    });

  const addInterlockTrRow = () =>
    setForm((f) => ({
      ...f,
      interlockPhbTr: [...(f.interlockPhbTr ?? []), { indikasi: "", hasilUji: "Baik / Berfungsi", keterangan: "" }],
    }));

  const removeInterlockTrRow = (idx) =>
    setForm((f) => ({ ...f, interlockPhbTr: f.interlockPhbTr.filter((_, i) => i !== idx) }));

  // PHB TR kontrol rows
  const setKontrolTrRow = (idx, field, val) =>
    setForm((f) => {
      const rows = [...(f.interlockPhbTrKontrol ?? [])];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...f, interlockPhbTrKontrol: rows };
    });

  /* ── Save ── */
  const handleSave = async () => {
    if (!isPengujianMode && !form.instansiId) { show("Pilih instansi terlebih dahulu", "error"); return; }
    setSaving(true);
    try {
      if (isPengujianMode) {
        await saveLaikOperasiToPengujian(pengujianId, form);
        show("Tersimpan");
      } else if (docId) {
        await updateLaikOperasi(docId, form);
        show("Tersimpan");
      } else {
        const newId = await createLaikOperasi(form);
        setDocId(newId);
        navigate(`/dashboard/laik-operasi/${newId}`, { replace: true });
        show("Dokumen dibuat");
      }
    } catch (e) { console.error(e); show("Gagal menyimpan", "error"); }
    finally { setSaving(false); }
  };

  const handleFinalize = async () => {
    if (!confirm("Tandai dokumen ini sebagai Final?")) return;
    setSaving(true);
    try {
      const finalForm = { ...form, status: "final" };
      setForm(finalForm);
      if (isPengujianMode) {
        await saveLaikOperasiToPengujian(pengujianId, finalForm);
      } else if (docId) {
        await updateLaikOperasi(docId, finalForm);
      } else {
        const newId = await createLaikOperasi(finalForm);
        setDocId(newId);
        navigate(`/dashboard/laik-operasi/${newId}`, { replace: true });
      }
      show("Dokumen final");
    } catch (e) { show("Gagal", "error"); }
    finally { setSaving(false); }
  };

  /* ── Print ── */
  const restoreImgs = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `LaikOperasi_${form.namaGardu || form.nomor || "doc"}`,
    onBeforePrint: async () => {
      if (printRef.current) restoreImgs.current = await inlineImgsForPrint(printRef.current);
    },
    onAfterPrint: () => {
      restoreImgs.current?.();
      restoreImgs.current = null;
    },
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Memuat…</div>
  );

  const ARAH = ["kiri", "kanan", "depan", "belakang"];
  const PERANGKAT = [
    { key: "phbTm", label: "PHB TM" },
    { key: "trafo",  label: "Trafo" },
    { key: "phbTr", label: "PHB TR" },
  ];

  return (
    <div className="flex flex-col h-full">
      <Toast />

      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0 gap-2 flex-wrap">
        <button onClick={() => navigate(isPengujianMode ? `/laporan/${pengujianId}?section=E` : "/dashboard/laik-operasi")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> {isPengujianMode ? "Kembali ke Laporan" : "Kembali"}
        </button>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs">
            {["form", "preview"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition ${
                  tab === t ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
                {t === "form" ? "Form" : "Preview"}
              </button>
            ))}
          </div>

          {tab === "preview" && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setZoom((z) => Math.max(30, z - 5))}
                className="p-1.5 rounded hover:bg-white"><ZoomOut size={13} /></button>
              <span className="text-xs w-8 text-center font-mono">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(100, z + 5))}
                className="p-1.5 rounded hover:bg-white"><ZoomIn size={13} /></button>
            </div>
          )}

          <Button variant="outline" onClick={handlePrint} className="!px-3 !py-1.5 !text-xs">
            <Printer size={13} /> Cetak
          </Button>
          <Button variant="outline" onClick={handleFinalize} loading={saving}
            className="!px-3 !py-1.5 !text-xs !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50">
            Final
          </Button>
          <Button onClick={handleSave} loading={saving} className="!px-3 !py-1.5 !text-xs">
            <Save size={13} /> Simpan
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Form panel ── */}
        <div className={`${tab === "form" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[420px] shrink-0 border-r border-slate-200 overflow-y-auto`}>
          <div className="p-4 space-y-3">

            {/* INFO UMUM */}
            <Sec title="Info Umum" open={open.info} onToggle={() => toggle("info")}>
              <Field label="Instansi" required>
                <Select value={form.instansiId} onChange={(e) => set("instansiId", e.target.value)} disabled={isPengujianMode}>
                  <option value="">-- Pilih Instansi --</option>
                  {instansiList.map((i) => (
                    <option key={i.id} value={i.id}>{i.nama}</option>
                  ))}
                </Select>
                {isPengujianMode && <p className="text-xs text-slate-400 mt-1">Instansi mengikuti dokumen pengujian</p>}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nomor Dokumen">
                  <Input value={form.nomor} onChange={(e) => set("nomor", e.target.value)}
                    placeholder="LHPP-001/VI/2026" />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Gardu">
                  <Input value={form.namaGardu} onChange={(e) => set("namaGardu", e.target.value)}
                    placeholder="Gardu PLN Sekolah…" />
                </Field>
                <Field label="Nomor Gardu">
                  <Input value={form.nomorGardu} onChange={(e) => set("nomorGardu", e.target.value)}
                    placeholder="GH-0012" />
                </Field>
              </div>
              <Field label="Lokasi">
                <Input value={form.lokasi} onChange={(e) => set("lokasi", e.target.value)}
                  placeholder="Pasuruan" />
              </Field>
            </Sec>

            {/* JARAK BEBAS */}
            <Sec title="I. Jarak Bebas (cm)" open={open.jarak} onToggle={() => toggle("jarak")}>
              {PERANGKAT.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ARAH.map((arah) => (
                      <Field key={arah} label={`ke ${arah}`}>
                        <Input
                          type="number"
                          value={form.jarakBebas?.[key]?.[arah] ?? ""}
                          onChange={(e) => setJarak(key, arah, e.target.value)}
                          placeholder="cm"
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              ))}
            </Sec>

            {/* FOTO JARAK BEBAS + TTD 1 */}
            <Sec title="Foto Jarak Bebas + TTD Sek.1" open={open.fotoJarak} onToggle={() => toggle("fotoJarak")}>
              {PERANGKAT.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["pengukuran", "jauh"].map((tipe) => {
                      const slotKey = `jarak_${key}_${tipe}`;
                      return (
                        <PhotoSlot
                          key={tipe}
                          label={tipe === "pengukuran" ? "Foto Pengukuran" : "Foto Jauh"}
                          value={form.fotoJarakBebas?.[key]?.[tipe]}
                          uploading={!!uploading[slotKey]}
                          onUpload={(file) =>
                            handlePhotoUpload(file, (v) => setFotoJarak(key, tipe, v), slotKey)}
                          onRemove={() =>
                            handlePhotoRemove(form.fotoJarakBebas?.[key]?.[tipe], (v) => setFotoJarak(key, tipe, v), slotKey)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">TTD Seksi 1</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nama Saksi">
                    <Input value={form.saksi1Nama} onChange={(e) => set("saksi1Nama", e.target.value)} />
                  </Field>
                  <Field label="Jabatan Saksi">
                    <Input value={form.saksi1Jabatan} onChange={(e) => set("saksi1Jabatan", e.target.value)} />
                  </Field>
                </div>
                <Field label="Pemeriksa & Penguji (PJ)">
                  <Select value={form.pj1Id ?? ""} onChange={(e) => set("pj1Id", e.target.value || null)}>
                    <option value="">-- Pilih PJ --</option>
                    {pjList.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>)}
                  </Select>
                </Field>
              </div>
            </Sec>

            {/* KONSTRUKSI + TTD 2 */}
            <Sec title="II. Konstruksi + TTD Sek.2" open={open.konstruksi} onToggle={() => toggle("konstruksi")}>
              <div className="grid grid-cols-3 gap-2">
                {["trafo", "phbTm", "phbTr"].map((key) => {
                  const label = key === "trafo" ? "Trafo" : key === "phbTm" ? "PHB TM" : "PHB TR";
                  const slotKey = `konstruksi_${key}`;
                  return (
                    <PhotoSlot
                      key={key} label={label}
                      value={form.fotoKonstruksi?.[key]}
                      uploading={!!uploading[slotKey]}
                      onUpload={(file) =>
                        handlePhotoUpload(file, (v) => setFotoKonstruksi(key, v), slotKey)}
                      onRemove={() =>
                        handlePhotoRemove(form.fotoKonstruksi?.[key], (v) => setFotoKonstruksi(key, v), slotKey)}
                    />
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">TTD Seksi 2</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nama Saksi (Tuan Rumah)">
                    <Input value={form.saksi2Nama} onChange={(e) => set("saksi2Nama", e.target.value)} />
                  </Field>
                  <Field label="Jabatan Saksi">
                    <Input value={form.saksi2Jabatan} onChange={(e) => set("saksi2Jabatan", e.target.value)} />
                  </Field>
                </div>
                <Field label="Instansi Tuan Rumah">
                  <Input value={form.saksi2Instansi}
                    onChange={(e) => set("saksi2Instansi", e.target.value)}
                    placeholder="PT. PLN (Persero) UP3 …" />
                </Field>
                <Field label="PJ Instansi">
                  <Select value={form.pj2Id ?? ""} onChange={(e) => set("pj2Id", e.target.value || null)}>
                    <option value="">-- Pilih PJ --</option>
                    {pjList.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>)}
                  </Select>
                </Field>
              </div>
            </Sec>

            {/* PEMERIKSAAN PHB TM */}
            <Sec title="III. Pemeriksaan Fungsi PHB TM" open={open.phbTm} onToggle={() => toggle("phbTm")}>
              {/* Analisis Silih Kunci */}
              <Field label="Analisa Silih Kunci (Interlock)">
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[80px]"
                  value={form.analysisSilihKunci ?? ""}
                  onChange={(e) => set("analysisSilihKunci", e.target.value)} />
              </Field>

              {/* Peralatan Proteksi rows */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Peralatan Proteksi</p>
                <div className="space-y-2">
                  {(form.interlockPhbTm ?? []).map((row, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1.5 relative">
                      <button type="button" onClick={() => removeInterlockRow(i)}
                        className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600">
                        <X size={13} />
                      </button>
                      <Input placeholder="Indikasi"
                        value={row.indikasi}
                        onChange={(e) => setInterlockRow(i, "indikasi", e.target.value)} />
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input placeholder="Hasil Uji"
                          value={row.hasilUji}
                          onChange={(e) => setInterlockRow(i, "hasilUji", e.target.value)} />
                        <Input placeholder="Keterangan"
                          value={row.keterangan}
                          onChange={(e) => setInterlockRow(i, "keterangan", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addInterlockRow}
                  className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800">
                  <Plus size={13} /> Tambah baris
                </button>
              </div>

              {/* Peralatan Kontrol PHB TM (3 baris fixed) */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Peralatan Kontrol (V, I, Freq)</p>
                <div className="space-y-1.5">
                  {(form.interlockPhbTmKontrol ?? []).map((row, i) => (
                    <div key={i} className="grid grid-cols-3 gap-1.5">
                      <Input placeholder="Indikasi" value={row.indikasi}
                        onChange={(e) => setKontrolTmRow(i, "indikasi", e.target.value)} />
                      <Input placeholder="Satuan" value={row.satuan ?? ""}
                        onChange={(e) => setKontrolTmRow(i, "satuan", e.target.value)} />
                      <Input placeholder="Keterangan" value={row.keterangan}
                        onChange={(e) => setKontrolTmRow(i, "keterangan", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Foto LBS */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Foto LBS PHB TM</p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((idx) => {
                    const slotKey = `lbs_${idx}`;
                    return (
                      <PhotoSlot key={idx} label={`Foto LBS ${idx + 1}`}
                        value={form.fotoLbs?.[idx]} uploading={!!uploading[slotKey]}
                        onUpload={(file) => handlePhotoUpload(file, (v) => setFotoLbs(idx, v), slotKey)}
                        onRemove={() => handlePhotoRemove(form.fotoLbs?.[idx], (v) => setFotoLbs(idx, v), slotKey)} />
                    );
                  })}
                </div>
              </div>

              {/* Analisis Urutan Fasa TM */}
              <Field label="Analisa Urutan Fasa PHB TM">
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[60px]"
                  value={form.analysisUrutanFasaTm ?? ""}
                  onChange={(e) => set("analysisUrutanFasaTm", e.target.value)} />
              </Field>

              {/* TTD 3 */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">TTD Seksi 3</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nama Saksi">
                    <Input value={form.saksi3Nama} onChange={(e) => set("saksi3Nama", e.target.value)} />
                  </Field>
                  <Field label="Jabatan Saksi">
                    <Input value={form.saksi3Jabatan} onChange={(e) => set("saksi3Jabatan", e.target.value)} />
                  </Field>
                </div>
                <Field label="Pemeriksa & Penguji (PJ)">
                  <Select value={form.pj3Id ?? ""} onChange={(e) => set("pj3Id", e.target.value || null)}>
                    <option value="">-- Pilih PJ --</option>
                    {pjList.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>)}
                  </Select>
                </Field>
              </div>
            </Sec>

            {/* PEMERIKSAAN PHB TR */}
            <Sec title="IV. Pemeriksaan Fungsi PHB TR" open={open.phbTr} onToggle={() => toggle("phbTr")}>
              {/* Peralatan Proteksi PHB TR */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Peralatan Proteksi</p>
                <div className="space-y-2">
                  {(form.interlockPhbTr ?? []).map((row, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1.5 relative">
                      <button type="button" onClick={() => removeInterlockTrRow(i)}
                        className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-600">
                        <X size={13} />
                      </button>
                      <Input placeholder="Indikasi" value={row.indikasi}
                        onChange={(e) => setInterlockTrRow(i, "indikasi", e.target.value)} />
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input placeholder="Hasil Uji" value={row.hasilUji}
                          onChange={(e) => setInterlockTrRow(i, "hasilUji", e.target.value)} />
                        <Input placeholder="Keterangan" value={row.keterangan}
                          onChange={(e) => setInterlockTrRow(i, "keterangan", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addInterlockTrRow}
                  className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800">
                  <Plus size={13} /> Tambah baris
                </button>
              </div>

              {/* Peralatan Kontrol PHB TR (5 baris fixed) */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Peralatan Kontrol (V, I, Freq, P, E)</p>
                <div className="space-y-1.5">
                  {(form.interlockPhbTrKontrol ?? []).map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-1.5">
                      <Input placeholder="Indikasi" value={row.indikasi}
                        onChange={(e) => setKontrolTrRow(i, "indikasi", e.target.value)} />
                      <Input placeholder="Keterangan" value={row.keterangan}
                        onChange={(e) => setKontrolTrRow(i, "keterangan", e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Foto PHB TR */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Foto PHB TR</p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((idx) => {
                    const slotKey = `phbtr_${idx}`;
                    return (
                      <PhotoSlot key={idx} label={`Foto ${idx + 1}`}
                        value={form.fotoPhbTr?.[idx]} uploading={!!uploading[slotKey]}
                        onUpload={(file) => handlePhotoUpload(file, (v) => setFotoPhbTr(idx, v), slotKey)}
                        onRemove={() => handlePhotoRemove(form.fotoPhbTr?.[idx], (v) => setFotoPhbTr(idx, v), slotKey)} />
                    );
                  })}
                </div>
              </div>

              {/* Analisis Urutan Fasa TR */}
              <Field label="Analisa Urutan Fasa PHB TR">
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[60px]"
                  value={form.analysisUrutanFasaTr ?? ""}
                  onChange={(e) => set("analysisUrutanFasaTr", e.target.value)} />
              </Field>

              {/* TTD 4 */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">TTD Seksi 4</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nama Saksi">
                    <Input value={form.saksi4Nama ?? ""} onChange={(e) => set("saksi4Nama", e.target.value)} />
                  </Field>
                  <Field label="Jabatan Saksi">
                    <Input value={form.saksi4Jabatan ?? ""} onChange={(e) => set("saksi4Jabatan", e.target.value)} />
                  </Field>
                </div>
                <Field label="Pemeriksa & Penguji (PJ)">
                  <Select value={form.pj4Id ?? ""} onChange={(e) => set("pj4Id", e.target.value || null)}>
                    <option value="">-- Pilih PJ --</option>
                    {pjList.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>)}
                  </Select>
                </Field>
              </div>
            </Sec>

          </div>
        </div>

        {/* ── Preview panel ── */}
        <div className={`${tab === "preview" ? "flex" : "hidden"} md:flex flex-1 overflow-auto bg-slate-200 p-6 items-start justify-center`}>
          <div
            ref={printRef}
            style={{
              transformOrigin: "top center",
              transform: `scale(${zoom / 100})`,
              width: 794,
              flexShrink: 0,
            }}
          >
            <TemplateLaikOperasi
              data={form}
              instansi={selectedInstansi}
              pageMargin={10}
              fontScale={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
