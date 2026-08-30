import { formatDate } from "./helpers";

export default function SignatureBlock({ ttd, instansi, judulForm }) {
  const tanggal = formatDate(ttd?.tanggal) || formatDate(new Date());
  const lokasi = (instansi?.alamat || "").split(",").pop()?.trim() || "";

  return (
    <>
      {judulForm && (
        <p style={{ marginTop: 16, textAlign: "justify", lineHeight: 1.6 }}>
          Demikian Berita Acara Pemeriksaan {judulForm} pada Instalasi Milik
          Pelanggan (IML) ini dibuat dengan sebenarnya untuk digunakan
          seperlunya.
        </p>
      )}

      <div style={{ marginTop: 24, paddingBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", minWidth: 280 }}>
          <div style={{ marginBottom: 4 }}>
            {lokasi && `${lokasi}, `}{tanggal}
          </div>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>
            {instansi?.nama ?? ""}
          </div>

          <div style={{ position: "relative", height: 90, marginBottom: 4 }}>
            {ttd?.signature?.url && (
              <img src={ttd.signature.url} alt="ttd"
                style={{
                  position: "absolute", left: "50%", top: 0,
                  transform: "translateX(-50%)",
                  maxHeight: 80, maxWidth: 160, objectFit: "contain",
                }} />
            )}
            {ttd?.stempel?.url && (
              <img src={ttd.stempel.url} alt="stempel"
                style={{
                  position: "absolute", left: "50%", top: -10,
                  transform: "translateX(-50%)",
                  maxHeight: 120, maxWidth: 110, objectFit: "contain", opacity: 0.85,
                }} />
            )}
          </div>

          <div style={{ borderTop: "1px solid #000", paddingTop: 4, paddingBottom: 8 }}>
            <div style={{ fontWeight: "bold", textDecoration: "underline" }}>
              {ttd?.nama || "(........................)"}
            </div>
            <div style={{ fontSize: "10pt" }}>{ttd?.jabatan || ""}</div>
          </div>
        </div>
      </div>
    </>
  );
}