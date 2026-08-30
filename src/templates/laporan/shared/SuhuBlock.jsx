import { getField, getPhotos } from "./helpers";

/**
 * Render section suhu.
 * Foto dibaca per-fase dari key photos[partKey][`${eqKey}.${groupKey}.${phase}`].
 * photosPerPhase: jumlah foto per fase (1 atau 2).
 */
export default function SuhuBlock({
  title,
  partKey, eqKey, groupKey,
  form, photos,
  phases = ["R", "S", "T"],
  unit = "°C",
  photosPerPhase = 2,
}) {
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse", border: "1px solid black",
      marginBottom: 12, fontSize: "11pt", pageBreakInside: "avoid",
    }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{
            border: "1px solid black", width: "20%", padding: 6,
            fontWeight: "bold", fontStyle: "italic",
          }}>
            {title}
          </td>
          <td style={{
            border: "1px solid black", padding: 6, textAlign: "center",
            fontWeight: "bold", fontStyle: "italic",
          }} colSpan={photosPerPhase === 2 ? 3 : 2}>
            Dokumentasi Hasil Pemeriksaan
          </td>
        </tr>
      </thead>
      <tbody>
        {phases.map((phase) => {
          const value = getField(form, `${partKey}.${eqKey}.${groupKey}.${phase}`);
          const phasePhotos = getPhotos(photos, partKey, `${eqKey}.${groupKey}.${phase}`);
          const photo1 = phasePhotos[0];
          const photo2 = photosPerPhase === 2 ? phasePhotos[1] : null;
          const phaseLabel = phase === "N" ? "Netral" : `Phasa ${phase}`;

          return (
            <tr key={phase}>
              <td style={{
                border: "1px solid black", padding: 8, verticalAlign: "middle",
                width: "20%",
              }}>
                ➤ {phaseLabel}
              </td>
              <td style={{
                border: "1px solid black", padding: 8, textAlign: "center",
                width: photosPerPhase === 2 ? "33%" : "45%", verticalAlign: "middle",
              }}>
                {photo1 ? (
                  <img src={photo1} alt={`suhu ${phase}`}
                    style={{ maxHeight: 110, maxWidth: 160, objectFit: "contain" }} />
                ) : (
                  <span style={{ color: "#999", fontSize: "9pt", fontStyle: "italic" }}>
                    (tidak ada foto)
                  </span>
                )}
              </td>
              {photosPerPhase === 2 && (
                <td style={{
                  border: "1px solid black", padding: 8, textAlign: "center",
                  width: "33%", verticalAlign: "middle",
                }}>
                  {photo2 ? (
                    <img src={photo2} alt={`nilai ${phase}`}
                      style={{ maxHeight: 110, maxWidth: 160, objectFit: "contain" }} />
                  ) : (
                    <span style={{ color: "#999", fontSize: "9pt", fontStyle: "italic" }}>
                      (tidak ada foto)
                    </span>
                  )}
                </td>
              )}
              <td style={{
                border: "1px solid black", padding: 8, textAlign: "center",
                verticalAlign: "middle",
              }}>
                {value && value !== "-" ? `${value} ${unit}` : "-"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
