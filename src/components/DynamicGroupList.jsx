import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import FieldInput from "./FieldInput";
import PhotoUploader from "./PhotoUploader";

/**
 * Renders a group that supports multiple dynamic entries (rows).
 * Each entry has the same field set and photos as defined in `group`.
 */
export default function DynamicGroupList({
  partKey,
  equipmentKey,
  group,
  form,
  photos,
  onChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const [openIndex, setOpenIndex] = useState(null);
  const rows = form[partKey]?.[equipmentKey]?.[group.key]?.rows ?? [];

  const addRow = () => {
    const newRow = {};
    for (const f of group.fields) {
      newRow[f.name] = f.default ?? (f.type === "checkbox" ? false : "");
    }
    const newRows = [...rows, newRow];
    onChange(partKey, `${equipmentKey}.${group.key}.rows`, newRows);
    setOpenIndex(newRows.length - 1);
  };

  const removeRow = (idx) => {
    onChange(partKey, `${equipmentKey}.${group.key}.rows`, rows.filter((_, i) => i !== idx));
    if (openIndex === idx) setOpenIndex(null);
    else if (openIndex > idx) setOpenIndex(openIndex - 1);
  };

  const updateField = (idx, fieldName, value) => {
    onChange(
      partKey,
      `${equipmentKey}.${group.key}.rows`,
      rows.map((row, i) => (i === idx ? { ...row, [fieldName]: value } : row))
    );
  };

  const rowPhotoKey = (idx) => `${equipmentKey}.${group.key}.${idx}`;
  const rowPhotos = (idx) => photos[partKey]?.[rowPhotoKey(idx)] ?? [];

  const rowLabel = (row, idx) => {
    const firstField = group.fields.find(f => f.type !== "checkbox");
    const val = firstField ? row[firstField.name] : "";
    return val ? `${group.label} — ${val}` : `${group.label} ${idx + 1}`;
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">{group.label}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
          {rows.length} entri
        </span>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {rows.map((row, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                className="w-full flex items-center justify-between px-3 py-2 active:bg-gray-50 transition text-left cursor-pointer"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                onKeyDown={e => e.key === "Enter" && setOpenIndex(isOpen ? null : idx)}
              >
                <span className="text-sm font-medium text-gray-800 truncate">
                  {rowLabel(row, idx)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                    className="p-1 text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                  {isOpen
                    ? <ChevronUp size={14} className="text-gray-400" />
                    : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100 space-y-3 mt-1">
                  {!group.photoOnly && group.fields.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {group.fields.map(f => (
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
                  )}

                  {group.photo && (
                    <PhotoUploader
                      photos={rowPhotos(idx)}
                      minPhotos={group.minPhotos ?? 1}
                      photoLabels={group.photoLabels ?? []}
                      onAdd={e => onAddPhoto(partKey, rowPhotoKey(idx), e)}
                      onRemove={i => onRemovePhoto(partKey, rowPhotoKey(idx), i)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-1">
            Belum ada {group.label.toLowerCase()}. Tap tombol di bawah untuk menambah.
          </p>
        )}

        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-2
            border-2 border-dashed border-blue-300 rounded-xl
            text-blue-600 text-xs font-medium active:scale-95 transition"
        >
          <Plus size={14} />
          Tambah {group.label}
        </button>
      </div>
    </div>
  );
}
