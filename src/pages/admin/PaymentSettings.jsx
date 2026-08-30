import { useEffect, useState } from "react";
import { Plus, X, Save, Building2 } from "lucide-react";
import {
  AdminPageHeader, Button, Field, Input, TextArea, useToast,
} from "../../components/admin/AdminUI";
import { getPaymentSettings, savePaymentSettings } from "../../services/paymentService";

const EMPTY_BANK = { bankName: "", accountNumber: "", accountName: "" };

const EMPTY = {
  banks: [],
  whatsappNumber: "",
  instructions: "",
};

export default function PaymentSettings() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show, Toast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const d = await getPaymentSettings();
        if (d) setForm({ ...EMPTY, ...d, banks: d.banks || [] });
      } catch (err) {
        console.error(err);
        show("Gagal memuat data", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addBank = () => set("banks", [...form.banks, { ...EMPTY_BANK }]);
  const updateBank = (i, patch) => {
    set("banks", form.banks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const removeBank = (i) => {
    if (!confirm("Hapus bank ini?")) return;
    set("banks", form.banks.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!form.banks.length) return alert("Tambahkan minimal 1 rekening bank");
    setSaving(true);
    try {
      const cleanBanks = form.banks.filter(b =>
        b.bankName?.trim() && b.accountNumber?.trim() && b.accountName?.trim()
      );
      await savePaymentSettings({ ...form, banks: cleanBanks });
      show("Tersimpan");
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Toast />
      <AdminPageHeader
        title="Pengaturan Pembayaran"
        description="Rekening bank & nomor WhatsApp untuk konfirmasi pembayaran NIDI/SLO."
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> Simpan
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">
            Rekening Bank ({form.banks.length})
          </p>
          <Button variant="outline" onClick={addBank}>
            <Plus className="w-4 h-4" /> Tambah Bank
          </Button>
        </div>

        {!form.banks.length ? (
          <p className="text-sm text-slate-400 italic text-center py-8 border border-dashed border-slate-200 rounded-lg">
            Belum ada bank. Tambahkan minimal 1.
          </p>
        ) : (
          <div className="space-y-3">
            {form.banks.map((bank, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50 relative">
                <button type="button" onClick={() => removeBank(i)}
                  className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                  <Field label="Nama Bank">
                    <Input value={bank.bankName}
                      onChange={(e) => updateBank(i, { bankName: e.target.value })}
                      placeholder="BCA" />
                  </Field>
                  <Field label="No. Rekening">
                    <Input value={bank.accountNumber}
                      onChange={(e) => updateBank(i, { accountNumber: e.target.value })}
                      placeholder="790-2009992" />
                  </Field>
                  <Field label="Atas Nama">
                    <Input value={bank.accountName}
                      onChange={(e) => updateBank(i, { accountName: e.target.value })}
                      placeholder="ADYTIA PUTRA TEHNIK PT" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Konfirmasi Pembayaran</p>
        <Field label="Nomor WhatsApp Admin"
          hint="Format internasional tanpa +. Contoh: 6282228904486">
          <Input value={form.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value)}
            placeholder="6282228904486" />
        </Field>
        <Field label="Instruksi Pembayaran"
          hint="Akan ditampilkan di modal setelah submit. Pakai baris baru untuk poin terpisah.">
          <TextArea rows={4} value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder={"Transfer sesuai nominal\nUpload bukti pembayaran melalui WhatsApp\nProses verifikasi 1x24 jam"} />
        </Field>
      </div>
    </div>
  );
}