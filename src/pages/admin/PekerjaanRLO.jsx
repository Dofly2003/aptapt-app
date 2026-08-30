import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { uploadViaPresign, deleteRemote } from "../../firebase/secureStorage";
import { useSecurePhotoUrls } from "../../hooks/useSecurePhotoUrls";
import {
  AdminPageHeader, Button, Input, Field, Select, useToast,
} from "../../components/admin/AdminUI";
import {
  Save, Download, Plus, Trash2, Image as ImageIcon, ChevronLeft,
} from "lucide-react";
import imageCompression from "browser-image-compression";

// Both PDF modules resolved at runtime so they don't bloat the initial bundle
let _PDFDownloadLink = null;
let _RLODocument = null;
Promise.all([
  import("@react-pdf/renderer").catch(() => null),
  import("../../components/pdf/rlo/RLODocument").catch(() => null),
]).then(([pdfMod, rloMod]) => {
  if (pdfMod) _PDFDownloadLink = pdfMod.PDFDownloadLink;
  if (rloMod) _RLODocument = rloMod.default;
});

function PDFButton({ pekerjaan, selectedLit }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(!!_PDFDownloadLink && !!_RLODocument), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-slate-200 text-slate-400 cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Download RLO+SKLO
      </button>
    );
  }

  const Link = _PDFDownloadLink;
  const RLODoc = _RLODocument;

  return (
    <Link
      document={<RLODoc pekerjaan={pekerjaan} lit={selectedLit} />}
      fileName={`RLO_${pekerjaan.nomorNIDI || "draft"}.pdf`}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {({ loading }) => (
        <>
          <Download className="w-4 h-4" />
          {loading ? "Menyiapkan..." : "Download RLO+SKLO"}
        </>
      )}
    </Link>
  );
}

/* â”€â”€ upload helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function uploadImage(file, path) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: false,
  });
  await uploadViaPresign(path, compressed, "image/jpeg");
  return path;
}

/* â”€â”€ blank state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const blankPekerjaan = () => ({
  litId: "",
  nomorRLO: "",
  nomorSKLO: "",
  namaPemohon: "",
  nomorNIDI: "",
  tanggalNIDI: "",
  namaPemilik: "",
  alamatPemilik: "",
  jenisInstalasi: "",
  lokasiInstalasi: "",
  koordinatInstalasi: "",
  nomorSPJBTL: "",
  tanggalSPJBTL: "",
  jenisInstalasiSPJBTL: "",
  instalasiPemanfaatan: "",
  kapasitasTrafo: "",
  panjangSaluran: "",
  dayaTersambung: "",
  penyediaTL: "",
  tanggalPemeriksaan: "",
  namaPemilikC: "",
  alamatPemilikC: "",
  namaInstalasi: "",
  alamatInstalasi: "",
  riksaUji: "",
  koordinatLokasi: "",
  nomorAgenda: "",
  kabelList: [],
  cubicleList: [],
  tahananIsolasi: { rGnd: "", sGnd: "", tGnd: "", rS: "", sT: "", tR: "" },
  fotoMegger: { rG: null, sG: null, tG: null, rS: null, sT: null, tR: null },
  fotoMeggerPath: { rG: null, sG: null, tG: null, rS: null, sT: null, tR: null },
  tanggalDokumenRLO: "",
  tanggalDokumenSKLO: "",
  phbtm: "",
  phmTr: "",
  agendaSUG: "",
  pengujianId: null,
});

const blankKabel = () => ({ jalur: "", merk: "", tipe: "", panjang: "" });
const blankCubicle = () => ({ jenis: "", merk: "", tipe: "", tahunPembuatan: "", serialNumber: "" });

const FOTO_KEYS = [
  { key: "rG",  label: "R - GND" },
  { key: "sG",  label: "S - GND" },
  { key: "tG",  label: "T - GND" },
  { key: "rS",  label: "R - S" },
  { key: "sT",  label: "S - T" },
  { key: "tR",  label: "T - R" },
];

const TAHANAN_KEYS = [
  { key: "rGnd", label: "R - GND (MÎ©)" },
  { key: "sGnd", label: "S - GND (MÎ©)" },
  { key: "tGnd", label: "T - GND (MÎ©)" },
  { key: "rS",   label: "R - S (MÎ©)" },
  { key: "sT",   label: "S - T (MÎ©)" },
  { key: "tR",   label: "T - R (MÎ©)" },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function PekerjaanRLO() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const isEdit = !!id;

  const [pekerjaan, setPekerjaan] = useState(() => {
    const b = blankPekerjaan();
    const pengujianId = searchParams.get("pengujianId");
    if (pengujianId) b.pengujianId = pengujianId;
    return b;
  });

  const [litList, setLitList] = useState([]);
  const [selectedLit, setSelectedLit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState({});
  const fotoPaths = Object.values(pekerjaan.fotoMeggerPath || {}).filter(Boolean);
  const photoUrls = useSecurePhotoUrls(fotoPaths);

  /* â”€â”€ load LIT list â”€â”€ */
  useEffect(() => {
    getDocs(collection(db, "lembaga_lit")).then((snap) => {
      setLitList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  /* â”€â”€ sync selectedLit â”€â”€ */
  useEffect(() => {
    if (!pekerjaan.litId) { setSelectedLit(null); return; }
    const found = litList.find((l) => l.id === pekerjaan.litId);
    setSelectedLit(found || null);
  }, [pekerjaan.litId, litList]);

  /* â”€â”€ load existing pekerjaan if edit â”€â”€ */
  useEffect(() => {
    if (!isEdit) return;
    getDoc(doc(db, "pekerjaan", id)).then((snap) => {
      if (snap.exists()) {
        setPekerjaan({ ...blankPekerjaan(), ...snap.data() });
      }
    });
  }, [id, isEdit]);

  /* â”€â”€ helpers â”€â”€ */
  const set = (key, val) => setPekerjaan((p) => ({ ...p, [key]: val }));
  const setNested = (parent, key, val) =>
    setPekerjaan((p) => ({ ...p, [parent]: { ...p[parent], [key]: val } }));

  /* â”€â”€ kabelList â”€â”€ */
  const addKabel = () => set("kabelList", [...pekerjaan.kabelList, blankKabel()]);
  const updateKabel = (i, key, val) =>
    set("kabelList", pekerjaan.kabelList.map((k, idx) => idx === i ? { ...k, [key]: val } : k));
  const removeKabel = (i) => set("kabelList", pekerjaan.kabelList.filter((_, idx) => idx !== i));

  /* â”€â”€ cubicleList â”€â”€ */
  const addCubicle = () => set("cubicleList", [...pekerjaan.cubicleList, blankCubicle()]);
  const updateCubicle = (i, key, val) =>
    set("cubicleList", pekerjaan.cubicleList.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  const removeCubicle = (i) => set("cubicleList", pekerjaan.cubicleList.filter((_, idx) => idx !== i));

  /* â”€â”€ foto megger upload â”€â”€ */
  const handleFotoUpload = async (key, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { show("Hanya file gambar yang diizinkan", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { show("Ukuran file maksimal 5 MB", "error"); return; }
    setUploadingFoto((p) => ({ ...p, [key]: true }));
    try {
      const docId = id || `pekerjaan_${Date.now()}`;
      const path = `pekerjaan/${docId}/foto/${key}`;
      await uploadImage(file, path);
      setNested("fotoMeggerPath", key, path);
      setNested("fotoMegger", key, null);
    } catch (err) {
      show("Gagal upload foto: " + err.message, "error");
    } finally {
      setUploadingFoto((p) => ({ ...p, [key]: false }));
    }
  };

  /* â”€â”€ save â”€â”€ */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!pekerjaan.nomorNIDI && !pekerjaan.nomorRLO) {
      show("Nomor NIDI atau Nomor RLO wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...pekerjaan,
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, "pekerjaan", id), payload);
        show("Data pekerjaan berhasil diperbarui");
      } else {
        const newDoc = await addDoc(collection(db, "pekerjaan"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        show("Data pekerjaan berhasil disimpan");
        navigate(`/dashboard/pekerjaan/${newDoc.id}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  /* â”€â”€ PDF availability check â”€â”€ */
  const canDownloadPDF = !!selectedLit && !!(pekerjaan.nomorNIDI || pekerjaan.nomorRLO);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ render â”€â”€ */
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Toast />

      {/* â”€â”€ Sticky action bar â”€â”€ */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {isEdit ? "Edit Pekerjaan RLO/SKLO" : "Pekerjaan RLO/SKLO Baru"}
            </p>
            {pekerjaan.nomorNIDI && (
              <p className="text-xs text-slate-500">NIDI: {pekerjaan.nomorNIDI}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canDownloadPDF ? (
              <PDFButton pekerjaan={pekerjaan} selectedLit={selectedLit} />
            ) : (
              <button
                disabled
                title={!selectedLit ? "Pilih LIT terlebih dahulu" : "Isi nomor NIDI/RLO"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-slate-200 text-slate-400 cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download RLO+SKLO
              </button>
            )}
            <Button loading={saving} onClick={handleSave}>
              <Save className="w-4 h-4" />
              Simpan
            </Button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Body â”€â”€ */}
      <form onSubmit={handleSave} className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Card 1: Pilih LIT */}
        <Card title="LIT â€” Lembaga Inspeksi Teknik">
          <Field label="Pilih LIT" required>
            <Select
              value={pekerjaan.litId}
              onChange={(e) => set("litId", e.target.value)}
            >
              <option value="">-- Pilih LIT --</option>
              {litList.map((l) => (
                <option key={l.id} value={l.id}>{l.nama}</option>
              ))}
            </Select>
          </Field>
          {selectedLit && (
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-800 space-y-0.5">
              <p className="font-medium">{selectedLit.nama}</p>
              {selectedLit.nomorPerizinan && <p className="text-xs">Perizinan: {selectedLit.nomorPerizinan}</p>}
              {selectedLit.nomorKepmenESDM && <p className="text-xs">Kepmen ESDM: {selectedLit.nomorKepmenESDM}</p>}
            </div>
          )}
        </Card>

        {/* Card 2: Identitas Dokumen */}
        <Card title="Identitas Dokumen">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nomor RLO">
              <Input value={pekerjaan.nomorRLO} onChange={(e) => set("nomorRLO", e.target.value)} />
            </Field>
            <Field label="Nomor SKLO">
              <Input value={pekerjaan.nomorSKLO} onChange={(e) => set("nomorSKLO", e.target.value)} />
            </Field>
            <Field label="Nomor Agenda">
              <Input value={pekerjaan.nomorAgenda} onChange={(e) => set("nomorAgenda", e.target.value)} />
            </Field>
            <Field label="Riksa Uji">
              <Input value={pekerjaan.riksaUji} onChange={(e) => set("riksaUji", e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Card 3: Section A â€” Data Umum */}
        <Card title="A â€” Data Umum Pemohon">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nomor NIDI" required>
              <Input value={pekerjaan.nomorNIDI} onChange={(e) => set("nomorNIDI", e.target.value)} />
            </Field>
            <Field label="Tanggal NIDI">
              <Input type="date" value={pekerjaan.tanggalNIDI} onChange={(e) => set("tanggalNIDI", e.target.value)} />
            </Field>
            <Field label="Nama Pemohon">
              <Input value={pekerjaan.namaPemohon} onChange={(e) => set("namaPemohon", e.target.value)} />
            </Field>
            <Field label="Nama Pemilik">
              <Input value={pekerjaan.namaPemilik} onChange={(e) => set("namaPemilik", e.target.value)} />
            </Field>
            <Field label="Alamat Pemilik">
              <Input value={pekerjaan.alamatPemilik} onChange={(e) => set("alamatPemilik", e.target.value)} />
            </Field>
            <Field label="Jenis Instalasi">
              <Input value={pekerjaan.jenisInstalasi} onChange={(e) => set("jenisInstalasi", e.target.value)} />
            </Field>
            <Field label="Lokasi Instalasi">
              <Input value={pekerjaan.lokasiInstalasi} onChange={(e) => set("lokasiInstalasi", e.target.value)} />
            </Field>
            <Field label="Koordinat Instalasi">
              <Input value={pekerjaan.koordinatInstalasi} onChange={(e) => set("koordinatInstalasi", e.target.value)} placeholder="-7.12345, 107.12345" />
            </Field>
          </div>
        </Card>

        {/* Card 4: Section B â€” Hasil Pemeriksaan */}
        <Card title="B â€” Data SPJBTL & Teknis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Nomor SPJBTL">
              <Input value={pekerjaan.nomorSPJBTL} onChange={(e) => set("nomorSPJBTL", e.target.value)} />
            </Field>
            <Field label="Tanggal SPJBTL">
              <Input type="date" value={pekerjaan.tanggalSPJBTL} onChange={(e) => set("tanggalSPJBTL", e.target.value)} />
            </Field>
            <Field label="Jenis Instalasi SPJBTL">
              <Input value={pekerjaan.jenisInstalasiSPJBTL} onChange={(e) => set("jenisInstalasiSPJBTL", e.target.value)} />
            </Field>
            <Field label="Instalasi Pemanfaatan">
              <Input value={pekerjaan.instalasiPemanfaatan} onChange={(e) => set("instalasiPemanfaatan", e.target.value)} />
            </Field>
            <Field label="Kapasitas Trafo (kVA)">
              <Input value={pekerjaan.kapasitasTrafo} onChange={(e) => set("kapasitasTrafo", e.target.value)} />
            </Field>
            <Field label="Panjang Saluran (m)">
              <Input value={pekerjaan.panjangSaluran} onChange={(e) => set("panjangSaluran", e.target.value)} />
            </Field>
            <Field label="Daya Tersambung (kVA)">
              <Input value={pekerjaan.dayaTersambung} onChange={(e) => set("dayaTersambung", e.target.value)} />
            </Field>
            <Field label="Penyedia TL">
              <Input value={pekerjaan.penyediaTL} onChange={(e) => set("penyediaTL", e.target.value)} />
            </Field>
            <Field label="Tanggal Pemeriksaan">
              <Input type="date" value={pekerjaan.tanggalPemeriksaan} onChange={(e) => set("tanggalPemeriksaan", e.target.value)} />
            </Field>
            <Field label="PHB TM">
              <Input value={pekerjaan.phbtm} onChange={(e) => set("phbtm", e.target.value)} />
            </Field>
            <Field label="PHM TR">
              <Input value={pekerjaan.phmTr} onChange={(e) => set("phmTr", e.target.value)} />
            </Field>
            <Field label="Agenda SUG">
              <Input value={pekerjaan.agendaSUG} onChange={(e) => set("agendaSUG", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-2">
            <Field label="Nama Pemilik (C)">
              <Input value={pekerjaan.namaPemilikC} onChange={(e) => set("namaPemilikC", e.target.value)} />
            </Field>
            <Field label="Alamat Pemilik (C)">
              <Input value={pekerjaan.alamatPemilikC} onChange={(e) => set("alamatPemilikC", e.target.value)} />
            </Field>
            <Field label="Nama Instalasi">
              <Input value={pekerjaan.namaInstalasi} onChange={(e) => set("namaInstalasi", e.target.value)} />
            </Field>
            <Field label="Alamat Instalasi">
              <Input value={pekerjaan.alamatInstalasi} onChange={(e) => set("alamatInstalasi", e.target.value)} />
            </Field>
            <Field label="Koordinat Lokasi">
              <Input value={pekerjaan.koordinatLokasi} onChange={(e) => set("koordinatLokasi", e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Card 5: Kabel List */}
        <Card
          title="Data Kabel"
          actions={
            <Button type="button" variant="secondary" onClick={addKabel} className="!py-1.5 !text-xs">
              <Plus className="w-3 h-3" /> Tambah Kabel
            </Button>
          }
        >
          {pekerjaan.kabelList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada data kabel. Klik "Tambah Kabel".</p>
          ) : (
            <div className="space-y-3">
              {pekerjaan.kabelList.map((k, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { key: "jalur", label: "Jalur" },
                    { key: "merk", label: "Merk" },
                    { key: "tipe", label: "Tipe" },
                    { key: "panjang", label: "Panjang (m)" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                      <Input
                        value={k[key]}
                        onChange={(e) => updateKabel(i, key, e.target.value)}
                        className="!py-1.5 !text-xs"
                      />
                    </div>
                  ))}
                  <div className="col-span-2 md:col-span-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeKabel(i)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 6: Cubicle List */}
        <Card
          title="Data Cubicle"
          actions={
            <Button type="button" variant="secondary" onClick={addCubicle} className="!py-1.5 !text-xs">
              <Plus className="w-3 h-3" /> Tambah Cubicle
            </Button>
          }
        >
          {pekerjaan.cubicleList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada data cubicle. Klik "Tambah Cubicle".</p>
          ) : (
            <div className="space-y-3">
              {pekerjaan.cubicleList.map((c, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { key: "jenis", label: "Jenis" },
                    { key: "merk", label: "Merk" },
                    { key: "tipe", label: "Tipe" },
                    { key: "tahunPembuatan", label: "Tahun Pembuatan" },
                    { key: "serialNumber", label: "Serial Number" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                      <Input
                        value={c[key]}
                        onChange={(e) => updateCubicle(i, key, e.target.value)}
                        className="!py-1.5 !text-xs"
                      />
                    </div>
                  ))}
                  <div className="col-span-2 md:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeCubicle(i)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 7: Tahanan Isolasi */}
        <Card title="Tahanan Isolasi">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TAHANAN_KEYS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  step="any"
                  value={pekerjaan.tahananIsolasi[key]}
                  onChange={(e) => setNested("tahananIsolasi", key, e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            ))}
          </div>
        </Card>

        {/* Card 8: Foto Megger */}
        <Card title="Foto Megger">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FOTO_KEYS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <div className="relative aspect-video bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-400 transition overflow-hidden">
                  {(photoUrls[pekerjaan.fotoMeggerPath?.[key]] || pekerjaan.fotoMegger[key]) ? (
                    <>
                      <img
                        src={photoUrls[pekerjaan.fotoMeggerPath?.[key]] || pekerjaan.fotoMegger[key]}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const oldPath = pekerjaan.fotoMeggerPath?.[key];
                          if (oldPath) deleteRemote(oldPath).catch(() => {});
                          setNested("fotoMegger", key, null);
                          setNested("fotoMeggerPath", key, null);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        Ã—
                      </button>
                    </>
                  ) : uploadingFoto[key] ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                      Mengunggah...
                    </div>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-600">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-xs">Upload foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFotoUpload(key, f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Card 9: Tanggal Dokumen & SKLO tambahan */}
        <Card title="Tanggal Dokumen">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Field label="Tanggal Dokumen RLO">
              <Input
                type="date"
                value={pekerjaan.tanggalDokumenRLO}
                onChange={(e) => set("tanggalDokumenRLO", e.target.value)}
              />
            </Field>
            <Field label="Tanggal Dokumen SKLO">
              <Input
                type="date"
                value={pekerjaan.tanggalDokumenSKLO}
                onChange={(e) => set("tanggalDokumenSKLO", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Save button (bottom) */}
        <div className="flex justify-end gap-3 pt-2">
          <Button loading={saving} type="submit">
            <Save className="w-4 h-4" />
            {isEdit ? "Simpan Perubahan" : "Simpan Pekerjaan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* â”€â”€ helper component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Card({ title, children, actions }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {actions}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

