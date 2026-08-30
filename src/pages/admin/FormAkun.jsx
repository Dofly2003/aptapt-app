import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc
} from "firebase/firestore";
import { encryptText, decryptText } from "../../utils/cryptoUtil";

const EMPTY_FORM = {
  namaAkun: "",
  kategori: "NIDI",
  kota: "",
  username: "",
  password: "",
  keterangan: "",
  pjt: "TT",
};

function FormAkun({ editData, setEditData }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Saat edit: dekripsi password sebelum ditampilkan di form
  useEffect(() => {
    if (!editData) return;

    (async () => {
      const decrypted = await decryptText(editData.password || "");
      setForm({
        namaAkun:   editData.namaAkun   || "",
        kategori:   editData.kategori   || "NIDI",
        kota:       editData.kota       || "",
        username:   editData.username   || "",
        password:   decrypted,
        keterangan: editData.keterangan || "",
        pjt:        editData.pjt        || "TT",
      });
      setEditId(editData.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    })();
  }, [editData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setEditData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Enkripsi password sebelum disimpan ke Firestore
      const encryptedPassword = await encryptText(form.password);

      const payload = {
        ...form,
        password: encryptedPassword,
      };

      if (editId) {
        await updateDoc(doc(db, "akun_credentials", editId), payload);
        alert("Data berhasil diupdate");
      } else {
        await addDoc(collection(db, "akun_credentials"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        alert("Data berhasil disimpan");
      }

      resetForm();
    } catch (err) {
      console.error("[FormAkun] gagal simpan:", err);
      alert("Gagal menyimpan data. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="bg-white shadow-lg rounded-2xl p-6 md:p-8 max-w-4xl mx-auto">

        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            {editId ? "Edit Akun" : "Tambah Akun"}
          </h2>
          <p className="text-sm text-gray-500">Kelola akun NIDI / SLO</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="text-sm text-gray-600">Nama Akun</label>
              <input
                name="namaAkun" value={form.namaAkun} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Kategori</label>
              <select
                name="kategori" value={form.kategori} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              >
                <option value="NIDI">NIDI</option>
                <option value="SLO">SLO</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Jabatan</label>
              <select
                name="pjt" value={form.pjt} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              >
                <option value="TT">TT</option>
                <option value="PJT">PJT</option>
                <option value="GM">GM</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Kota</label>
              <input
                name="kota" value={form.kota} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Username</label>
              <input
                name="username" value={form.username} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                name="password" type="password"
                value={form.password} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Keterangan</label>
              <input
                name="keterangan" value={form.keterangan} onChange={handleChange}
                className="mt-1 border rounded-lg p-2 w-full"
              />
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button" onClick={resetForm}
              className="px-4 py-2 border rounded-lg"
            >
              Reset
            </button>
            <button
              type="submit" disabled={saving}
              className={`px-5 py-2 text-white rounded-lg disabled:opacity-60 ${
                editId ? "bg-yellow-500" : "bg-blue-600"
              }`}
            >
              {saving ? "Menyimpan..." : editId ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormAkun;
