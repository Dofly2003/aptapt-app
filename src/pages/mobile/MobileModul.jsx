import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  Wallet, Package, FileText, Receipt,
  StickyNote, ClipboardList, ChevronRight, FolderUp, Wrench,
} from "lucide-react";

const ALL_MODULES = [
  {
    id: "keuangan",
    label: "Keuangan",
    desc: "Ledger, AP, AR, Anggaran, Arus Kas",
    path: "/app-mobile/keuangan",
    icon: Wallet,
    color: "bg-blue-50 text-blue-600",
    roles: ["superadmin", "finance"],
  },
  {
    id: "inventori",
    label: "Inventori",
    desc: "Stok barang, pergerakan & gudang",
    path: "/app-mobile/inventori",
    icon: Package,
    color: "bg-emerald-50 text-emerald-600",
    roles: ["admin", "superadmin", "finance"],
  },
  {
    id: "rab",
    label: "RAB / Penawaran",
    desc: "Rencana anggaran biaya",
    path: "/app-mobile/rab",
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
    roles: ["admin", "superadmin"],
  },
  {
    id: "invoice",
    label: "Invoice",
    desc: "Tagihan & pembayaran",
    path: "/app-mobile/invoice",
    icon: Receipt,
    color: "bg-purple-50 text-purple-600",
    roles: ["admin", "superadmin", "finance"],
  },
  {
    id: "pengujian",
    label: "Form Pengujian",
    desc: "NIDI & SLO field",
    path: "/app-mobile/form-pengujian",
    icon: ClipboardList,
    color: "bg-cyan-50 text-cyan-600",
    roles: ["admin", "superadmin", "finance", "editor", "user"],
  },
  {
    id: "catatan",
    label: "Catatan",
    desc: "Catatan lapangan",
    path: "/app-mobile/notes",
    icon: StickyNote,
    color: "bg-rose-50 text-rose-600",
    roles: ["admin", "superadmin", "finance", "editor", "user"],
  },
  {
    id: "alat-kerja",
    label: "Alat Kerja",
    desc: "Inventaris alat lapangan & bengkel",
    path: "/app-mobile/alat-kerja",
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    roles: ["admin", "superadmin"],
  },
  {
    id: "file-share",
    label: "Berbagi File",
    desc: "Upload APK, ZIP, dokumen — hapus 24 jam",
    path: "/app-mobile/file-share",
    icon: FolderUp,
    color: "bg-slate-100 text-slate-600",
    roles: ["superadmin"],
  },
];

export default function MobileModul() {
  const { role, profile } = useContext(AuthContext);
  const navigate = useNavigate();

  const visible = ALL_MODULES.filter(m => m.roles.includes(role));

  return (
    <div className="p-4 space-y-4 min-h-screen">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">Modul</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Halo, {profile?.name?.split(" ")[0] ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map(({ id, label, desc, path, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => navigate(path)}
            className="bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100
                       active:scale-95 transition-transform flex flex-col gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-12">
          Tidak ada modul yang bisa diakses.
        </p>
      )}
    </div>
  );
}
