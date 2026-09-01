import { useState } from "react";
import { Camera, X, Download, ClipboardPaste } from "lucide-react";
import PhotoLightbox, { downloadPhoto } from "./PhotoLightbox";
import CameraButton from "./CameraButton";

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

export default function PhotoUploader({
  photos = [],
  onAdd,
  onAddAt,      // (slotIndex, event) — untuk labeled-slot mode
  onRemove,
  onClearSlot,  // (slotIndex) — clear slot tanpa shift di labeled-slot mode
  minPhotos = 1,
  photoLabels = [],
  disablePaste = false,
}) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [pasting, setPasting]         = useState(false);
  const [pastingSlot, setPastingSlot] = useState(null);
  const [pasteError, setPasteError]   = useState(null);
  const [confirmIdx, setConfirmIdx]   = useState(null);

  const showPasteError = (msg) => {
    setPasteError(msg);
    setTimeout(() => setPasteError(null), 3000);
  };

  const handlePaste = async () => {
    if (pasting || !navigator.clipboard?.read) {
      if (!navigator.clipboard?.read) showPasteError("Browser tidak mendukung paste clipboard");
      return;
    }
    try {
      setPasting(true);
      const file = await readImageFromClipboard();
      if (!file) { showPasteError("Tidak ada gambar di clipboard"); return; }
      onAdd?.({ target: { files: [file] } });
    } catch (err) {
      console.error("Clipboard paste:", err);
      showPasteError(err.name === "NotAllowedError"
        ? "Izin clipboard ditolak — klik 'Izinkan' pada prompt browser"
        : `Gagal paste: ${err.message}`);
    } finally {
      setPasting(false);
    }
  };

  const handlePasteAt = async (slotIdx) => {
    if (pastingSlot !== null || !navigator.clipboard?.read) {
      if (!navigator.clipboard?.read) showPasteError("Browser tidak mendukung paste clipboard");
      return;
    }
    try {
      setPastingSlot(slotIdx);
      const file = await readImageFromClipboard();
      if (!file) { showPasteError("Tidak ada gambar di clipboard"); return; }
      onAddAt?.(slotIdx, { target: { files: [file] } });
    } catch (err) {
      console.error("Clipboard paste:", err);
      showPasteError(err.name === "NotAllowedError"
        ? "Izin clipboard ditolak — klik 'Izinkan' pada prompt browser"
        : `Gagal paste: ${err.message}`);
    } finally {
      setPastingSlot(null);
    }
  };

  // ── Mode per-slot: satu tombol kamera per label ──────────────────────────────
  if (photoLabels.length > 0 && onAddAt) {
    // Daftar slot yang terisi (untuk lightbox navigation)
    const filledEntries = photoLabels
      .map((lbl, i) => ({ lbl, url: photos[i], slotIdx: i }))
      .filter(e => e.url && e.url !== "");

    const filledCount = filledEntries.length;
    const isComplete  = filledCount >= minPhotos;

    const openLightbox = (slotIdx) => {
      const lbIdx = filledEntries.findIndex(e => e.slotIdx === slotIdx);
      if (lbIdx >= 0) setLightboxIdx(lbIdx);
    };

    const clearSlot = (slotIdx) => {
      if (onClearSlot) onClearSlot(slotIdx);
      else if (onRemove) onRemove(slotIdx);
    };

    return (
      <div className="mt-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-500">
            Foto · {filledCount}/{minPhotos} min
          </span>
          {!isComplete && (
            <span className="text-[10px] text-red-500 font-medium">wajib</span>
          )}
        </div>

        {pasteError && (
          <p className="text-[10px] text-red-500 mb-1.5 px-0.5">{pasteError}</p>
        )}

        {/* Grid slot */}
        <div className="grid grid-cols-2 gap-2">
          {photoLabels.map((lbl, i) => {
            const url      = photos[i];
            const hasPhoto = url && url !== "";

            if (hasPhoto) {
              return (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer"
                  onClick={() => openLightbox(i)}
                >
                  <img src={url} alt={lbl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

                  {/* Label overlay di bawah */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <p className="text-white text-[9px] font-medium leading-tight">
                      {i + 1}. {lbl}
                    </p>
                  </div>

                  {/* Tombol unduh */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); downloadPhoto(url, `foto-${i + 1}.jpg`); }}
                    onMouseDown={e => e.stopPropagation()}
                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition
                               bg-black/60 text-white rounded-full p-0.5"
                    title="Unduh"
                  >
                    <Download size={11} />
                  </button>

                  {/* Konfirmasi hapus */}
                  {confirmIdx === i ? (
                    <div
                      className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 rounded-xl"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <p className="text-white text-[10px] font-semibold text-center leading-tight px-1">
                        Hapus foto ini?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setConfirmIdx(null); }}
                          onMouseDown={e => e.stopPropagation()}
                          className="px-2.5 py-1 bg-white/20 text-white text-[10px] font-medium rounded-md active:bg-white/30 transition"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); clearSlot(i); setConfirmIdx(null); }}
                          onMouseDown={e => e.stopPropagation()}
                          className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-semibold rounded-md active:bg-red-600 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setConfirmIdx(i); }}
                      onMouseDown={e => e.stopPropagation()}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 active:scale-90 transition"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            }

            // Slot kosong — tombol kamera berlabel (+ paste overlay jika diizinkan)
            return (
              <div key={i} className="aspect-square relative">
                <CameraButton
                  onChange={e => onAddAt(i, e)}
                  className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-xl
                             border-2 border-dashed border-gray-300 text-gray-400 cursor-pointer
                             active:bg-gray-50 transition p-2"
                >
                  <Camera size={18} className="flex-shrink-0" />
                  <span className="text-[10px] leading-tight text-center font-medium px-1">
                    {i + 1}. {lbl}
                  </span>
                </CameraButton>
                {!disablePaste && (
                  <button
                    type="button"
                    onClick={() => handlePasteAt(i)}
                    disabled={pastingSlot !== null}
                    title="Paste dari clipboard"
                    className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center
                               rounded-lg bg-blue-50 border border-blue-200 text-blue-400
                               hover:bg-blue-100 active:bg-blue-200 transition
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pastingSlot === i
                      ? <span className="text-[8px] animate-pulse">…</span>
                      : <ClipboardPaste size={11} />
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Foto tambahan di luar slot wajib */}
        {(() => {
          const extraPhotos = photos.slice(photoLabels.length).filter(u => u && u !== "");
          const extraOffset = photoLabels.length;
          if (extraPhotos.length > 0) {
            return (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {extraPhotos.map((url, ei) => {
                  const realIdx = extraOffset + ei;
                  return (
                    <div
                      key={realIdx}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer"
                      onClick={() => {
                        const allFilled = [
                          ...filledEntries.map(e => e.url),
                          ...extraPhotos,
                        ];
                        setLightboxIdx(filledEntries.length + ei);
                      }}
                    >
                      <img src={url} alt={`Foto tambahan ${ei + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-white text-[9px] font-medium">Foto Tambahan {ei + 1}</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); downloadPhoto(url, `foto-tambahan-${ei + 1}.jpg`); }}
                        onMouseDown={e => e.stopPropagation()}
                        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition
                                   bg-black/60 text-white rounded-full p-0.5"
                        title="Unduh"
                      >
                        <Download size={11} />
                      </button>
                      {confirmIdx === realIdx ? (
                        <div
                          className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 rounded-xl"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <p className="text-white text-[10px] font-semibold text-center px-1">Hapus foto ini?</p>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={e => { e.stopPropagation(); setConfirmIdx(null); }}
                              onMouseDown={e => e.stopPropagation()}
                              className="px-2.5 py-1 bg-white/20 text-white text-[10px] rounded-md">Batal</button>
                            <button type="button" onClick={e => { e.stopPropagation(); clearSlot(realIdx); setConfirmIdx(null); }}
                              onMouseDown={e => e.stopPropagation()}
                              className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-semibold rounded-md">Hapus</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={e => { e.stopPropagation(); setConfirmIdx(realIdx); }}
                          onMouseDown={e => e.stopPropagation()}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 active:scale-90 transition">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
          return null;
        })()}

        {/* Tombol tambah foto bebas */}
        {(
          <div className="flex gap-2 mt-2">
            <CameraButton
              onChange={onAdd}
              className="flex-1 flex items-center justify-center gap-1.5 py-2
                         rounded-xl border-2 border-dashed border-gray-200 text-gray-400
                         cursor-pointer active:bg-gray-50 transition text-[11px] font-medium"
            >
              <Camera size={14} />
              Tambah Foto
            </CameraButton>
            {!disablePaste && (
              <button
                type="button"
                onClick={handlePaste}
                disabled={pasting}
                title="Paste dari clipboard"
                className="px-3 flex items-center justify-center gap-1
                           rounded-xl border-2 border-dashed border-blue-200 text-blue-400
                           cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition text-[11px]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pasting ? <span className="animate-pulse text-[10px]">…</span> : <ClipboardPaste size={14} />}
              </button>
            )}
          </div>
        )}

        {lightboxIdx !== null && (() => {
          const allPhotos = [
            ...filledEntries.map(e => e.url),
            ...photos.slice(photoLabels.length).filter(u => u && u !== ""),
          ];
          return (
            <PhotoLightbox
              photos={allPhotos}
              index={Math.min(lightboxIdx, allPhotos.length - 1)}
              onClose={() => setLightboxIdx(null)}
              onNav={setLightboxIdx}
            />
          );
        })()}
      </div>
    );
  }

  // ── Mode default: tambah bebas ────────────────────────────────────────────────
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

      {pasteError && (
        <p className="text-[10px] text-red-500 mb-1.5 px-0.5">{pasteError}</p>
      )}

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
              onMouseDown={e => e.stopPropagation()}
              className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition
                         bg-black/60 text-white rounded-full p-0.5"
              title="Unduh"
            >
              <Download size={11} />
            </button>
            {confirmIdx === i ? (
              <div
                className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 rounded-lg"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                <p className="text-white text-[10px] font-semibold text-center leading-tight px-1">
                  Hapus foto ini?
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setConfirmIdx(null); }}
                    onMouseDown={e => e.stopPropagation()}
                    className="px-2.5 py-1 bg-white/20 text-white text-[10px] font-medium rounded-md active:bg-white/30 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onRemove(i); setConfirmIdx(null); }}
                    onMouseDown={e => e.stopPropagation()}
                    className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-semibold rounded-md active:bg-red-600 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmIdx(i); }}
                onMouseDown={e => e.stopPropagation()}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5
                           active:scale-90 transition"
              >
                <X size={12} />
              </button>
            )}
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

        {!disablePaste && (
          <button
            type="button"
            onClick={handlePaste}
            disabled={pasting}
            title="Paste gambar dari clipboard"
            className="aspect-square rounded-lg border-2 border-dashed border-blue-200
                       flex flex-col items-center justify-center text-blue-400
                       cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardPaste size={20} />
            <span className="text-[10px] mt-1">{pasting ? "..." : "Paste"}</span>
          </button>
        )}
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
