import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db, storage } from "../../firebase/config";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, Timestamp, serverTimestamp,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft, Upload, File, FileText, Archive, ImageIcon,
  Video, Trash2, Copy, Check, Clock, AlertCircle,
  CheckCircle, UploadCloud, Download, X,
} from "lucide-react";

const COL    = "temp_files";
const MAX_MB = 200;
const MAX_B  = MAX_MB * 1024 * 1024;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

/* ── helpers ── */
function formatSize(b) {
  if (b < 1024)        return b + " B";
  if (b < 1048576)     return (b / 1024).toFixed(1) + " KB";
  if (b < 1073741824)  return (b / 1048576).toFixed(1) + " MB";
  return (b / 1073741824).toFixed(2) + " GB";
}

function getExt(name = "") {
  return (name.split(".").pop() || "").toLowerCase();
}

function fileLabel(name) {
  const ext = getExt(name);
  if (!ext) return "FILE";
  return ext.toUpperCase();
}

function FileIcon({ name }) {
  const ext = getExt(name);
  if (ext === "apk")
    return <Archive size={22} className="text-emerald-500" />;
  if (["zip","rar","7z","tar","gz","bz2"].includes(ext))
    return <Archive size={22} className="text-amber-500" />;
  if (ext === "pdf")
    return <FileText size={22} className="text-red-500" />;
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext))
    return <ImageIcon size={22} className="text-blue-400" />;
  if (["mp4","mov","avi","mkv","webm","3gp"].includes(ext))
    return <Video size={22} className="text-purple-500" />;
  if (["doc","docx","xls","xlsx","ppt","pptx","txt","csv"].includes(ext))
    return <FileText size={22} className="text-blue-500" />;
  return <File size={22} className="text-slate-400" />;
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = expiresAt.toMillis() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}j ${m}m`;
}

function MobileToast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-24 left-4 right-4 z-[120] py-3 px-4 rounded-2xl text-sm font-semibold text-white shadow-xl flex items-center gap-2
      ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
      {toast.type === "error"
        ? <AlertCircle size={16} className="shrink-0" />
        : <CheckCircle size={16} className="shrink-0" />}
      {toast.msg}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MobileFileShare() {
  const { user, role, profile } = useContext(AuthContext);
  const navigate    = useNavigate();
  const inputRef    = useRef(null);

  const [files,     setFiles]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [uploading, setUploading]= useState(false);
  const [progress,  setProgress] = useState(0);
  const [toast,     setToast]    = useState(null);
  const [copied,    setCopied]   = useState(null);
  const [deleting,  setDeleting] = useState(null);

  const isSuperAdmin = role === "superadmin";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  /* ── refresh countdown every 60s ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  /* ── load & purge expired files ── */
  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, COL), orderBy("createdAt", "desc"))
      );
      const now    = Date.now();
      const valid  = [];
      const purge  = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.expiresAt && data.expiresAt.toMillis() <= now) {
          purge.push({ id: d.id, path: data.storagePath });
        } else {
          valid.push({ id: d.id, ...data });
        }
      }
      // Purge expired silently (backup client-side cleanup)
      for (const f of purge) {
        if (f.path) try { await deleteObject(ref(storage, f.path)); } catch {}
        try { await deleteDoc(doc(db, COL, f.id)); } catch {}
      }
      setFiles(valid);
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat daftar file", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  /* ── upload ── */
  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!isSuperAdmin) { showToast("Hanya superadmin yang bisa upload", "error"); return; }
    if (file.size > MAX_B) { showToast(`Maksimal ${MAX_MB} MB per file`, "error"); return; }

    setUploading(true);
    setProgress(0);
    try {
      const uid       = user.uid;
      const fileId    = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `temp_files/${uid}/${fileId}/${safeName}`;
      const storageRef  = ref(storage, storagePath);

      // Cache-Control max-age = 24 jam (sama dengan TTL file)
      // contentDisposition attachment → browser download, tidak buka inline
      const metadata = {
        cacheControl:       "public, max-age=86400",
        contentType:        file.type || "application/octet-stream",
        contentDisposition: `attachment; filename="${safeName}"`,
      };
      const task = uploadBytesResumable(storageRef, file, metadata);

      await new Promise((res, rej) =>
        task.on("state_changed",
          s => setProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)),
          rej, res)
      );

      const fileUrl  = await getDownloadURL(storageRef);
      const expiresAt = Timestamp.fromMillis(Date.now() + TTL_MS);

      await addDoc(collection(db, COL), {
        fileName:        file.name,
        fileUrl,
        storagePath,
        fileSize:        file.size,
        mimeType:        file.type,
        uploadedBy:      uid,
        uploadedByName:  profile?.name || user.email || "Pengguna",
        expiresAt,
        createdAt:       serverTimestamp(),
      });

      showToast("Upload berhasil — file akan dihapus dalam 24 jam");
      await load();
    } catch (e) {
      console.error(e);
      showToast("Gagal upload, coba lagi", "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  /* ── delete ── */
  const handleDelete = async (file) => {
    if (deleting) return;
    setDeleting(file.id);
    try {
      if (file.storagePath) {
        try { await deleteObject(ref(storage, file.storagePath)); } catch {}
      }
      await deleteDoc(doc(db, COL, file.id));
      setFiles(prev => prev.filter(f => f.id !== file.id));
      showToast("File dihapus permanen");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus", "error");
    } finally {
      setDeleting(null);
    }
  };

  /* ── download ── */
  const handleDownload = (file) => {
    if (Capacitor.isNativePlatform()) {
      // _system → buka di system browser Android, bukan in-app WebView
      // contentDisposition:attachment sudah di-set saat upload → langsung download
      window.open(file.fileUrl, "_system");
    } else {
      const a = document.createElement("a");
      a.href = file.fileUrl;
      a.download = file.fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  /* ── copy link ── */
  const handleCopy = async (file) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(file.fileUrl);
      } else {
        // fallback for older WebViews
        const el = document.createElement("textarea");
        el.value = file.fileUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(file.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast("Tidak bisa menyalin link", "error");
    }
  };

  const canDelete = () => isSuperAdmin;

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={40} className="text-slate-300 mb-4" />
        <p className="font-semibold text-slate-600">Akses Ditolak</p>
        <p className="text-sm text-slate-400 mt-1">Fitur ini hanya untuk Superadmin</p>
        <button onClick={() => navigate(-1)} className="mt-6 text-amber-600 text-sm font-medium">Kembali</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileToast toast={toast} />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 pt-safe">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 leading-none">Berbagi File</h1>
          <p className="text-[10px] text-amber-500 font-medium mt-0.5">Otomatis hapus dalam 24 jam</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white active:scale-95 disabled:opacity-50"
        >
          <Upload size={18} />
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleSelect} />
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
        <Clock size={15} className="text-amber-500 shrink-0 mt-px" />
        <div>
          <p className="text-xs font-semibold text-amber-700">Penyimpanan Sementara</p>
          <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
            File dihapus permanen dari Firebase Storage setelah <strong>24 jam</strong>.
            Maks. {MAX_MB} MB per file. APK, ZIP, PDF, dokumen, gambar, video didukung.
          </p>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mx-4 mt-3 bg-white border border-slate-100 rounded-2xl px-4 py-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2.5">
            <UploadCloud size={17} className="text-amber-500 animate-bounce" />
            <p className="text-sm font-semibold text-slate-700">Mengupload… {progress}%</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-4 pb-8 space-y-2.5">

        {/* Empty state */}
        {!uploading && !loading && files.length === 0 && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-2xl py-14
                       flex flex-col items-center gap-3 active:scale-[.98] transition mt-2"
          >
            <UploadCloud size={40} className="text-amber-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-amber-700">Tap untuk upload file</p>
              <p className="text-xs text-amber-500 mt-1">APK, ZIP, PDF, Dokumen — maks. {MAX_MB} MB</p>
            </div>
          </button>
        )}

        {loading && (
          <p className="text-center text-slate-400 py-12 text-sm">Memuat...</p>
        )}

        {/* File count */}
        {!loading && files.length > 0 && (
          <p className="text-xs text-slate-400 px-1">{files.length} file aktif</p>
        )}

        {/* File cards */}
        {files.map(file => {
          const left   = timeLeft(file.expiresAt);
          const busy   = deleting === file.id;
          const isMine = file.uploadedBy === user?.uid;

          return (
            <div key={file.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Info row */}
              <div className="px-4 py-3.5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-px">
                  <FileIcon name={file.fileName} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{file.fileName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatSize(file.fileSize)} · {fileLabel(file.fileName)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {isMine ? "Saya" : file.uploadedByName}
                    </span>
                    {left ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                        <Clock size={9} /> Sisa {left}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">
                        Kedaluwarsa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex border-t border-slate-100">
                {/* Download — primary action */}
                <button
                  onClick={() => handleDownload(file)}
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 active:bg-emerald-50 transition"
                >
                  <Download size={13} /> Unduh
                </button>

                <div className="w-px bg-slate-100" />

                {/* Copy link */}
                <button
                  onClick={() => handleCopy(file)}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium transition
                    ${copied === file.id ? "text-emerald-600 bg-emerald-50" : "text-blue-500 active:bg-blue-50"}`}
                >
                  {copied === file.id
                    ? <><Check size={13} /> Disalin</>
                    : <><Copy size={13} /> Salin Link</>}
                </button>

                {canDelete() && (
                  <>
                    <div className="w-px bg-slate-100" />
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={busy}
                      className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 active:bg-red-50 transition disabled:opacity-40"
                    >
                      {busy
                        ? <><X size={13} className="animate-spin" /> Hapus…</>
                        : <><Trash2 size={13} /> Hapus</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
