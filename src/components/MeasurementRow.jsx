import { useState, useRef } from "react";
import { Camera, X, Download, ClipboardPaste, Sparkles, Loader2, RotateCw } from "lucide-react";
import PhotoLightbox, { downloadPhoto } from "./PhotoLightbox";
import CameraButton from "./CameraButton";
import { scanMeasurement } from "../services/geminiService";

async function readImageFromClipboard() {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find(t => t.startsWith("image/"));
    if (imageType) {
      const blob = await item.getType(imageType);
      return new File([blob], `paste_${Date.now()}.png`, { type: imageType });
    }
  }
  return null;
}

export default function MeasurementRow({
  label,
  value,
  onChange,
  photos = [],
  photoLabels = [],
  maxPhotos = 2,
  fieldKey,
  onAddPhoto,
  onAddPhotoAt,
  onRemovePhoto,
  onClearSlotPhoto,
  onSwapPhotos,
  onMovePhotoCross,
  onRotatePhoto,
  disablePaste = false,
}) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [pastingSlot, setPastingSlot] = useState(null);
  const [pasteError, setPasteError] = useState(null);
  const [dragSlot, setDragSlot] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewY, setPreviewY] = useState(100);
  const [scanning, setScanning] = useState(false);
  const [confirmIdx, setConfirmIdx] = useState(null);
  const [rotatingSlot, setRotatingSlot] = useState(null);
  const inputRef = useRef(null);

  const handleRotate = async (i) => {
    if (!onRotatePhoto || rotatingSlot !== null) return;
    setRotatingSlot(i);
    try { await onRotatePhoto(i); } finally { setRotatingSlot(null); }
  };

  const handleRemove = (i) => {
    if (onClearSlotPhoto) onClearSlotPhoto(i);
    else onRemovePhoto(i);
    setConfirmIdx(null);
  };

  const filled = photos.filter(Boolean).length;
  const isComplete = filled >= maxPhotos;
  const filledPhotos = photos.filter(Boolean);
  const hasPhotos = filledPhotos.length > 0;

  const showPasteError = (msg) => {
    setPasteError(msg);
    setTimeout(() => setPasteError(null), 3000);
  };

  const handlePaste = async (slotIndex) => {
    if (pastingSlot !== null) return;
    if (!navigator.clipboard?.read) {
      showPasteError("Browser tidak mendukung paste clipboard");
      return;
    }
    try {
      setPastingSlot(slotIndex);
      const file = await readImageFromClipboard();
      if (!file) {
        showPasteError("Tidak ada gambar di clipboard");
        return;
      }
      const e = { target: { files: [file] } };
      if (onAddPhotoAt) onAddPhotoAt(slotIndex, e);
      else onAddPhoto(e);
    } catch (err) {
      console.error("Clipboard paste:", err);
      const msg = err.name === "NotAllowedError"
        ? "Izin clipboard ditolak — klik 'Izinkan' pada prompt browser"
        : `Gagal paste: ${err.message}`;
      showPasteError(msg);
    } finally {
      setPastingSlot(null);
    }
  };

  const measurementPhoto = (() => {
    for (let i = 0; i < maxPhotos; i++) {
      const lbl = photoLabels[i] ?? "";
      if (!/jauh/i.test(lbl) && photos[i]) return photos[i];
    }
    return null;
  })();

  const handleScanAI = async () => {
    if (scanning || !measurementPhoto) return;
    setScanning(true);
    try {
      const val = await scanMeasurement(measurementPhoto, label);
      if (val !== null && val !== undefined) onChange(String(val));
    } catch (e) {
      console.error("Scan AI error:", e);
    } finally {
      setScanning(false);
    }
  };

  const handleInputFocus = () => {
    if (!hasPhotos) return;
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      const panelH = maxPhotos * 160 + 32;
      const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - panelH - 8));
      setPreviewY(top);
    }
    setShowPreview(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowPreview(false), 200);
  };

  return (
    <div className={`rounded-xl border p-2 transition ${
      isComplete ? "border-green-200 bg-green-50/40" : "border-gray-100 bg-white"
    }`}>
      <div className="flex items-start gap-2">

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-0.5 truncate">{label}</p>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="-"
              className={`w-full px-2 py-1.5 text-sm rounded-lg border bg-gray-50
                         focus:bg-white focus:ring-1 outline-none transition
                         ${measurementPhoto ? "pr-7" : ""}
                         ${showPreview && hasPhotos
                           ? "border-blue-400 ring-1 ring-blue-100"
                           : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                         }`}
            />
            {measurementPhoto && (
              <button
                type="button"
                onClick={handleScanAI}
                disabled={scanning}
                title="Baca nilai dari foto (AI)"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center
                           rounded text-purple-400 hover:text-purple-600 hover:bg-purple-50
                           disabled:opacity-40 transition"
              >
                {scanning
                  ? <Loader2 size={11} className="animate-spin" />
                  : <Sparkles size={11} />
                }
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-shrink-0 pt-4">
          {Array.from({ length: maxPhotos }).map((_, i) => {
            const photo = photos[i];
            const lbl   = photoLabels[i] ?? `Foto ${i + 1}`;
            const isDropTarget = dropTarget === i && dragSlot !== i;

            const slotDragHandlers = {
              onDragOver: e => {
                if (e.dataTransfer.types.includes("application/x-photo") || dragSlot !== null) {
                  e.preventDefault();
                  if (dragSlot !== i) setDropTarget(i);
                }
              },
              onDragLeave: () => setDropTarget(null),
              onDrop: e => {
                e.preventDefault();
                try {
                  const raw = e.dataTransfer.getData("application/x-photo");
                  if (raw) {
                    const src = JSON.parse(raw);
                    if (src.fieldKey === fieldKey) {
                      if (src.slotIdx !== i) onSwapPhotos?.(src.slotIdx, i);
                    } else {
                      onMovePhotoCross?.(src.fieldKey, src.slotIdx, i);
                    }
                  }
                } catch {}
                setDragSlot(null);
                setDropTarget(null);
              },
            };

            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                {photo ? (
                  <>
                    <div
                      className={`relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing transition-all
                        ${isDropTarget ? "ring-2 ring-amber-400 scale-105" : ""}`}
                      draggable
                      onDragStart={e => {
                        setDragSlot(i);
                        e.dataTransfer.setData("application/x-photo", JSON.stringify({ fieldKey, slotIdx: i }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => { setDragSlot(null); setDropTarget(null); }}
                      {...slotDragHandlers}
                      onClick={() => setLightboxIdx(i)}
                    >
                      <img
                        src={photo}
                        alt={lbl}
                        className="w-full h-full object-cover"
                        style={rotatingSlot === i ? { opacity: 0.4 } : undefined}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      {/* Rotate button — top-left on hover */}
                      {onRotatePhoto && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleRotate(i); }}
                          onMouseDown={e => e.stopPropagation()}
                          disabled={rotatingSlot !== null}
                          title="Putar 90°"
                          className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition
                                     bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center
                                     disabled:opacity-40"
                        >
                          {rotatingSlot === i
                            ? <Loader2 size={8} className="animate-spin" />
                            : <RotateCw size={8} />
                          }
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadPhoto(photo, `${lbl}.jpg`); }}
                        onMouseDown={e => e.stopPropagation()}
                        className="absolute bottom-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition
                                   bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center"
                        title="Unduh"
                      >
                        <Download size={8} />
                      </button>
                      {confirmIdx === i ? (
                        <div
                          className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1 rounded-lg"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <p className="text-white text-[8px] font-semibold leading-tight text-center px-0.5">Hapus?</p>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setConfirmIdx(null); }}
                              onMouseDown={e => e.stopPropagation()}
                              className="px-1.5 py-0.5 bg-white/20 text-white text-[8px] rounded active:bg-white/30 transition"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); handleRemove(i); }}
                              onMouseDown={e => e.stopPropagation()}
                              className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-semibold rounded active:bg-red-600 transition"
                            >
                              Ya
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmIdx(i); }}
                          onMouseDown={e => e.stopPropagation()}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full
                                     w-4 h-4 flex items-center justify-center active:scale-90 transition"
                        >
                          <X size={9} />
                        </button>
                      )}
                    </div>
                    <span className="text-[8px] text-green-600 text-center leading-tight w-14 truncate">
                      ✓ {lbl}
                    </span>
                  </>
                ) : (
                  <>
                    <div
                      className={`flex gap-0.5 rounded-lg transition-all ${isDropTarget ? "ring-2 ring-amber-400 scale-105" : ""}`}
                      {...slotDragHandlers}
                    >
                      <CameraButton
                        onChange={e => onAddPhotoAt ? onAddPhotoAt(i, e) : onAddPhoto(e)}
                        className={`h-14 border-2 border-dashed
                                   flex flex-col items-center justify-center text-gray-400
                                   cursor-pointer active:bg-gray-50 transition
                                   ${isDropTarget ? "border-amber-400 bg-amber-50" : "border-gray-300"}
                                   ${disablePaste ? "w-14 rounded-lg" : "w-10 rounded-l-lg"}`}
                      >
                        <Camera size={13} />
                      </CameraButton>
                      {!disablePaste && (
                        <button
                          type="button"
                          onClick={() => handlePaste(i)}
                          disabled={pastingSlot !== null}
                          title="Paste dari clipboard"
                          className="w-4 h-14 rounded-r-lg border-2 border-dashed border-blue-200
                                     flex items-center justify-center text-blue-300
                                     cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {pastingSlot === i
                            ? <span className="animate-pulse text-[6px]">…</span>
                            : <ClipboardPaste size={9} />
                          }
                        </button>
                      )}
                    </div>
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

      {pasteError && (
        <p className="text-[9px] text-red-500 mt-1 px-1">{pasteError}</p>
      )}

      {/* Floating photo preview — only "Foto Hasil Pengukuran" (non-Jauh slots) */}
      {showPreview && hasPhotos && (() => {
        const slots = Array.from({ length: maxPhotos })
          .map((_, i) => ({ photo: photos[i], lbl: photoLabels[i] ?? `Foto ${i + 1}`, i }))
          .filter(s => !/jauh/i.test(s.lbl));
        const visible = slots.filter(s => s.photo);
        if (!visible.length) return null;
        return (
          <div
            style={{ position: "fixed", top: previewY, right: 24, zIndex: 9999 }}
            className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-3 flex flex-col gap-2 pointer-events-none"
          >
            <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide px-0.5">
              {label}
            </p>
            <div className="flex gap-3">
              {visible.map(({ photo, lbl, i }) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <img
                    src={photo}
                    alt={lbl}
                    className="w-[312px] h-[312px] object-cover rounded-xl shadow-sm"
                  />
                  <span className="text-[9px] text-gray-500">{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
