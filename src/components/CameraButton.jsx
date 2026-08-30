import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

function dataUrlToFile(dataUrl) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], `photo_${Date.now()}.jpg`, { type: mime });
}

const isNative = Capacitor.isNativePlatform();

/**
 * Di native: langsung buka kamera tanpa file picker.
 * Di web: render label + input[type=file] biasa.
 * onChange dipanggil dengan synthetic event { target: { files: [File] } }
 */
export default function CameraButton({ onChange, className, children, captureEnv = false }) {
  const handleNative = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        width: 1280,
        correctOrientation: true,
        saveToGallery: true,
      });
      const file = dataUrlToFile(photo.dataUrl);
      onChange({ target: { files: [file] } });
    } catch (err) {
      if (!err?.message?.toLowerCase().includes("cancel")) {
        console.error("Camera error:", err);
      }
    }
  };

  if (isNative) {
    return (
      <button type="button" onClick={handleNative} className={className}>
        {children}
      </button>
    );
  }

  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
        {...(captureEnv ? { capture: "environment" } : {})}
      />
    </label>
  );
}
