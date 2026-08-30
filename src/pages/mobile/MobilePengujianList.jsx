import { useEffect, useState, useContext, useRef } from "react";
import { db } from "../../firebase/config";
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  query, orderBy, where, deleteDoc, updateDoc, doc,
} from "firebase/firestore";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import LaporanInfoSection from "../../components/LaporanInfoSection";
import { WifiOff, RefreshCw } from "lucide-react";
import localDb from "../../offline/db";
import { isOnline, onNetworkChange } from "../../offline/networkWatcher";
import { queueCreate, queueDelete, getPendingCount, flushQueue } from "../../offline/syncEngine";

const EMPTY_PELANGGAN = {
  nama: "", alamat: "", daya: "", tarif: "", idpel: "", noLhpp: "",
};
const EMPTY_LAPORAN_INFO = {
  instansiId: null, ttd: null,
};

export default function MobilePengujianList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  // CREATE modal — multi-step
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createPelanggan, setCreatePelanggan] = useState(EMPTY_PELANGGAN);
  const [createLaporanInfo, setCreateLaporanInfo] = useState(EMPTY_LAPORAN_INFO);
  const [creating, setCreating] = useState(false);

  // EDIT modal
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // ACTION modal
  const [actionModal, setActionModal] = useState(null);

  // Hold-to-action
  const holdRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const [holdingId, setHoldingId] = useState(null);

  const navigate = useNavigate();
  const { user, role } = useContext(AuthContext);

  // ============ NETWORK WATCHER ============
  useEffect(() => {
    const unsub = onNetworkChange(async (online) => {
      setOnline(online);
      if (online) {
        const n = await getPendingCount();
        setPendingCount(n);
      }
    });
    getPendingCount().then(setPendingCount);
    return unsub;
  }, []);

  // ============ FETCH ============
  useEffect(() => {
    if (!user) return;

    // Load cached items immediately from Dexie while waiting for Firestore
    localDb.pengujian.toArray().then(cached => {
      if (cached.length > 0) {
        const sorted = [...cached].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setList(sorted);
        setLoading(false);
      }
    });

    const canViewAll = role === "admin" || role === "superadmin" || role === "guest";
    const q = canViewAll
      ? query(collection(db, "pengujian"), orderBy("createdAt", "desc"))
      : query(collection(db, "pengujian"),
              where("createdBy", "==", user.uid),
              orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q,
      async (snap) => {
        const firestoreItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Preserve locally-created items not yet synced to Firestore
        const firestoreIds = new Set(firestoreItems.map(i => i.id));
        const allLocal = await localDb.pengujian.toArray();
        const pendingLocal = allLocal
          .filter(p => p.syncedAt === 0 && !firestoreIds.has(p.docId))
          .map(p => ({ ...p, id: p.docId }));

        setList([...pendingLocal, ...firestoreItems]);
        setLoading(false);

        // Only update Dexie for Firestore items — don't overwrite syncedAt:0 entries
        await localDb.pengujian.bulkPut(
          firestoreItems.map(i => ({ docId: i.id, ...i, syncedAt: Date.now() }))
        );
      },
      async (err) => {
        console.error(err);
        // Firestore unavailable — use Dexie cache
        const cached = await localDb.pengujian.toArray();
        if (cached.length > 0) {
          setList(cached.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, role]);

  // ============ CREATE ============
  const resetCreate = () => {
    setShowCreate(false);
    setCreateStep(1);
    setCreatePelanggan(EMPTY_PELANGGAN);
    setCreateLaporanInfo(EMPTY_LAPORAN_INFO);
  };

  const validateStep1 = () => {
    if (!createPelanggan.nama.trim()) {
      alert("Nama pelanggan wajib diisi");
      return false;
    }
    if (!createPelanggan.alamat.trim()) {
      alert("Alamat wajib diisi");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // instansi & ttd opsional — bisa diisi nanti di dalam form (tidak wajib saat offline)
    if (false) {
      alert("Pilih instansi pelaksana");
      return false;
    }
    if (false) {
      alert("Pilih penanggung jawab (TTD)");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setCreateStep(2);
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;
    setCreating(true);
    try {
      const payload = {
        nama: createPelanggan.nama.trim(),
        alamat: createPelanggan.alamat.trim(),
        daya: createPelanggan.daya.trim(),
        tarif: createPelanggan.tarif.trim(),
        idpel: createPelanggan.idpel.trim(),
        noLhpp: createPelanggan.noLhpp.trim(),
        instansiId: createLaporanInfo.instansiId,
        ttd: createLaporanInfo.ttd,
        createdBy: user.uid,
        status: "draft",
      };

      if (isOnline()) {
        const docRef = await addDoc(collection(db, "pengujian"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        resetCreate();
        navigate(`/app-mobile/form-pengujian/${docRef.id}`);
      } else {
        // Offline: create locally, queue for sync
        const localId = `local_${Date.now()}`;
        const now = Date.now();
        await localDb.pengujian.put({ docId: localId, ...payload, createdAt: now, updatedAt: now, syncedAt: 0 });
        await queueCreate("pengujian", { ...payload, createdAt: new Date() }, localId);
        setPendingCount(c => c + 1);
        resetCreate();
        navigate(`/app-mobile/form-pengujian/${localId}`);
      }
    } catch (err) {
      console.error("[MobilePengujianList] handleCreate error:", err);
      alert("Gagal membuat data pengujian. Silakan coba lagi.");
    } finally {
      setCreating(false);
    }
  };

  // ============ EDIT ============
  const openEdit = () => {
    setEditForm({
      id: actionModal.id,
      nama: actionModal.nama || "",
      alamat: actionModal.alamat || "",
      daya: actionModal.daya || "",
      tarif: actionModal.tarif || "",
      idpel: actionModal.idpel || "",
      noLhpp: actionModal.noLhpp || "",
      laporanInfo: {
        instansiId: actionModal.instansiId || null,
        ttd: actionModal.ttd || null,
      },
    });
    setActionModal(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.id) return;
    if (!editForm.nama.trim() || !editForm.alamat.trim()) {
      alert("Nama dan alamat pelanggan wajib diisi");
      return;
    }
    if (!editForm.laporanInfo.instansiId || !editForm.laporanInfo.ttd?.nama) {
      alert("Instansi dan penanggung jawab wajib dipilih");
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, "pengujian", editForm.id), {
        nama: editForm.nama.trim(),
        alamat: editForm.alamat.trim(),
        daya: editForm.daya.trim(),
        tarif: editForm.tarif.trim(),
        idpel: editForm.idpel.trim(),
        noLhpp: (editForm.noLhpp || "").trim(),
        instansiId: editForm.laporanInfo.instansiId,
        ttd: editForm.laporanInfo.ttd,
        updatedAt: serverTimestamp(),
      });
      setEditForm(null);
    } catch (err) {
      console.error("[MobilePengujianList] handleSaveEdit error:", err);
      alert("Gagal menyimpan perubahan. Silakan coba lagi.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ============ DELETE ============
  const handleDelete = async (id) => {
    if (!id || !confirm("Hapus data ini?")) return;
    try {
      await deleteDoc(doc(db, "pengujian", id));
      setActionModal(null);
    } catch (err) {
      console.error("[MobilePengujianList] handleDelete error:", err);
      alert("Gagal menghapus data. Silakan coba lagi.");
    }
  };

  // ============ HOLD ============
  const handleTouchStart = (e, item) => {
    const t = e.touches[0];
    startPos.current = { x: t.clientX, y: t.clientY };
    setHoldingId(item.id);
    holdRef.current = setTimeout(() => {
      navigator.vibrate?.(50);
      setActionModal(item);
      setHoldingId(null);
    }, 700);
  };
  const handleTouchMove = (e) => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - startPos.current.x) > 10 ||
        Math.abs(t.clientY - startPos.current.y) > 10) {
      clearTimeout(holdRef.current);
      setHoldingId(null);
    }
  };
  const handleTouchEnd = () => {
    clearTimeout(holdRef.current);
    setHoldingId(null);
  };

  // ============ UI ============
  return (
    <div className="p-3 pb-28 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Data Pengujian</h2>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={() => { flushQueue(); getPendingCount().then(setPendingCount); }}
              className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full"
            >
              <RefreshCw size={11} />
              {pendingCount} pending
            </button>
          )}
          {!online && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
              <WifiOff size={11} /> Offline
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">Loading...</p>
      ) : list.length === 0 ? (
        <div className="text-center mt-10">
          <p className="text-gray-400 mb-3">Belum ada data</p>
          <button onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            + Buat Pertama
          </button>
        </div>
      ) : (
        list.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/app-mobile/form-pengujian/${item.id}`)}
            onTouchStart={(e) => handleTouchStart(e, item)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`p-3 mb-2 rounded-xl shadow cursor-pointer transition active:scale-[0.98]
              ${holdingId === item.id ? "bg-red-100" : "bg-white"}`}
          >
            <p className="text-sm font-semibold">{item.nama || item.id}</p>
            {item.alamat && (
              <p className="text-xs text-gray-500 truncate">{item.alamat}</p>
            )}
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${
                item.status === "done" ? "text-green-600" : "text-yellow-600"
              }`}>
                {item.status}
              </p>
              {item.ttd?.nama && (
                <p className="text-[10px] text-gray-400">TTD: {item.ttd.nama}</p>
              )}
            </div>
          </div>
        ))
      )}

      {/* FAB */}
      <button onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg active:scale-95 transition">
        + Buat
      </button>

      {/* ============ CREATE MODAL (multi-step) ============ */}
      {showCreate && (
        <ModalShell title={`Buat Pengujian — Step ${createStep}/2`} onClose={resetCreate}>
          {createStep === 1 ? (
            <>
              <PelangganFields
                form={createPelanggan}
                onChange={setCreatePelanggan}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={resetCreate}
                  className="flex-1 bg-gray-200 py-2 rounded text-sm">
                  Batal
                </button>
                <button onClick={handleNext}
                  className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">
                  Lanjut →
                </button>
              </div>
            </>
          ) : (
            <>
              <LaporanInfoSection
                value={createLaporanInfo}
                onChange={setCreateLaporanInfo}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setCreateStep(1)}
                  className="flex-1 bg-gray-200 py-2 rounded text-sm">
                  ← Kembali
                </button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2 rounded text-sm disabled:bg-gray-400">
                  {creating ? "Membuat..." : "Buat & Lanjutkan"}
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {/* ============ EDIT MODAL ============ */}
      {editForm && (
        <ModalShell title="Edit Data Laporan" onClose={() => setEditForm(null)}>
          <PelangganFields
            form={editForm}
            onChange={(patch) => setEditForm({ ...editForm, ...patch })}
          />
          <div className="my-3" />
          <LaporanInfoSection
            value={editForm.laporanInfo}
            onChange={(li) => setEditForm({ ...editForm, laporanInfo: li })}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => setEditForm(null)}
              className="flex-1 bg-gray-200 py-2 rounded text-sm">
              Batal
            </button>
            <button onClick={handleSaveEdit} disabled={savingEdit}
              className="flex-1 bg-blue-600 text-white py-2 rounded text-sm disabled:bg-gray-400">
              {savingEdit ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ============ ACTION MODAL ============ */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-4 space-y-3">
            <div>
              <p className="font-semibold text-sm">{actionModal.nama || "(tanpa nama)"}</p>
              {actionModal.alamat && (
                <p className="text-xs text-gray-500">{actionModal.alamat}</p>
              )}
              {actionModal.ttd?.nama && (
                <p className="text-xs text-gray-400 mt-1">
                  TTD: {actionModal.ttd.nama} {actionModal.ttd.jabatan && `· ${actionModal.ttd.jabatan}`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Link
                to={`/laporan/${actionModal.id}`}
                onClick={() => setActionModal(null)}
                className="block w-full bg-indigo-600 text-white py-2 rounded text-center"
              >
                📑 Lihat Laporan
              </Link>

              <button onClick={openEdit}
                className="w-full bg-blue-600 text-white py-2 rounded">
                ✏️ Edit Data
              </button>

              <button onClick={() => handleDelete(actionModal.id)}
                className="w-full bg-red-600 text-white py-2 rounded">
                🗑️ Hapus
              </button>

              <button onClick={() => setActionModal(null)}
                className="w-full bg-gray-200 py-2 rounded">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== SUBCOMPONENTS ==============

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PelangganFields({ form, onChange }) {
  // Allow either full replace or partial patch
  const set = (k, v) => {
    if (typeof onChange === "function") {
      // Detect: caller pass setter that expects full object vs patch
      onChange.length === 1
        ? onChange({ ...form, [k]: v })   // full object
        : onChange({ [k]: v });           // patch (won't happen with current callers, but safe)
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Nama Pelanggan" required>
        <input
          value={form.nama}
          onChange={(e) => set("nama", e.target.value)}
          placeholder="PT. Dharma Anugerah Indah"
          className="w-full border px-3 py-2 rounded text-sm"
          autoFocus
        />
      </Field>

      <Field label="Alamat" required>
        <input
          value={form.alamat}
          onChange={(e) => set("alamat", e.target.value)}
          placeholder="Jl. Raya Menganti No. 1, Gresik"
          className="w-full border px-3 py-2 rounded text-sm"
        />
      </Field>





















































































      <div className="grid grid-cols-2 gap-2">
        <Field label="Daya">
          <input
            value={form.daya}
            onChange={(e) => set("daya", e.target.value)}
            placeholder="1.385 kVA"
            className="w-full border px-3 py-2 rounded text-sm"
          />
        </Field>
        <Field label="Tarif">
          <input
            value={form.tarif}
            onChange={(e) => set("tarif", e.target.value)}
            placeholder="INDUSTRI"
            className="w-full border px-3 py-2 rounded text-sm"
          />
        </Field>
      </div>

      <Field label="IDPEL">
        <input
          value={form.idpel}
          onChange={(e) => set("idpel", e.target.value)}
          placeholder="514550814336"
          className="w-full border px-3 py-2 rounded text-sm"
        />
      </Field>

      <Field label="No. LHPP">
        <input
          value={form.noLhpp || ""}
          onChange={(e) => set("noLhpp", e.target.value)}
          placeholder="001/LHPP/ADY/IV/2026"
          className="w-full border px-3 py-2 rounded text-sm"
        />
      </Field>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}