import { useState } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ReactSelect from "react-select";
import {
  AdminPageHeader,
  Button,
  Input,
  TextArea,
  Select,
  Field,
  useToast
} from "../../components/admin/AdminUI";

function DataEntry() {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { show, Toast } = useToast();

  const dayaOptions = [
    {
      label: "PASKABAYAR LR",
      options: [
        "450", "900", "1300", "2200", "3500", "4400", "5500", "6600", "7700",
        "10600", "11000", "13200", "13900", "15400", "16500", "17600",
        "22000", "23000", "27800", "33000", "35200", "41500", "44000",
        "53000", "66000", "82500", "105000", "131000", "145500", "147000",
        "164000", "197000", "210000", "233000", "240000", "279000", "329000",
        "345000", "414000", "415000", "526000", "555000", "630000", "690000",
        "865000", "1110000", "1385000", "1455000", "1660000", "1730000",
        "2180000", "2770000", "3465000", "4330000", "4670000", "5540000",
        "6930000", "8660000", "10380000"
      ].map(v => ({ value: `PASKABAYAR ${v} `, label: `PASKABAYAR ${v} ` }))
    },
    {
      label: "PASKABAYAR R",
      options: [
        "450", "900", "1300", "2200", "3500", "4400", "5500", "6600", "7700",
        "10600", "11000", "13200", "13900", "15400", "16500", "17600",
        "22000", "23000", "27800", "33000", "35200", "41500", "44000",
        "53000", "66000", "82500", "105000", "131000", "145500", "147000",
        "164000", "197000", "233000", "240000", "279000", "329000",
        "345000", "414000", "415000", "526000", "555000", "630000",
        "690000", "865000", "1110000", "1385000", "1455000", "1660000",
        "1730000", "2180000", "2770000", "3465000", "4330000", "4670000",
        "5540000", "6930000", "8660000", "10380000"
      ].map(v => ({ value: `PASKABAYAR ${v} `, label: `PASKABAYAR ${v} ` }))
    },
    {
      label: "PRABAYAR",
      options: [
        "450", "900", "1300", "2200", "3500", "4400", "5500", "6600", "7700",
        "10600", "11000", "13200", "13900", "15400", "16500", "17600",
        "22000", "23000", "27800", "33000", "41500"
      ].map(v => ({ value: `PRABAYAR ${v}`, label: `PRABAYAR ${v}` }))
    },
    {
      label: "LAINNYA",
      options: [{ value: "LAINNYA", label: "Lainnya" }]
    }
  ];

  const emptyForm = {
    nama: "",
    nik: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    desa: "",
    alamat: "",
    kodePos: "",
    latitude: "",
    longitude: "",
    peruntukan: "",
    keperluan: "",
    daya: ""
  };

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =========================
     GOOGLE GEOCODING
  ========================= */

  const getCoordinates = async () => {
    if (!form.alamat) {
      show("Isi alamat terlebih dahulu.", "error");
      return;
    }

    const fullAddress = [form.alamat, form.desa, form.kecamatan, "Indonesia"].join(", ");

    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&language=id&key=${API_KEY}`
      );
      const data = await res.json();

      if (data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        let kota = "";
        let provinsi = "";
        let kodePos = "";

        result.address_components.forEach((c) => {
          if (c.types.includes("administrative_area_level_2")) kota = c.long_name;
          if (c.types.includes("administrative_area_level_1")) provinsi = c.long_name;
          if (c.types.includes("postal_code")) kodePos = c.long_name;
        });

        kota = kota.replace("Kabupaten ", "").replace("Kota ", "");

        setForm(prev => ({
          ...prev,
          latitude: location.lat,
          longitude: location.lng,
          kota: kota || prev.kota,
          provinsi: provinsi || prev.provinsi,
          kodePos: kodePos || prev.kodePos
        }));
        show("Koordinat berhasil diperoleh dari Google Maps.");
      } else {
        show("Alamat tidak ditemukan. Coba perincikan alamat Anda.", "error");
      }
    } catch (err) {
      console.error(err);
      show("Gagal mengambil koordinat. Periksa koneksi internet Anda.", "error");
    } finally {
      setGeocoding(false);
    }
  };

  /* =========================
     GPS DEVICE
  ========================= */

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      show("Browser tidak mendukung GPS.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        show("Koordinat GPS berhasil diambil.");
      },
      (err) => {
        console.error(err);
        show("Gagal mengambil lokasi GPS. Pastikan izin lokasi diberikan.", "error");
      }
    );
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, "nidi_data"), {
        ...form,
        status: "pending",
        createdAt: serverTimestamp()
      });

      show("Data NIDI/SLO berhasil disimpan.");
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      show("Gagal menyimpan data. Silakan coba lagi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     COPY HELPER  (dipakai saat diperlukan di tempat lain — tanpa referensi user)
  ========================= */

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      show("Teks berhasil disalin.");
    } catch (err) {
      console.error(err);
      show("Gagal menyalin teks.", "error");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Toast />

      <div className="bg-white shadow-xl rounded-2xl p-6 max-w-5xl mx-auto">
        <AdminPageHeader
          title="Data Entry NIDI / SLO"
          description="Formulir pendaftaran instalasi baru"
        />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* IDENTITAS */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-3 border-b pb-1">Identitas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nama Perseorangan" required>
                <Input
                  name="nama"
                  placeholder="Nama lengkap sesuai KTP"
                  value={form.nama}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Nomor Identitas (NIK)" required>
                <Input
                  name="nik"
                  placeholder="16 digit NIK"
                  value={form.nik}
                  onChange={handleChange}
                  required
                />
              </Field>
            </div>
          </section>

          {/* LOKASI */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-3 border-b pb-1">Lokasi</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Provinsi">
                <Input
                  name="provinsi"
                  value={form.provinsi}
                  placeholder="Diisi otomatis dari Google Maps"
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
              </Field>
              <Field label="Kabupaten / Kota">
                <Input
                  name="kota"
                  value={form.kota}
                  placeholder="Diisi otomatis dari Google Maps"
                  readOnly
                  className="bg-slate-50 cursor-not-allowed"
                />
              </Field>
              <Field label="Kecamatan" required>
                <Input
                  name="kecamatan"
                  placeholder="Nama kecamatan"
                  value={form.kecamatan}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Desa / Kelurahan" required>
                <Input
                  name="desa"
                  placeholder="Nama desa atau kelurahan"
                  value={form.desa}
                  onChange={handleChange}
                  required
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Alamat Instalasi" required>
                  <TextArea
                    name="alamat"
                    placeholder="Alamat lengkap lokasi instalasi"
                    value={form.alamat}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="secondary"
                loading={geocoding}
                onClick={getCoordinates}
              >
                Ambil dari Google Maps
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
              >
                Gunakan GPS Perangkat
              </Button>
            </div>
          </section>

          {/* KOORDINAT */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-3 border-b pb-1">Koordinat</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Latitude">
                <Input
                  value={form.latitude}
                  readOnly
                  placeholder="Diisi otomatis"
                  className="bg-slate-50 cursor-not-allowed"
                />
              </Field>
              <Field label="Longitude">
                <Input
                  value={form.longitude}
                  readOnly
                  placeholder="Diisi otomatis"
                  className="bg-slate-50 cursor-not-allowed"
                />
              </Field>
              <Field label="Kode Pos">
                <Input
                  name="kodePos"
                  value={form.kodePos}
                  onChange={handleChange}
                  placeholder="Kode pos"
                />
              </Field>
            </div>
          </section>

          {/* INSTALASI */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-3 border-b pb-1">Data Instalasi</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Peruntukan" required>
                <Select
                  name="peruntukan"
                  value={form.peruntukan}
                  onChange={handleChange}
                  required
                >
                  <option value="">Pilih peruntukan...</option>
                  <option value="Rumah Tangga">Rumah Tangga</option>
                  <option value="Bisnis">Bisnis</option>
                  <option value="Industri">Industri</option>
                </Select>
              </Field>

              <Field label="Keperluan">
                <Input
                  name="keperluan"
                  placeholder="Keterangan keperluan"
                  value={form.keperluan}
                  onChange={handleChange}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Daya" required>
                  <ReactSelect
                    options={dayaOptions}
                    placeholder="Cari atau pilih daya..."
                    value={
                      form.daya
                        ? dayaOptions.flatMap(g => g.options).find(opt => opt.value === form.daya)
                        : null
                    }
                    onChange={(selected) =>
                      setForm({ ...form, daya: selected?.value || "" })
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#cbd5e1",
                        borderRadius: "0.5rem",
                        minHeight: "42px",
                        fontSize: "0.875rem"
                      })
                    }}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* SUBMIT */}
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" loading={submitting}>
              Simpan Data
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default DataEntry;
