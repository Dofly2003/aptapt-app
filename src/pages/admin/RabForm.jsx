import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, GripVertical, Save, Eye, ArrowLeft, RefreshCw } from "lucide-react";
import {
    AdminPageHeader, Button, Field, Input, TextArea, Select, Toggle, useToast,
} from "../../components/admin/AdminUI";
import { AuthContext } from "../../context/AuthContext";
import {
    createDokumen, updateDokumen, getDokumen, suggestNomor,
    hitungTotal, formatRupiah, formatRupiahPlain,
    newItem, SATUAN_OPTIONS, DEFAULT_CLOSING,
} from "../../services/rabService";
import { getAllInstansi } from "../../services/instansiService";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TODAY = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
    type: "rab",
    nomor: "",
    lampiran: "-",
    perihal: "",
    kepada: { yth: "Bapak / Ibu Pimpinan", perusahaan: "", di: "di tempat" },
    tanggal: TODAY(),
    lokasi: "",
    instansiId: "",
    ttd: null,
    items: [newItem()],
    ppnAktif: true,
    closingMessage: DEFAULT_CLOSING.rab,
    status: "draft",
};

export default function RabForm() {
    const { id } = useParams(); // undefined = create, defined = edit
    const isEdit = !!id;
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { show, Toast } = useToast();

    const [form, setForm] = useState(EMPTY);
    const [instansiList, setInstansiList] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Load instansi
    useEffect(() => {
        getAllInstansi({ aktifOnly: true })
            .then((list) => {
                setInstansiList(list);
                // Auto-pick first instansi if creating new
                if (!isEdit && list[0]) {
                    setForm((f) => ({
                        ...f,
                        instansiId: list[0].id,
                        lokasi: deriveKota(list[0].alamat),
                    }));
                }
            })
            .catch(console.error);
    }, [isEdit]);

    // Load existing doc on edit
    const loadedIdRef = useRef(null);

    useEffect(() => {
        if (!id || loadedIdRef.current === id) return;
        setLoading(true);
        getDokumen(id)
            .then((data) => {
                if (!data) {
                    show("Dokumen tidak ditemukan", "error");
                    navigate("/Dashboard/rab");
                    return;
                }
                setForm({ ...EMPTY, ...data });
                loadedIdRef.current = id;
            })
            .catch((err) => { console.error(err); show("Gagal load", "error"); })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Suggest nomor on first load (only for create)
    useEffect(() => {
        if (isEdit || form.nomor) return;
        suggestNomor("rab", form.tanggal).then((nomor) => {
            setForm((f) => f.nomor ? f : { ...f, nomor });
        }).catch(console.error);
    }, [isEdit, form.tanggal, form.nomor]);

    // Re-suggest when tanggal changes (and field belum diisi atau masih hasil suggest)
    const refreshNomor = async () => {
        const nomor = await suggestNomor("rab", form.tanggal);
        setForm((f) => ({ ...f, nomor }));
        show("Nomor disarankan ulang");
    };

    // Derived
    const totals = useMemo(() => hitungTotal(form.items, form.ppnAktif, 11), [form.items, form.ppnAktif]);
    const selectedInstansi = instansiList.find((i) => i.id === form.instansiId);
    const pjList = selectedInstansi?.penanggungJawab ?? [];

    // Handlers
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setKepada = (k, v) => setForm((f) => ({ ...f, kepada: { ...f.kepada, [k]: v } }));

    const handleInstansiChange = (id) => {
        const inst = instansiList.find((i) => i.id === id);
        setForm((f) => ({
            ...f,
            instansiId: id,
            lokasi: deriveKota(inst?.alamat) || f.lokasi,
            ttd: null, // reset karena beda instansi
        }));
    };

    const handlePjChange = (pjId) => {
        const pj = pjList.find((p) => p.id === pjId);
        setForm((f) => ({
            ...f,
            ttd: pj ? {
                penanggungJawabId: pj.id,
                nama: pj.nama, jabatan: pj.jabatan,
                signature: pj.signature ?? null, stempel: pj.stempel ?? null,
            } : null,
        }));
    };

    const updateItem = (idx, patch) => {
        setForm((f) => {
            const items = [...f.items];
            items[idx] = { ...items[idx], ...patch };
            return { ...f, items };
        });
    };
    const addItem = () => setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
    const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setForm((f) => {
            const oldIdx = f.items.findIndex((i) => i.id === active.id);
            const newIdx = f.items.findIndex((i) => i.id === over.id);
            return { ...f, items: arrayMove(f.items, oldIdx, newIdx) };
        });
    };

    // Validation + Save
    const validate = () => {
        if (!form.perihal.trim()) return "Perihal wajib diisi";
        if (!form.instansiId) return "Pilih instansi (letterhead)";
        if (!form.ttd?.nama) return "Pilih penanggung jawab (TTD)";
        if (!form.items.length) return "Minimal 1 item";
        const invalidItem = form.items.find((it) => !it.nama.trim());
        if (invalidItem) return "Ada item tanpa nama barang/pekerjaan";
        return null;
    };

    const save = async (statusNext) => {
        const err = validate();
        if (err) return show(err, "error");
        setSaving(true);
        try {
            const payload = { ...form, status: statusNext };
            if (isEdit) {
                await updateDokumen(id, payload);
                show("Tersimpan");
                // Final → langsung ke preview
                if (statusNext === "final") {
                    navigate(`/rab/${id}`);
                }
            } else {
                const newId = await createDokumen(payload, user.uid);
                loadedIdRef.current = newId;  // ← prevent reload effect
                show("RAB dibuat");
                if (statusNext === "final") {
                    // Final → langsung preview
                    navigate(`/rab/${newId}`);
                } else {
                    // Draft → stay di form, update URL silently
                    navigate(`/Dashboard/rab/${newId}`, { replace: true });
                }
            }
        } catch (err) {
            console.error(err);
            show("Gagal: " + err.message, "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Memuat...</div>;

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32">
            <Toast />

            <button onClick={() => navigate("/Dashboard/rab")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">
                <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
            </button>

            <AdminPageHeader
                title={isEdit ? "Edit RAB" : "Buat RAB Baru"}
                description="Lengkapi data surat penawaran. Foto TTD & stempel otomatis dari penanggung jawab instansi."
            />

            {/* === LETTER METADATA === */}
            <Section title="Informasi Surat">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nomor Surat" hint="Auto-suggest dari counter. Bebas di-override.">
                        <div className="flex gap-2">
                            <Input value={form.nomor} onChange={(e) => set("nomor", e.target.value)} placeholder="001/APT/V/2026" />
                            <Button type="button" variant="outline" onClick={refreshNomor} className="!px-3 shrink-0" title="Saran ulang">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </Field>
                    <Field label="Lampiran">
                        <Input value={form.lampiran} onChange={(e) => set("lampiran", e.target.value)} placeholder="-" />
                    </Field>
                    <Field label="Perihal" required>
                        <Input value={form.perihal} onChange={(e) => set("perihal", e.target.value)} placeholder="Biaya Instalasi Rumah Tinggal" />
                    </Field>
                    <Field label="Tanggal">
                        <Input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} />
                    </Field>
                </div>
            </Section>

            {/* === LETTERHEAD / INSTANSI === */}
            <Section title="Letterhead & Penanggung Jawab">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Instansi (Letterhead)" required>
                        <Select value={form.instansiId} onChange={(e) => handleInstansiChange(e.target.value)}>
                            <option value="">— Pilih instansi —</option>
                            {instansiList.map((i) => <option key={i.id} value={i.id}>{i.nama}</option>)}
                        </Select>
                    </Field>
                    <Field label="Lokasi (untuk header tanggal)" hint='Mis. "Gresik" → "Gresik, 6 Mei 2026"'>
                        <Input value={form.lokasi} onChange={(e) => set("lokasi", e.target.value)} placeholder="Gresik" />
                    </Field>
                    <Field label="Penanggung Jawab (TTD)" required>
                        <Select value={form.ttd?.penanggungJawabId || ""} onChange={(e) => handlePjChange(e.target.value)}>
                            <option value="">— Pilih TTD —</option>
                            {pjList.map((p) => <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>)}
                        </Select>
                        {!pjList.length && form.instansiId && (
                            <p className="text-xs text-amber-600 mt-1">Instansi belum punya penanggung jawab. Tambah di Master Data → Instansi.</p>
                        )}
                    </Field>
                </div>
            </Section>

            {/* === KEPADA === */}
            <Section title="Kepada Yth">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Yth"><Input value={form.kepada.yth} onChange={(e) => setKepada("yth", e.target.value)} placeholder="Bapak / Ibu Pimpinan" /></Field>
                    <Field label="Perusahaan / Instansi"><Input value={form.kepada.perusahaan} onChange={(e) => setKepada("perusahaan", e.target.value)} placeholder="Elektrical Solution" /></Field>
                    <Field label="Lokasi"><Input value={form.kepada.di} onChange={(e) => setKepada("di", e.target.value)} placeholder="di tempat" /></Field>
                </div>
            </Section>

            {/* === ITEMS === */}
            <Section title={`Items (${form.items.length})`}>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">

                    {/* Header — hanya tampil di desktop */}
                    <div className="hidden md:grid grid-cols-[24px_24px_1fr_80px_60px_120px_120px_28px] gap-2 px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                        <div></div>
                        <div>No</div>
                        <div>Nama Pekerjaan / Barang</div>
                        <div>Satuan</div>
                        <div>Vol</div>
                        <div>Harga Satuan</div>
                        <div>Jumlah</div>
                        <div></div>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={form.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                            {form.items.map((it, idx) => (
                                <ItemRow
                                    key={it.id}
                                    item={it}
                                    index={idx}
                                    onChange={(patch) => updateItem(idx, patch)}
                                    onRemove={() => removeItem(idx)}
                                    canRemove={form.items.length > 1}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <div className="p-2">
                        <Button type="button" variant="outline" onClick={addItem} className="w-full justify-center">
                            <Plus className="w-4 h-4" /> Tambah Item
                        </Button>
                    </div>
                </div>

                {/* Totals — pakai max-w-full di mobile */}
                <div className="mt-4 md:ml-auto md:max-w-sm bg-white border border-slate-200 rounded-lg p-3 text-sm">
                    <Row label="Jumlah" value={formatRupiah(totals.subtotal)} />
                    <Row
                        label={
                            <Toggle
                                checked={form.ppnAktif}
                                onChange={(e) => set("ppnAktif", e.target.checked)}
                                label="PPN 11%"
                            />
                        }
                        value={form.ppnAktif ? formatRupiah(totals.ppn) : "—"}
                    />
                    <div className="border-t border-slate-200 mt-2 pt-2">
                        <Row label={<strong>GRAND TOTAL</strong>} value={<strong className="text-amber-700">{formatRupiah(totals.grandTotal)}</strong>} />
                    </div>
                </div>
            </Section>

            {/* === CLOSING === */}
            <Section title="Closing">
                <Field label="Pesan Penutup">
                    <TextArea rows={2} value={form.closingMessage} onChange={(e) => set("closingMessage", e.target.value)} />
                </Field>
            </Section>

            {/* === ACTION BAR (sticky) === */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 px-3 sm:px-6 py-2 sm:py-3 z-20">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-slate-500 hidden sm:inline">
                        Grand Total: <strong className="text-amber-700">{formatRupiah(totals.grandTotal)}</strong>
                    </span>
                    {/* Mobile: compact total */}
                    <span className="text-xs text-slate-500 sm:hidden flex items-center justify-between">
                        <span>Grand Total</span>
                        <strong className="text-amber-700 text-sm">{formatRupiah(totals.grandTotal)}</strong>
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => save("draft")} loading={saving} className="flex-1 sm:flex-none justify-center">
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Simpan Draft</span>
                            <span className="sm:hidden">Draft</span>
                        </Button>
                        <Button onClick={() => save("final")} loading={saving} className="flex-1 sm:flex-none justify-center">
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Simpan & Final</span>
                            <span className="sm:hidden">Final</span>
                        </Button>
                        {isEdit && (
                            <Button variant="ghost" onClick={() => window.open(`/rab/${id}`, "_blank")} className="!px-2 sm:!px-3 shrink-0" title="Preview di tab baru">
                                <Eye className="w-4 h-4" />
                                <span className="hidden md:inline">Preview</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------- Subcomponents ----------
function Section({ title, children }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
            <h3 className="font-semibold text-slate-900 mb-3">{title}</h3>
            {children}
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-center justify-between py-1">
            <div className="text-slate-600">{label}</div>
            <div className="font-mono">{value}</div>
        </div>
    );
}

function ItemRow({ item, index, onChange, onRemove, canRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const jml = (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);

    return (
        <div ref={setNodeRef} style={style} className="border-t border-slate-200 bg-white">
            {/* === DESKTOP: grid table row === */}
            <div className="hidden md:grid grid-cols-[24px_24px_1fr_80px_60px_120px_120px_28px] gap-2 px-3 py-2 items-center">
                <button type="button" className="text-slate-400 hover:text-slate-600 cursor-grab" {...attributes} {...listeners}>
                    <GripVertical className="w-4 h-4" />
                </button>
                <div className="text-sm text-slate-500 font-mono">{index + 1}</div>
                <input
                    value={item.nama}
                    onChange={(e) => onChange({ nama: e.target.value })}
                    placeholder="Mis. Fitting Lampu Broco"
                    className="px-2 py-1 border border-slate-200 rounded text-sm focus:border-amber-400 focus:outline-none"
                />
                <select
                    value={item.satuan}
                    onChange={(e) => onChange({ satuan: e.target.value })}
                    className="px-2 py-1 border border-slate-200 rounded text-sm bg-white"
                >
                    {SATUAN_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                    type="number"
                    value={item.volume}
                    onChange={(e) => onChange({ volume: e.target.value })}
                    min="0" step="0.01"
                    className="px-2 py-1 border border-slate-200 rounded text-sm text-right"
                />
                <input
                    type="number"
                    value={item.hargaSatuan}
                    onChange={(e) => onChange({ hargaSatuan: e.target.value })}
                    min="0" step="1" placeholder="0"
                    className="px-2 py-1 border border-slate-200 rounded text-sm text-right font-mono"
                />
                <div className="text-right text-sm font-mono text-slate-700 px-1">
                    {formatRupiahPlain(jml)}
                </div>
                <button type="button" onClick={onRemove} disabled={!canRemove}
                    className="text-red-500 hover:bg-red-50 rounded p-1 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* === MOBILE: card layout === */}
            <div className="md:hidden p-3 space-y-2">
                {/* Top row: drag + nomor + delete */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button type="button" className="text-slate-400 cursor-grab touch-none p-1 -ml-1" {...attributes} {...listeners}>
                            <GripVertical className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono text-slate-500 font-semibold">Item #{index + 1}</span>
                    </div>
                    <button type="button" onClick={onRemove} disabled={!canRemove}
                        className="text-red-500 hover:bg-red-50 rounded p-1.5 disabled:opacity-30">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Nama */}
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Pekerjaan / Barang</label>
                    <input
                        value={item.nama}
                        onChange={(e) => onChange({ nama: e.target.value })}
                        placeholder="Mis. Fitting Lampu Broco"
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-amber-400 focus:outline-none"
                    />
                </div>

                {/* Satuan + Volume side-by-side */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Satuan</label>
                        <select
                            value={item.satuan}
                            onChange={(e) => onChange({ satuan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white"
                        >
                            {SATUAN_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Volume</label>
                        <input
                            type="number" inputMode="decimal"
                            value={item.volume}
                            onChange={(e) => onChange({ volume: e.target.value })}
                            min="0" step="0.01"
                            className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-right"
                        />
                    </div>
                </div>

                {/* Harga Satuan */}
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Harga Satuan (Rp)</label>
                    <input
                        type="number" inputMode="numeric"
                        value={item.hargaSatuan}
                        onChange={(e) => onChange({ hargaSatuan: e.target.value })}
                        min="0" step="1" placeholder="0"
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-right font-mono"
                    />
                </div>

                {/* Jumlah readonly */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Jumlah</span>
                    <span className="text-sm font-mono font-semibold text-amber-700">
                        {formatRupiah(jml)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function deriveKota(alamat = "") {
    // Ambil kota dari alamat — segmen terakhir setelah koma terakhir
    // "Desa Gading Watu RT.04 RW.04, Menganti - Gresik" → "Gresik"
    if (!alamat) return "";
    const lastSegment = alamat.split(",").pop()?.trim() || "";
    const afterDash = lastSegment.split(/[-–]/).pop()?.trim();
    return afterDash || lastSegment;
}