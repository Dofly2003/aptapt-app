import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { db, storage } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getAllSaldo, getTransactions, topUp, addExpense,
  formatRp, KATEGORI_EXPENSE,
} from "../../services/akomService";
import { addGpsWatermark } from "../../utils/geoWatermark";
import {
  AdminPageHeader, Button, Field, Input, Select, Modal, useToast,
} from "../../components/admin/AdminUI";
import {
  Wallet, TrendingDown, Users, History, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, CheckCircle2, AlertTriangle,
  Camera, X, MapPin,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) { return formatRp(n); }

function TxBadge({ type, kategori }) {
  if (type === "topup" || type === "topup+reimburse") {
    const hasReim = type === "topup+reimburse";
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${hasReim ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
        {hasReim ? "Top Up + Reimburse" : "Top Up"}
      </span>
    );
  }
  const k = KATEGORI_EXPENSE.find(x => x.value === kategori);
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
      {k ? `${k.emoji} ${k.label}` : kategori}
    </span>
  );
}

function SaldoBadge({ saldo, hutang }) {
  if (hutang > 0) return (
    <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
      <AlertTriangle size={13} /> Hutang {fmt(hutang)}
    </span>
  );
  if (saldo > 0) return (
    <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
      <CheckCircle2 size={13} /> Saldo {fmt(saldo)}
    </span>
  );
  return <span className="text-slate-400 text-sm">Rp 0</span>;
}

// ─── Modal Top Up ────────────────────────────────────────────────────────────

const ELIGIBLE_ROLES = ["admin", "superadmin", "finance"];

function ModalTopUp({ open, onClose, users, onSaved, operator }) {
  const [userId, setUserId]       = useState("");
  const [searchText, setSearchText] = useState("");
  const [showList, setShowList]   = useState(false);
  const [jumlah, setJumlah]       = useState("");
  const [ket, setKet]             = useState("");
  const [loading, setLoading]     = useState(false);
  const { show, Toast }           = useToast();

  // Only admin / finance / superadmin are eligible recipients
  const eligibleUsers = useMemo(
    () => users.filter(u => ELIGIBLE_ROLES.includes(u.role)),
    [users]
  );

  const filteredList = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  }, [eligibleUsers, searchText]);

  const selectedUser = users.find(u => u.id === userId);
  const saldoInfo    = selectedUser?._kasbon;

  useEffect(() => {
    if (open) { setUserId(""); setSearchText(""); setJumlah(""); setKet(""); setShowList(false); }
  }, [open]);

  function pickUser(u) {
    setUserId(u.id);
    setSearchText(u.name || u.email || "");
    setShowList(false);
  }

  async function handleSave() {
    if (!userId || !jumlah || isNaN(Number(jumlah)) || Number(jumlah) <= 0) {
      show("Pilih penerima dan masukkan jumlah yang valid", "error"); return;
    }
    setLoading(true);
    try {
      await topUp({
        userId,
        userName: selectedUser?.name || selectedUser?.email || userId,
        jumlah: Number(jumlah),
        keterangan: ket,
        operator,
      });
      show("Saldo berhasil diberikan");
      onSaved();
      onClose();
    } catch (e) {
      show(e.message || "Gagal top up", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Beri Saldo Kasbon" size="sm">
      <Toast />
      <div className="space-y-4">
        {saldoInfo?.hutang > 0 && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-blue-600" />
            <span>
              User ini punya hutang <strong>{fmt(saldoInfo.hutang)}</strong>.
              Dana yang masuk akan melunasi hutang dulu, sisanya jadi saldo.
            </span>
          </div>
        )}

        <Field label="Penerima" required>
          <div className="relative">
            <Input
              placeholder="Cari nama atau username..."
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setUserId(""); setShowList(true); }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              autoComplete="off"
            />
            {showList && filteredList.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredList.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={() => pickUser(u)}
                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="text-sm font-semibold text-slate-800">{u.name || u.email}</div>
                    <div className="text-xs text-slate-400">@{u.username || "–"} · {u.role}</div>
                  </button>
                ))}
              </div>
            )}
            {showList && searchText && filteredList.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-3 text-sm text-slate-400">
                Tidak ada hasil
              </div>
            )}
          </div>
          {userId && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 size={12} /> {selectedUser?.name || selectedUser?.email}
              {selectedUser?._kasbon?.hutang > 0 && (
                <span className="text-red-500 ml-1">· Hutang {fmt(selectedUser._kasbon.hutang)}</span>
              )}
            </div>
          )}
        </Field>

        <Field label="Jumlah (Rp)" required>
          <Input
            type="number"
            min="1000"
            placeholder="500000"
            value={jumlah}
            onChange={e => setJumlah(e.target.value)}
          />
        </Field>
        <Field label="Keterangan">
          <Input placeholder="Uang jalan proyek X..." value={ket} onChange={e => setKet(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button loading={loading} onClick={handleSave}>
            <ArrowUpCircle size={14} /> Beri Saldo
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal History ────────────────────────────────────────────────────────────

function ModalHistory({ open, onClose, user }) {
  const [txs, setTxs]       = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getTransactions(user.id)
      .then(setTxs)
      .finally(() => setLoading(false));
  }, [open, user]);

  return (
    <Modal open={open} onClose={onClose} title={`Riwayat — ${user?.name || user?.email}`} size="lg">
      <div className="space-y-3">
        {/* Saldo ringkasan */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-emerald-700">{fmt(user?._kasbon?.saldo)}</div>
            <div className="text-xs text-emerald-600 mt-0.5">Saldo aktif</div>
          </div>
          <div className={`border rounded-xl p-3 text-center ${user?._kasbon?.hutang > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
            <div className={`text-lg font-bold ${user?._kasbon?.hutang > 0 ? "text-red-600" : "text-slate-400"}`}>{fmt(user?._kasbon?.hutang)}</div>
            <div className={`text-xs mt-0.5 ${user?._kasbon?.hutang > 0 ? "text-red-500" : "text-slate-400"}`}>Hutang perusahaan</div>
          </div>
        </div>

        {/* Tabel transaksi */}
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
        ) : txs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Belum ada transaksi</div>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Tanggal</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Jenis</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Jumlah</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{tx.tanggal}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <TxBadge type={tx.type} kategori={tx.kategori} />
                        {tx.keterangan && <span className="text-[11px] text-slate-400 truncate max-w-[180px]">{tx.keterangan}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <span className={tx.type === "expense" ? "text-red-600" : "text-emerald-600"}>
                        {tx.type === "expense" ? "−" : "+"}{fmt(tx.jumlah)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 text-xs">
                      <div>{fmt(tx.saldoAfter)}</div>
                      {tx.hutangAfter > 0 && <div className="text-red-500">Hutang {fmt(tx.hutangAfter)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal Tambah Expense (dari web) ─────────────────────────────────────────

function ModalExpense({ open, onClose, users, onSaved, operator, canTopUpRole }) {
  const [userId, setUserId]         = useState(operator?.uid || "");
  const [jumlah, setJumlah]         = useState("");
  const [kategori, setKategori]     = useState("makan");
  const [ket, setKet]               = useState("");
  const [foto, setFoto]             = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const fileInputRef                = useRef(null);
  const { show, Toast }             = useToast();

  useEffect(() => {
    if (!canTopUpRole) setUserId(operator?.uid || "");
    if (!open) { setFoto(null); setFotoPreview(null); setJumlah(""); setKet(""); setKategori("makan"); setProcessingPhoto(false); }
  }, [open]);

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingPhoto(true);
    setFoto(null); setFotoPreview(null);
    try {
      const stamped = await addGpsWatermark(file);
      setFoto(stamped);
      setFotoPreview(URL.createObjectURL(stamped));
    } catch {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    } finally {
      setProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!userId || !jumlah || Number(jumlah) <= 0) {
      show("Isi jumlah yang valid", "error"); return;
    }
    setLoading(true);
    try {
      let buktiUrl = null;
      if (foto) {
        setUploading(true);
        const path = `kasbon/${userId}/${Date.now()}_struk.jpg`;
        const snap = await uploadBytes(storageRef(storage, path), foto);
        buktiUrl = await getDownloadURL(snap.ref);
        setUploading(false);
      }
      const target = users.find(u => u.id === userId);
      await addExpense({
        userId,
        userName: target?.name || target?.email || userId,
        jumlah: Number(jumlah),
        kategori,
        keterangan: ket,
        buktiUrl,
        operator,
      });
      show("Pengeluaran dicatat");
      onSaved();
      onClose();
    } catch (e) {
      show(e.message || "Gagal menyimpan", "error");
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Catat Pengeluaran" size="sm">
      <Toast />
      <div className="space-y-4">
        {canTopUpRole && (
          <Field label="Untuk user" required>
            <Select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              options={[
                { value: "", label: "— Pilih user —" },
                ...users.map(u => ({ value: u.id, label: `${u.name || u.email}` })),
              ]}
            />
          </Field>
        )}
        <Field label="Kategori" required>
          <Select
            value={kategori}
            onChange={e => setKategori(e.target.value)}
            options={KATEGORI_EXPENSE.map(k => ({ value: k.value, label: `${k.emoji} ${k.label}` }))}
          />
        </Field>
        <Field label="Jumlah (Rp)" required>
          <Input type="number" min="0" placeholder="150000" value={jumlah} onChange={e => setJumlah(e.target.value)} />
        </Field>
        <Field label="Keterangan">
          <Input placeholder="Makan siang tim..." value={ket} onChange={e => setKet(e.target.value)} />
        </Field>

        {/* Foto Struk */}
        <Field label={<span className="flex items-center gap-1.5"><Camera size={13} /> Foto Struk <span className="text-slate-400 font-normal">(opsional)</span></span>}>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          {processingPhoto ? (
            <div className="flex items-center gap-2 px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-600">
              <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <MapPin size={13} className="shrink-0" /> Mengambil lokasi GPS...
            </div>
          ) : fotoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={fotoPreview} alt="struk" className="w-full max-h-40 object-cover" />
              <button
                type="button"
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm hover:border-amber-400 hover:text-amber-500 transition"
            >
              <Camera size={15} /> Upload / Ambil Foto
            </button>
          )}
        </Field>

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button loading={loading} onClick={handleSave}>
            <ArrowDownCircle size={14} /> {uploading ? "Mengupload..." : "Catat"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AkomKasbon() {
  const { user, role } = useContext(AuthContext);
  const { show, Toast } = useToast();

  const canTopUpRole = role === "finance" || role === "superadmin";

  const [allUsers, setAllUsers]       = useState([]);
  const [saldoMap, setSaldoMap]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [showTopUp, setShowTopUp]     = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [search, setSearch]           = useState("");

  async function load() {
    setLoading(true);
    try {
      const [usersSnap, saldos] = await Promise.all([
        getDocs(collection(db, "users")),
        getAllSaldo(),
      ]);
      const usersArr = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => !u.disabled && u.role !== "deleted_guest");
      const map = {};
      saldos.forEach(s => { map[s.userId] = s; });
      setAllUsers(usersArr);
      setSaldoMap(map);
    } catch (e) {
      show("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Gabungkan user dengan data kasbon-nya
  const usersWithKasbon = useMemo(() => {
    return allUsers.map(u => ({
      ...u,
      _kasbon: saldoMap[u.id] ?? { saldo: 0, hutang: 0 },
    }));
  }, [allUsers, saldoMap]);

  const filtered = useMemo(() => {
    if (!canTopUpRole) return usersWithKasbon.filter(u => u.id === user?.uid);
    const q = search.toLowerCase();
    if (!q) return usersWithKasbon;
    return usersWithKasbon.filter(u =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  }, [usersWithKasbon, search, canTopUpRole, user]);

  // Summary
  const totalSaldo  = usersWithKasbon.reduce((s, u) => s + (u._kasbon?.saldo  ?? 0), 0);
  const totalHutang = usersWithKasbon.reduce((s, u) => s + (u._kasbon?.hutang ?? 0), 0);
  const totalUsers  = usersWithKasbon.filter(u => (u._kasbon?.saldo > 0) || (u._kasbon?.hutang > 0)).length;

  const operator = { uid: user?.uid, displayName: user?.displayName, email: user?.email };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <Toast />
      <AdminPageHeader
        title="Kasbon Akomodasi & Makan"
        description="Kelola saldo kasbon dan pencatatan pengeluaran akomodasi serta makan perjalanan dinas."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => setShowExpense(true)}>
              <ArrowDownCircle size={14} /> Catat Pengeluaran
            </Button>
            {canTopUpRole && (
              <Button onClick={() => setShowTopUp(true)}>
                <ArrowUpCircle size={14} /> Beri Saldo
              </Button>
            )}
          </div>
        }
      />

      {/* Summary cards — hanya finance/superadmin */}
      {canTopUpRole && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Saldo Beredar</div>
              <div className="text-lg font-bold text-emerald-700">{fmt(totalSaldo)}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Hutang Perusahaan</div>
              <div className="text-lg font-bold text-red-600">{fmt(totalHutang)}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">User dengan Saldo/Hutang</div>
              <div className="text-lg font-bold text-blue-700">{totalUsers}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {canTopUpRole && (
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <input
              className="flex-1 h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              placeholder="Cari nama atau username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Nama</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Saldo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">Hutang Perusahaan</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{u.name || u.email}</div>
                      <div className="text-xs text-slate-400">@{u.username || "–"} · {u.role}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${u._kasbon.saldo > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {fmt(u._kasbon.saldo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {u._kasbon.hutang > 0 ? (
                        <span className="font-semibold text-red-600 flex items-center justify-end gap-1">
                          <AlertTriangle size={12} /> {fmt(u._kasbon.hutang)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setHistoryUser(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition ml-auto"
                      >
                        <History size={12} /> Riwayat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalTopUp
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
        users={usersWithKasbon}
        onSaved={load}
        operator={operator}
      />
      <ModalExpense
        open={showExpense}
        onClose={() => setShowExpense(false)}
        users={usersWithKasbon}
        onSaved={load}
        operator={operator}
        canTopUpRole={canTopUpRole}
      />
      {historyUser && (
        <ModalHistory
          open={!!historyUser}
          onClose={() => setHistoryUser(null)}
          user={historyUser}
        />
      )}
    </div>
  );
}
