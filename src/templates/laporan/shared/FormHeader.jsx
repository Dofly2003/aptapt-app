import { formatDate } from "./helpers";

const HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const BULAN = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

export default function FormHeader({ data, instansi, judulForm }) {
  const tanggalCetak = new Date();
  const hari = HARI[tanggalCetak.getDay()];
  const tgl = tanggalCetak.getDate();
  const bulan = BULAN[tanggalCetak.getMonth()];
  const tahun = tanggalCetak.getFullYear();

  const namaInstansi = instansi?.nama ?? "—";

  return (
    <>
      {/* Judul BA dalam box */}
      <div style={{
        border: "1px solid black", padding: "8px 12px",
        textAlign: "center", fontWeight: "bold", fontSize: "11.5pt",
        margin: "8px 0 12px",
      }}>
        BERITA ACARA PEMERIKSAAN {judulForm} PADA INSTALASI MILIK PELANGGAN (IML)
      </div>

      {/* Paragraf pembuka */}
      <p style={{ textAlign: "justify", margin: "0 0 12px", lineHeight: 1.6 }}>
        Pada hari ini <b>{hari}</b>, tanggal <b>{tgl}</b>, bulan{" "}
        <b>{bulan}</b>, tahun <b>{tahun}</b>, telah melaksanakan pemeriksaan{" "}
        {judulForm} pada Instalasi Milik Pelanggan (IML) oleh petugas{" "}
        <b>{namaInstansi}</b> di lokasi sebagai berikut:
      </p>

      {/* Identitas pelanggan */}
      <table style={{ marginBottom: 16, fontSize: "11pt", marginLeft: 24 }}>
        <tbody>
          {[
            ["Nama Pelanggan", data.nama],
            ["Alamat", data.alamat],
            ["Daya", data.daya],
            ["Tarif", data.tarif],
            ["IDPEL", data.idpel],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: "2px 16px 2px 0", width: 140, verticalAlign: "top" }}>
                {label}
              </td>
              <td style={{ padding: "2px 0", verticalAlign: "top" }}>
                : <b>{value || "-"}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Heading section */}
      <h3 style={{
        textAlign: "center", margin: "8px 0 10px",
        fontSize: "11.5pt", fontWeight: "bold",
      }}>
        PEMERIKSAAN {judulForm}
      </h3>
    </>
  );
}