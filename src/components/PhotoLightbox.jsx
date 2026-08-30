import { useEffect } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

async function downloadPhoto(url, filename = "foto.jpg") {
  if (url.startsWith("blob:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    return;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export { downloadPhoto };

export default function PhotoLightbox({ photos, index, onClose, onNav }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onNav(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, photos.length, onClose, onNav]);

  const src = photos[index];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {photos.length > 1 && (
        <div className="absolute top-4 left-4 text-white/60 text-sm select-none">
          {index + 1} / {photos.length}
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); downloadPhoto(src, `foto-${index + 1}.jpg`); }}
          className="bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition"
          title="Unduh foto"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition"
          title="Tutup"
        >
          <X size={18} />
        </button>
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
          className="absolute left-3 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
      />

      {index < photos.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
          className="absolute right-3 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
