import PhotoGrid from "./PhotoGrid";

export default function SectionBlock({ title, photos = [], specs = [], photoOnly = false }) {
  // Mode photo-only: tabel cuma 1 baris (judul + foto), tidak ada baris spec
  if (photoOnly) {
    return (
      <table style={{
        width: "100%", borderCollapse: "collapse", border: "1px solid black",
        marginBottom: 12, fontSize: "11pt", pageBreakInside: "avoid",
      }}>
        <tbody>
          <tr>
            <td style={{
              border: "1px solid black", width: "25%", padding: 8,
              fontWeight: "bold", verticalAlign: "top",
            }}>
              ➤ {title}
            </td>
            <td style={{ border: "1px solid black", padding: 8 }}>
              <PhotoGrid photos={photos} />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  // Mode default (spec + foto)
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse", border: "1px solid black",
      marginBottom: 12, fontSize: "11pt", pageBreakInside: "avoid",
    }}>
      <tbody>
        <tr>
          <td style={{
            border: "1px solid black", width: "25%", padding: 8,
            fontWeight: "bold", verticalAlign: "top",
          }}>
            ➤ {title}
          </td>
          <td style={{ border: "1px solid black", padding: 8 }}>
            <PhotoGrid photos={photos} />
          </td>
        </tr>
        {specs.map(([label, value], i) => (
          <tr key={i}>
            <td style={{ border: "1px solid black", padding: "4px 8px", width: "30%" }}>
              {label}
            </td>
            <td style={{ border: "1px solid black", padding: "4px 8px" }}>
              : {value || "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}