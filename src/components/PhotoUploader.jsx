import { useState } from "react";
import { Camera, X, Download } from "lucide-react";
import PhotoLightbox, { downloadPhoto } from "./PhotoLightbox";
import CameraButton from "./CameraButton";

export default function PhotoUploader({
  photos = [],
  onAdd,
  onRemove,
  minPhotos = 1,
  photoLabels = [],
}) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const isComplete = photos.length >= minPhotos;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">
          Foto · {photos.length}/{minPhotos} min
        </span>
        {!isComplete && (
          <span className="text-[10px] text-red-500 font-medium">wajib</span>
        )}
      </div>

      {photoLabels.length > 0 && (
        <div className="mb-2 bg-gray-50 rounded-lg p-2 space-y-1">
          {photoLabels.map((lbl, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span
                className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold
                  ${photos[i] ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"}`}
              >
                {photos[i] ? "✓" : i + 1}
              </span>
              <span className={photos[i] ? "text-green-600" : ""}>{lbl}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
            onClick={() => setLightboxIdx(i)}
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); downloadPhoto(src, `foto-${i + 1}.jpg`); }}
              className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition
                         bg-black/60 text-white rounded-full p-0.5"
              title="Unduh"
            >
              <Download size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5
                         active:scale-90 transition"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <CameraButton
          onChange={onAdd}
          className="aspect-square rounded-lg border-2 border-dashed border-gray-300
                     flex flex-col items-center justify-center text-gray-400
                     cursor-pointer active:bg-gray-50 transition"
        >
          <Camera size={20} />
          <span className="text-[10px] mt-1">Tambah</span>
        </CameraButton>
      </div>

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}
    </div>
  );
}
