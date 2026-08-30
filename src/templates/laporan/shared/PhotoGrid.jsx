export default function PhotoGrid({ photos = [], emptyText = "Tidak ada foto" }) {
  if (!photos.length) {
    return <span style={{ color: "#999", fontStyle: "italic", fontSize: "10pt" }}>{emptyText}</span>;
  }
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: photos.length === 1 ? "1fr" : "1fr 1fr",
      gap: 6,
      justifyItems: "center",
    }}>
      {photos.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          style={{
            width: "100%",
            maxWidth: 170,
            height: 120,
            objectFit: "contain",
            border: "1px solid #ddd",
          }}
        />
      ))}
    </div>
  );
}