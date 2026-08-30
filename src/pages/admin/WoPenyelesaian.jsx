import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { uploadViaPresign, presignGetOne } from "../../firebase/secureStorage";
import {
  ArrowLeft, CheckCircle, MapPin, User, Zap, FileText, Upload, Download
} from "lucide-react";
import { Button, useToast } from "../../components/admin/AdminUI";

const FIELD_LABELS = {
  nama: "Nama Pelanggan",
  nik: "NIK",
  daya: "Daya",
  peruntukan: "Peruntukan",
  keperluan: "Keperluan",
  alamat: "Alamat",
  desa: "Desa/Kelurahan",
  kecamatan: "Kecamatan",
  kota: "Kota/Kabupaten",
  provinsi: "Provinsi",
  kodePos: "Kode Pos",
  register: "No. Register",
  total_harga: "Total Harga",
};

const STATUS_LABEL = {
  process: { text: "Dalam Proses", cls: "bg-blue-100 text-blue-700" },
  done:    { text: "Selesai",      cls: "bg-green-100 text-green-700" },
  pending: { text: "Menunggu Pembayaran", cls: "bg-yellow-100 text-yellow-700" },
  new:     { text: "Baru",         cls: "bg-gray-100 text-gray-600" },
};

function PdfDropZone({ label, file, onChange, color = "blue" }) {
  const inputRef = useRef(null);
  const colors = {
    blue:    { border: "border-blue-400 bg-blue-50",    icon: "text-blue-500",    text: "text-blue-700"    },
    emerald: { border: "border-emerald-400 bg-emerald-50", icon: "text-emerald-500", text: "text-emerald-700" },
  };
  const c = colors[color];
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 block">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => onChange(e.target.files[0] ?? null)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex items-center gap-3 cursor-pointer transition
          ${file ? c.border : "border-slate-300 hover:border-amber-400 hover:bg-amber-50"}`}
      >
        <FileText size={20} className={file ? c.icon : "text-slate-400"} />
        <span className={`text-sm truncate ${file ? `${c.text} font-medium` : "text-slate-400"}`}>
          {file ? file.name : `Klik untuk unggah ${label} (PDF)`}
        </span>
      </div>
    </div>
  );
}

export default function WoPenyelesaian() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [pdfNidi, setPdfNidi]   = useState(null);
  const [pdfSlo, setPdfSlo]     = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "nidi_data", id));
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (err) {
        console.error("Gagal memuat data nidi_data:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSelesai = async () => {
    if (!data || data.status === "done") return;
    if (!pdfNidi || !pdfSlo) {
      show("Upload Sertifikat NIDI dan SLO terlebih dahulu", "error");
      return;
    }
    setSaving(true);
    try {
      const nidiPath = `nidi_data/${id}/sertifikat_nidi.pdf`;
      const sloPath  = `nidi_data/${id}/sertifikat_slo.pdf`;
      await uploadViaPresign(nidiPath, pdfNidi, "application/pdf");
      await uploadViaPresign(sloPath, pdfSlo, "application/pdf");
      await updateDoc(doc(db, "nidi_data", id), {
        status: "done",
        selesaiAt: serverTimestamp(),
        sertifikatNidiPath: nidiPath,
        sertifikatSloPath: sloPath,
      });
      setData(prev => ({ ...prev, status: "done", sertifikatNidiPath: nidiPath, sertifikatSloPath: sloPath }));
      show("Work order selesai. Sertifikat berhasil disimpan.");
    } catch (err) {
      console.error("Gagal menandai WO selesai:", err);
      show("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (path) => {
    try {
      const url = await presignGetOne(path);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error("Gagal membuka sertifikat:", err);
      show("Gagal membuka file, coba lagi", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center px-4">
        <FileText className="mx-auto mb-4 text-slate-300" size={48} />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Data Tidak Ditemukan</h2>
        <p className="text-slate-500 mb-6">
          Work order dengan ID{" "}
          <span className="font-mono text-xs bg-slate-100 px-1 rounded">{id}</span>{" "}
          tidak ditemukan atau sudah dihapus.
        </p>
        <Button onClick={() => navigate("/dashboard/nidi/data")}>
          <ArrowLeft size={16} /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const status = STATUS_LABEL[data.status] ?? { text: data.status, cls: "bg-gray-100 text-gray-600" };
  const isMapAvailable = data.latitude && data.longitude;
  const canFinish = !!pdfNidi && !!pdfSlo;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <Toast />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Detail Work Order</h1>
          {data.register && <p className="text-xs text-slate-500 font-mono">{data.register}</p>}
        </div>
        <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${status.cls}`}>
          {status.text}
        </span>
      </div>

      {/* Identitas Pelanggan */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
          <User size={16} /> Identitas Pelanggan
        </div>
        {["nama", "nik", "daya", "peruntukan", "keperluan"].map(key => data[key] && (
          <div key={key} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{FIELD_LABELS[key]}</span>
            <span className="font-medium text-slate-800 text-right max-w-[60%]">{data[key]}</span>
          </div>
        ))}
        {data.total_harga > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{FIELD_LABELS.total_harga}</span>
            <span className="font-semibold text-green-600">
              Rp {data.total_harga.toLocaleString("id-ID")}
            </span>
          </div>
        )}
      </div>

      {/* Lokasi */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-600 font-semibold mb-1">
          <MapPin size={16} /> Lokasi
        </div>
        {["alamat", "desa", "kecamatan", "kota", "provinsi", "kodePos"].map(key => data[key] && (
          <div key={key} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{FIELD_LABELS[key]}</span>
            <span className="font-medium text-slate-800 text-right max-w-[60%]">{data[key]}</span>
          </div>
        ))}
        {isMapAvailable && (
          <a
            href={`https://maps.google.com/?q=${data.latitude},${data.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            <MapPin size={12} /> Buka di Google Maps
          </a>
        )}
      </div>

      {/* Penugasan */}
      {data.assignedName && (
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 text-slate-600 font-semibold mb-3">
            <Zap size={16} /> Penugasan
          </div>
          <p className="text-sm text-slate-500">Dikerjakan oleh</p>
          <p className="font-medium text-slate-800">{data.assignedName}</p>
        </div>
      )}

      {/* ====== UPLOAD SERTIFIKAT + TANDAI SELESAI ====== */}
      {data.status === "process" && (
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <Upload size={16} /> Upload Sertifikat
          </div>
          <p className="text-xs text-slate-500 -mt-1">
            Unggah kedua sertifikat berikut sebelum menandai pekerjaan selesai.
          </p>

          <PdfDropZone
            label="Sertifikat NIDI"
            file={pdfNidi}
            onChange={setPdfNidi}
            color="blue"
          />
          <PdfDropZone
            label="Sertifikat SLO"
            file={pdfSlo}
            onChange={setPdfSlo}
            color="emerald"
          />

          <Button
            onClick={handleSelesai}
            loading={saving}
            disabled={!canFinish}
            className="w-full justify-center py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <CheckCircle size={18} />
            {saving ? "Mengunggah & Menyimpan..." : "Tandai Selesai"}
          </Button>

          {!canFinish && (
            <p className="text-xs text-amber-600 text-center">
              Kedua sertifikat harus diunggah sebelum pekerjaan dapat diselesaikan.
            </p>
          )}
        </div>
      )}

      {/* ====== STATUS SELESAI + DOWNLOAD SERTIFIKAT ====== */}
      {data.status === "done" && (
        <div className="space-y-3">
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-green-700 font-semibold border border-green-200">
            <CheckCircle size={18} /> Work Order Selesai
          </div>

          {(data.sertifikatNidiPath || data.sertifikatNidiUrl || data.sertifikatSloPath || data.sertifikatSloUrl) && (
            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <Download size={16} /> Unduh Sertifikat
              </div>
              {data.sertifikatNidiPath ? (
                <button
                  type="button"
                  onClick={() => handleDownload(data.sertifikatNidiPath)}
                  className="w-full flex items-center gap-3 text-sm text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 rounded-xl p-3 transition text-left"
                >
                  <FileText size={16} className="text-blue-500 shrink-0" />
                  Sertifikat NIDI
                </button>
              ) : data.sertifikatNidiUrl && (
                <a
                  href={data.sertifikatNidiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 rounded-xl p-3 transition"
                >
                  <FileText size={16} className="text-blue-500 shrink-0" />
                  Sertifikat NIDI
                </a>
              )}
              {data.sertifikatSloPath ? (
                <button
                  type="button"
                  onClick={() => handleDownload(data.sertifikatSloPath)}
                  className="w-full flex items-center gap-3 text-sm text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 rounded-xl p-3 transition text-left"
                >
                  <FileText size={16} className="text-emerald-500 shrink-0" />
                  Sertifikat SLO
                </button>
              ) : data.sertifikatSloUrl && (
                <a
                  href={data.sertifikatSloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 rounded-xl p-3 transition"
                >
                  <FileText size={16} className="text-emerald-500 shrink-0" />
                  Sertifikat SLO
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
