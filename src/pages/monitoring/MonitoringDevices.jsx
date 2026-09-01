import { useEffect, useState } from "react";
import {
  AdminPageHeader, Button, Modal, Field, Input, Select, Toggle, EmptyState, useToast,
} from "../../components/admin/AdminUI";
import {
  watchDevices, createDevice, updateDevice, deleteDevice, defaultDataPath, DEVICE_TYPES,
} from "../../services/monitoringService";

const MONITORING_URL = "https://monitoring.pt-adytia.com";

const EMPTY = {
  name: "", type: "panel-daya", location: "", dataPath: "", active: true,
  thresholds: { vMin: "", vMax: "", levelWarn: "", levelMax: "" },
};

export default function MonitoringDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => watchDevices((list) => { setDevices(list); setLoading(false); }), []);

  const openNew = () => { setEditId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d) => {
    setEditId(d.id);
    setForm({ ...EMPTY, ...d, thresholds: { ...EMPTY.thresholds, ...(d.thresholds || {}) } });
    setOpen(true);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setTh = (k, v) => setForm((f) => ({ ...f, thresholds: { ...f.thresholds, [k]: v } }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nama device wajib diisi");
    setSaving(true);
    try {
      // buang threshold kosong -> number
      const thresholds = {};
      for (const [k, v] of Object.entries(form.thresholds)) {
        if (v !== "" && v != null && !Number.isNaN(Number(v))) thresholds[k] = Number(v);
      }
      const payload = {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        dataPath: form.dataPath.trim(),
        active: form.active,
        thresholds,
      };
      if (editId) await updateDevice(editId, payload);
      else await createDevice(payload);
      toast.success("Tersimpan");
      setOpen(false);
    } catch (e) {
      toast.error("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (d) => {
    if (!confirm(`Hapus device "${d.name}"? Data histori di RTDB tidak ikut terhapus.`)) return;
    try { await deleteDevice(d.id); toast.success("Device dihapus"); }
    catch (e) { toast.error("Gagal menghapus: " + e.message); }
  };

  const isLevel = form.type === "ketinggian";
  const pathPreview = form.dataPath.trim() || defaultDataPath(form.type, editId || "{id-baru}");

  return (
    <div className="p-4 md:p-6">
      <AdminPageHeader
        title="Monitoring — Device"
        description="Kelola perangkat panel daya & sensor ketinggian yang tampil di monitoring.pt-adytia.com"
        actions={<Button onClick={openNew}>+ Tambah Device</Button>}
      />

      {loading ? (
        <p className="text-slate-400 mt-6">Memuat…</p>
      ) : devices.length === 0 ? (
        <EmptyState
          title="Belum ada device"
          description="Tambahkan panel daya atau sensor ketinggian pertama."
          action={<Button onClick={openNew}>+ Tambah Device</Button>}
        />
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Tipe</th>
                <th className="py-2 pr-3">Lokasi</th>
                <th className="py-2 pr-3">Path data RTDB</th>
                <th className="py-2 pr-3">Aktif</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium">{d.name}</td>
                  <td className="py-2 pr-3">{d.type}</td>
                  <td className="py-2 pr-3 text-slate-500">{d.location || "–"}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">
                    {d.dataPath || defaultDataPath(d.type, d.id)}
                  </td>
                  <td className="py-2 pr-3">
                    <Toggle checked={d.active !== false} onChange={(v) => updateDevice(d.id, { active: v })} />
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-amber-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => onDelete(d)} className="text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-slate-400 mt-4">
            Dashboard publik:{" "}
            <a className="text-amber-600" href={`${MONITORING_URL}/panel-daya`} target="_blank" rel="noreferrer">
              {MONITORING_URL}/panel-daya
            </a>{" "}·{" "}
            <a className="text-amber-600" href={`${MONITORING_URL}/ketinggian`} target="_blank" rel="noreferrer">
              /ketinggian
            </a>
          </p>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit Device" : "Tambah Device"}>
        <div className="space-y-3">
          <Field label="Nama" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Panel Daya Gedung A" />
          </Field>
          <Field label="Tipe" required>
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {DEVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Lokasi">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Gardu induk / lantai 2 / dsb" />
          </Field>
          <Field label="Path data RTDB" hint={`Kosongkan untuk default: ${pathPreview}`}>
            <Input value={form.dataPath} onChange={(e) => set("dataPath", e.target.value)} placeholder="mis. panel1/log (device lama)" />
          </Field>

          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-slate-500 mb-2">Ambang batas (opsional)</p>
            {isLevel ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Waspada (cm)">
                  <Input type="number" value={form.thresholds.levelWarn} onChange={(e) => setTh("levelWarn", e.target.value)} />
                </Field>
                <Field label="Siaga (cm)">
                  <Input type="number" value={form.thresholds.levelMax} onChange={(e) => setTh("levelMax", e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tegangan min (V)">
                  <Input type="number" value={form.thresholds.vMin} onChange={(e) => setTh("vMin", e.target.value)} />
                </Field>
                <Field label="Tegangan max (V)">
                  <Input type="number" value={form.thresholds.vMax} onChange={(e) => setTh("vMax", e.target.value)} />
                </Field>
              </div>
            )}
          </div>

          <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Aktif (tampil di dashboard publik)" />

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
