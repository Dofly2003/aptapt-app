import { useState } from "react";
import { Camera, X, Download } from "lucide-react";
import PhotoLightbox, { downloadPhoto } from "./PhotoLightbox";
import CameraButton from "./CameraButton";

export default function MeasurementRow({
  label,
  value,
  onChange,
  photos = [],
  photoLabels = [],
  maxPhotos = 2,
  onAddPhoto,
  onRemovePhoto,
}) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const filled = photos.filter(Boolean).length;
  const isComplete = filled >= maxPhotos;

  const filledPhotos = photos.filter(Boolean);

  return (
    <div className={`rounded-xl border p-2 transition ${
      isComplete ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-white"
    }`}>
      <div className="flex items-start gap-2">

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-0.5 truncate">{label}</p>
          <input
            type="text"
            inputMode="decimal"
            value={value ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder="-"
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50
                       focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100
                       outline-none transition"
          />
        </div>

        <div className="flex gap-1.5 flex-shrink-0 pt-4">
          {Array.from({ length: maxPhotos }).map((_, i) => {
            const photo = photos[i];
            const lbl   = photoLabels[i] ?? `Foto ${i + 1}`;

            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                {photo ? (
                  <>
                    <div
                      className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                      onClick={() => setLightboxIdx(i)}
                    >
                      <img src={photo} alt={lbl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(photo, `${lbl}.jpg`); }}
                        className="absolute bottom-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition
                                   bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
                        title="Unduh"
                      >
                        <Download size={8} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemovePhoto(i); }}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full
                                   w-4 h-4 flex items-center justify-center active:scale-90 transition"
                      >
                        <X size={9} />
                      </button>
                    </div>
                    <span className="text-[8px] text-green-600 text-center leading-tight w-14 truncate">
                      ✓ {lbl}
                    </span>
                  </>
                ) : (
                  <>
                    <CameraButton
                      onChange={onAddPhoto}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300
                                 flex flex-col items-center justify-center text-gray-400
                                 cursor-pointer active:bg-gray-50 transition"
                    >
                      <Camera size={16} />
                    </CameraButton>
                    <span className="text-[8px] text-gray-400 text-center leading-tight w-14 truncate">
                      {lbl}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {lightboxIdx !== null && filledPhotos.length > 0 && (
        <PhotoLightbox
          photos={filledPhotos}
          index={Math.min(lightboxIdx, filledPhotos.length - 1)}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}
    </div>
  );
}
