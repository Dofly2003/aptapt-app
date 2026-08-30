import { useEffect, useState } from "react";
import { Building2, User, Calendar, Hash } from "lucide-react";
import { getAllInstansi } from "../services/instansiService";

/**
 * Section "Informasi Laporan" untuk MobileFormPengujian.
 *
 * Snapshot pattern:
 *   Saat user pilih TTD, nama+jabatan+signature+stempel dicopy ke
 *   dokumen `pengujian.ttd`. Kalau admin nanti edit master instansi,
 *   laporan lama tetap pakai data snapshot — penting buat arsip.
 */
export default function LaporanInfoSection({ value = {}, onChange }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setList(await getAllInstansi({ aktifOnly: true })); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const selected = list.find(i => i.id === value.instansiId);
  const pjList = selected?.penanggungJawab ?? [];
  const selectedPj = pjList.find(p => p.id === value.ttd?.penanggungJawabId);

  const setInstansi = (instansiId) => {
    onChange({
      ...value,                                            // preserve ttd_client, noLhpp, dll
      instansiId,
      ttd: { tanggal: value.ttd?.tanggal || todayIso() }, // reset TTD tapi bukan client
    });
  };

  const setPj = (pjId) => {
    const pj = pjList.find(p => p.id === pjId);
    onChange({
      ...value,
      ttd: pj
        ? {
            penanggungJawabId: pj.id,
            nama: pj.nama,
            jabatan: pj.jabatan,
            signature: pj.signature ?? null,
            stempel: pj.stempel ?? null,
            tanggal: value.ttd?.tanggal || todayIso(),
          }
        : { tanggal: value.ttd?.tanggal || todayIso() },
    });
  };

  const setTanggal = (tanggal) => {
    onChange({ ...value, ttd: { ...(value.ttd || {}), tanggal } });
  };

  const setNoLhpp = (noLhpp) => onChange({ ...value, noLhpp });

  const setClientJabatan = (jabatan) => {
    onChange({ ...value, ttd_client: { ...(value.ttd_client || {}), jabatan } });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-sm text-slate-700">Informasi Laporan</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Untuk instansi mana? <span className="text-red-500">*</span>
          </label>
          <select
            value={value.instansiId || ""}
            onChange={(e) => setInstansi(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">{loading ? "Memuat..." : "— Pilih instansi —"}</option>
            {list.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
          </select>
          {!loading && !list.length && (
            <p className="text-xs text-amber-600 mt-1">
              Belum ada instansi. Minta admin tambahkan dulu di panel Instansi.
            </p>
          )}
        </div>

        {selected && (
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              <User className="w-3 h-3 inline mr-1" />
              Atas nama (TTD) <span className="text-red-500">*</span>
            </label>
            {pjList.length === 0 ? (
              <p className="text-xs text-amber-600">
                Instansi ini belum punya daftar penanggung jawab.
              </p>
            ) : (
              <select
                value={value.ttd?.penanggungJawabId || ""}
                onChange={(e) => setPj(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">— Pilih penanggung jawab —</option>
                {pjList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama}{p.jabatan && ` — ${p.jabatan}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-600 mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Tanggal Laporan
          </label>
          <input
            type="date"
            value={value.ttd?.tanggal || todayIso()}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>

        {selectedPj && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs">
            <p className="font-medium text-blue-900">{selectedPj.nama}</p>
            <p className="text-blue-700">{selectedPj.jabatan}</p>
            {(selectedPj.signature?.url || selectedPj.stempel?.url) && (
              <p className="text-blue-600 mt-1">
                ✓ {selectedPj.signature?.url && "TTD"}
                {selectedPj.signature?.url && selectedPj.stempel?.url && " + "}
                {selectedPj.stempel?.url && "Stempel"} otomatis
              </p>
            )}
          </div>
        )}

        {/* No LHPP */}
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            <Hash className="w-3 h-3 inline mr-1" />
            No. LHPP
          </label>
          <input
            type="text"
            value={value.noLhpp || ""}
            onChange={(e) => setNoLhpp(e.target.value)}
            placeholder="001/LHPP/ADY/IV/2026"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>

        {/* Jabatan perwakilan client */}
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            <User className="w-3 h-3 inline mr-1" />
            Jabatan Perwakilan Client
          </label>
          <input
            type="text"
            value={value.ttd_client?.jabatan || ""}
            onChange={(e) => setClientJabatan(e.target.value)}
            placeholder="Direktur Utama, Manager..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function todayIso() { return new Date().toISOString().slice(0, 10); }