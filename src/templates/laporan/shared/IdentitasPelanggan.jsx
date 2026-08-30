const cellLabel = { padding: "2px 8px 2px 0", width: 140, verticalAlign: "top" };
const cellValue = { padding: "2px 0" };

export default function IdentitasPelanggan({ data }) {
  const rows = [
    ["Nama Pelanggan", data.nama],
    ["Alamat", data.alamat],
    ["Daya", data.daya],
    ["Tarif", data.tarif],
    ["IDPEL", data.idpel],
  ];
  return (
    <table style={{ marginBottom: 16, fontSize: 12 }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={cellLabel}>{label}</td>
            <td style={cellValue}>: {value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}