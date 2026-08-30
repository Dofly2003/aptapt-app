import Accordion from "./Accordion";
import FieldInput from "./FieldInput";
import PhotoUploader from "./PhotoUploader";

/**
 * Checklist section for Pengaman Elektrik and Evaluasi Komponen.
 * Each item has Ada/Tidak Ada status, keterangan text, and optional photos.
 */
export default function ChecklistSection({
  items = [],
  data = {},
  photos = {},
  eqKey = "",
  onChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const itemData = data[item.key] ?? { ada: "", keterangan: "" };
        const photoArr = photos[`${eqKey}.${item.key}`] ?? [];
        const isDone = itemData.ada !== "";

        return (
          <div key={item.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <Accordion
              title={item.label}
              defaultOpen={false}
              badge={
                isDone ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    itemData.ada === "Ada"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {itemData.ada}
                  </span>
                ) : null
              }
            >
              <div className="mt-3 space-y-3">
                {/* Ada / Tidak Ada toggle */}
                <div>
                  <p className="text-[11px] text-gray-500 mb-1 font-medium">Hasil</p>
                  <div className="flex gap-2">
                    {["Ada", "Tidak Ada"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(item.key, "ada", opt)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition active:scale-95 ${
                          itemData.ada === opt
                            ? opt === "Ada"
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-red-500 text-white border-red-500"
                            : "bg-white text-gray-600 border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <FieldInput
                  label="Keterangan"
                  value={itemData.keterangan}
                  type="text"
                  placeholder="Catatan kondisi..."
                  onChange={(v) => onChange(item.key, "keterangan", v)}
                />

                <PhotoUploader
                  photos={photoArr}
                  minPhotos={0}
                  photoLabels={["Foto Komponen"]}
                  onAdd={(e) => onAddPhoto(item.key, e)}
                  onRemove={(i) => onRemovePhoto(item.key, i)}
                />
              </div>
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}
