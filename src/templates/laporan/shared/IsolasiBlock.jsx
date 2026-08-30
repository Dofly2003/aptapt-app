import { getField, getPhotos } from "./helpers";

/**
 * Renders a tahanan isolasi section for the PDF report.
 * Each measurement field gets its own 2 photos: Foto Pengukuran + Foto Nilai.
 * Photo key format: photos["part1"]["phb_tm.isolasi_cubicle_incoming.rGnd"]
 */
export default function IsolasiBlock({ title, partKey, eqKey, groupKey, fields, form, photos, valueLabel = "Nilai (MΩ)" }) {
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse", border: "1px solid black",
      marginBottom: 12, fontSize: "10pt", pageBreakInside: "avoid",
    }}>
      <thead>
        <tr style={{ background: "#fef3c7" }}>
          <td style={{
            border: "1px solid black", padding: 6, fontWeight: "bold",
            fontStyle: "italic", width: "22%",
          }}>
            {title}
          </td>
          <td style={{
            border: "1px solid black", padding: 6, textAlign: "center",
            fontWeight: "bold", fontStyle: "italic", width: "14%",
          }}>
            {valueLabel}
          </td>
          <td style={{
            border: "1px solid black", padding: 6, textAlign: "center",
            fontWeight: "bold", fontStyle: "italic", width: "32%",
          }}>
            Foto Pengukuran
          </td>
          <td style={{
            border: "1px solid black", padding: 6, textAlign: "center",
            fontWeight: "bold", fontStyle: "italic", width: "32%",
          }}>
            Foto Nilai
          </td>
        </tr>
      </thead>
      <tbody>
        {fields.map(f => {
          const path      = `${partKey}.${eqKey}.${groupKey}.${f.name}`;
          const photoKey  = `${eqKey}.${groupKey}.${f.name}`;
          const value     = getField(form, path);
          const fieldPhotos = getPhotos(photos, partKey, photoKey);
          const foto1     = fieldPhotos[0];
          const foto2     = fieldPhotos[1];

          return (
            <tr key={f.name}>
              <td style={{
                border: "1px solid black", padding: 6, verticalAlign: "middle",
              }}>
                ➤ {f.label.replace(" (MΩ)", "")}
              </td>
              <td style={{
                border: "1px solid black", padding: 6, textAlign: "center",
                verticalAlign: "middle", fontWeight: "bold",
              }}>
                {value}
              </td>
              <td style={{
                border: "1px solid black", padding: 6, textAlign: "center",
                verticalAlign: "middle",
              }}>
                {foto1 ? (
                  <img src={foto1} alt={`${f.label} pengukuran`}
                    style={{ maxHeight: 100, maxWidth: 150, objectFit: "contain" }} />
                ) : (
                  <span style={{ color: "#999", fontSize: "9pt", fontStyle: "italic" }}>
                    (tidak ada foto)
                  </span>
                )}
              </td>
              <td style={{
                border: "1px solid black", padding: 6, textAlign: "center",
                verticalAlign: "middle",
              }}>
                {foto2 ? (
                  <img src={foto2} alt={`${f.label} nilai`}
                    style={{ maxHeight: 100, maxWidth: 150, objectFit: "contain" }} />
                ) : (
                  <span style={{ color: "#999", fontSize: "9pt", fontStyle: "italic" }}>
                    (tidak ada foto)
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
