import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { db, storage } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getSaldo, getTransactions, topUp, addExpense,
  formatRp, KATEGORI_EXPENSE,
} from "../../services/akomService";
import {
  ArrowLeft, Plus, Wallet, AlertTriangle, ArrowUpCircle,
  ArrowDownCircle, Camera, X, ChevronDown, ImageIcon,
} from "lucide-react";
import CameraButton from "../../components/CameraButton";
import { addGpsWatermark } from "../../utils/geoWatermark";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) { return formatRp(n); }

function TxRow({ tx }) {
  const isExpense = tx.type === "expense";
  const k = KATEGORI_EXPENSE.find(x => x.value === tx.kategori);
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5 ${isExpense ? "bg-red-100" : "bg-emerald-100"}`}>
        {isExpense ? (k?.emoji || "📋") : "💰"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {isExpense ? (k?.label || tx.kategori) : (tx.kategori === "topup+reimburse" ? "Top Up + Reimburse" : "Top Up Saldo")}
          </span>
          <span className={`text-sm font-bold shrink-0 ${isExpense ? "text-red-600" : "text-emerald-600"}`}>
            {isExpense ? "−" : "+"}{fmt(tx.jumlah)}
          </span>
        </div>
        {tx.keterangan && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{tx.keterangan}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-slate-400">{tx.tanggal}</span>
          {!isExpense && tx.reimburseAmount > 0 && (
            <span className="text-[11px] text-blue-500">Lunasi hutang {fmt(tx.reimburseAmount)}</span>
          )}
          {tx.buktiUrl && (
            <a href={tx.buktiUrl} target="_blank" rel="noreferrer"
               className="text-[11px] text-amber-600 underline">Lihat struk</a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal tambah pengeluaran ─────────────────────────────────────────────────

function ModalExpense({ open, onClose, userId, userName, onSaved, operator }) {
  const [jumlah, setJumlah]     = useState("");
  const [kategori, setKategori] = useState("makan");
  const [ket, setKet]           = useState("");
  const [foto, setFoto]               = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  function reset() {
    setJumlah(""); setKategori("makan"); setKet("");
    setFoto(null); setFotoPreview(null); setError(""); setProcessingPhoto(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingPhoto(true);
    setFotoPreview(null);
    setFoto(null);
    try {
      const stamped = await addGpsWatermark(file);
      setFoto(stamped);
      setFotoPreview(URL.createObjectURL(stamped));
    } catch {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function handleSave() {
    setError("");
    if (!jumlah || isNaN(Number(jumlah)) || Number(jumlah) <= 0) {
      setError("Masukkan jumlah yang valid"); return;
    }
    setSaving(true);
    try {
      let buktiUrl = null;
      if (foto) {
        setUploading(true);
        const path = `kasbon/${userId}/${Date.now()}_struk.jpg`;
        const snap = await uploadBytes(storageRef(storage, path), foto);
        buktiUrl = await getDownloadURL(snap.ref);
        setUploading(false);
      }
      await addExpense({
        userId,
        userName,
        jumlah: Number(jumlah),
        kategori,
        keterangan: ket,
        buktiUrl,
        operator,
      });
      reset();
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false); setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100">
          <X size={20} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">Catat Pengeluaran</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Kategori */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Kategori</label>
          <div className="grid grid-cols-2 gap-2">
            {KATEGORI_EXPENSE.map(k => (
              <button
                key={k.value}
                onClick={() => setKategori(k.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                  kategori === k.value
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="text-base">{k.emoji}</span> {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Jumlah */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Jumlah (Rp) <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={jumlah}
              onChange={e => setJumlah(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Keterangan</label>
          <textarea
            rows={2}
            placeholder="Makan siang di warung X..."
            value={ket}
            onChange={e => setKet(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Foto struk */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Foto Struk <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          {processingPhoto ? (
            <div className="flex flex-col items-center justify-center gap-2 w-full py-5 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-amber-600 font-medium">Mengambil lokasi GPS...</span>
            </div>
          ) : fotoPreview ? (
            <div className="relative">
              <img src={fotoPreview} alt="struk" className="w-full max-h-56 object-cover rounded-xl border border-slate-200" />
              <button
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <CameraButton onChange={handleFotoChange}>
              <div className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-sm cursor-pointer hover:border-amber-400 hover:text-amber-500 transition">
                <Camera size={18} /> Ambil Foto Struk
              </div>
            </CameraButton>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 pb-safe">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
        >
          {saving ? (uploading ? "Mengupload foto..." : "Menyimpan...") : (
            <><ArrowDownCircle size={16} /> Simpan Pengeluaran</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Modal Top Up (untuk finance/superadmin dari mobile) ─────────────────────

function ModalTopUp({ open, onClose, allUsers, onSaved, operator }) {
  const [userId, setUserId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [ket, setKet]       = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function reset() { setUserId(""); setJumlah(""); setKet(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    setError("");
    if (!userId || !jumlah || Number(jumlah) <= 0) {
      setError("Pilih penerima dan masukkan jumlah"); return;
    }
    setSaving(true);
    try {
      const target = allUsers.find(u => u.id === userId);
      await topUp({
        userId,
        userName: target?.name || target?.email || userId,
        jumlah: Number(jumlah),
        keterangan: ket,
        operator,
      });
      reset(); onSaved(); onClose();
    } catch (e) {
      setError(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100">
          <X size={20} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">Beri Saldo Kasbon</h2>
      </div>
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Penerima <span className="text-red-500">*</span></label>
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">— Pilih penerima —</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Jumlah (Rp) <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
            <input
              type="number" inputMode="numeric" placeholder="0"
              value={jumlah} onChange={e => setJumlah(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Keterangan</label>
          <input
            type="text" placeholder="Uang jalan proyek..."
            value={ket} onChange={e => setKet(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-200 pb-safe">
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
        >
          {saving ? "Menyimpan..." : <><ArrowUpCircle size={16} /> Beri Saldo</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MobileAkomodasi() {
  const navigate = useNavigate();
  const { user, role } = useContext(AuthContext);

  const canTopUp = role === "finance" || role === "superadmin";

  const [saldo, setSaldo]           = useState({ saldo: 0, hutang: 0 });
  const [txs, setTxs]               = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("semua");
  const [showExpense, setShowExpense] = useState(false);
  const [showTopUp, setShowTopUp]   = useState(false);

  async function load() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        getSaldo(user.uid),
        getTransactions(user.uid),
      ]);
      setSaldo(s);
      setTxs(t);

      if (canTopUp) {
        const snap = await getDocs(collection(db, "users"));
        setAllUsers(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => !u.disabled && u.role !== "deleted_guest")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.uid]);

  const filtered = filter === "semua"
    ? txs
    : txs.filter(t => t.type === "topup" || t.type === "topup+reimburse"
        ? filter === "topup"
        : t.kategori === filter);

  const operator = {
    uid: user?.uid,
    displayName: user?.displayName,
    name: user?.displayName,
    email: user?.email,
  };
  const userName = user?.displayName || user?.email || "";

  const isHutang = saldo.hutang > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg bg-white/10 text-white">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white font-bold text-base">Kasbon Akomodasi & Makan</h1>
        </div>

        {/* Saldo Card */}
        <div className={`rounded-2xl p-4 ${isHutang ? "bg-red-500" : "bg-emerald-500"}`}>
          <p className="text-white/80 text-xs font-medium mb-1">
            {isHutang ? "Hutang Perusahaan (belum direimburse)" : "Saldo Tersedia"}
          </p>
          <div className="text-white text-2xl font-bold">
            {fmt(isHutang ? saldo.hutang : saldo.saldo)}
          </div>
          {isHutang && saldo.saldo === 0 && (
            <p className="text-white/70 text-[11px] mt-1">
              Perusahaan wajib mereimburse sejumlah ini kepada Anda.
            </p>
          )}
          {!isHutang && saldo.saldo === 0 && (
            <p className="text-white/70 text-[11px] mt-1">Saldo kosong. Minta top up ke finance.</p>
          )}
        </div>

        {/* Sub-info */}
        {isHutang && saldo.saldo >= 0 && (
          <div className="mt-2 bg-white/10 rounded-xl p-3 flex justify-between text-white text-xs">
            <span>Saldo aktif</span>
            <span className="font-semibold">{fmt(saldo.saldo)}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 -mt-1 flex gap-2 pt-3">
        <button
          onClick={() => setShowExpense(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm active:scale-95 transition"
        >
          <ArrowDownCircle size={15} className="text-amber-500" /> Catat Pengeluaran
        </button>
        {canTopUp && (
          <button
            onClick={() => setShowTopUp(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-sm active:scale-95 transition"
          >
            <ArrowUpCircle size={15} /> Beri Saldo
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "semua",     label: "Semua" },
            { key: "topup",     label: "💰 Top Up" },
            { key: "makan",     label: "🍽️ Makan" },
            { key: "transport", label: "🚗 Transport" },
            { key: "lainnya",   label: "📋 Lainnya" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === f.key
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="flex-1 mt-3 mx-4 bg-white rounded-2xl border border-slate-200 overflow-hidden mb-24">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Riwayat Transaksi</p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Belum ada transaksi</div>
        ) : (
          filtered.map(tx => <TxRow key={tx.id} tx={tx} />)
        )}
      </div>

      {/* Modals */}
      <ModalExpense
        open={showExpense}
        onClose={() => setShowExpense(false)}
        userId={user?.uid}
        userName={userName}
        onSaved={load}
        operator={operator}
      />
      <ModalTopUp
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        allUsers={allUsers}
        onSaved={load}
        operator={operator}
      />
    </div>
  );
}
