import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Accordion from "./Accordion";
import FieldInput from "./FieldInput";
import PhotoUploader from "./PhotoUploader";

/**
 * Dynamic section for grounding (Sistem Pembumian) and PHB TR Spec rows.
 * Each row has fields from rowSchema and optionally a photo uploader.
 */
export default function PembumianSection({
  eqKey,
  rowSchema = [],
  hasRowPhoto = false,
  addLabel = "Tambah Baris",
  rows = [],
  photos = {},
  onRowsChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const [openIndex, setOpenIndex] = useState(null);

  const makeEmptyRow = () => {
    const r = {};
    for (const f of rowSchema) r[f.name] = "";
    return r;
  };

  const addRow = () => {
    const newRows = [...rows, makeEmptyRow()];
    onRowsChange(newRows);
    setOpenIndex(newRows.length - 1);
  };

  const removeRow = (idx) => {
    onRowsChange(rows.filter((_, i) => i !== idx));
    if (openIndex === idx) setOpenIndex(null);
  };

  const updateField = (idx, fieldName, value) => {
    onRowsChange(rows.map((row, i) => (i === idx ? { ...row, [fieldName]: value } : row)));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const rowName = row[rowSchema[0]?.name] || `Item ${idx + 1}`;
        const isOpen = openIndex === idx;
        const photoKey = `row.${idx}`;
        const photoArr = photos[`${eqKey}.${photoKey}`] ?? [];

        return (
          <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 active:bg-gray-50 transition text-left"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
            >
              <div className="text-sm font-semibold text-gray-800 truncate">{rowName}</div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                  className="p-1 text-red-400 hover:text-red-600 transition"
                >
                  <Trash2 size={15} />
                </button>
                <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 border-t border-gray-50 space-y-2 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  {rowSchema.map((f) => (
                    <FieldInput
                      key={f.name}
                      label={f.label}
                      value={row[f.name] ?? ""}
                      type={f.type}
                      placeholder={f.placeholder}
                      onChange={(v) => updateField(idx, f.name, v)}
                    />
                  ))}
                </div>

                {hasRowPhoto && (
                  <PhotoUploader
                    photos={photoArr}
                    minPhotos={1}
                    photoLabels={["Foto Grounding"]}
                    onAdd={(e) => onAddPhoto(photoKey, e)}
                    onRemove={(i) => onRemovePhoto(photoKey, i)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-3
          border-2 border-dashed border-blue-300 rounded-2xl
          text-blue-600 text-sm font-medium active:scale-95 transition"
      >
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
}
