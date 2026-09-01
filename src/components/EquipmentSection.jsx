import { useState, useRef, useEffect } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Accordion from "./Accordion";
import FieldInput from "./FieldInput";
import PhotoUploader from "./PhotoUploader";
import MeasurementRow from "./MeasurementRow";
import PembumianSection from "./PembumianSection";
import ChecklistSection from "./ChecklistSection";
import DynamicGroupList from "./DynamicGroupList";
import { getPath } from "../utils/nestedPath";

function SortableGroupWrapper({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-stretch gap-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center w-5 text-gray-300
                   hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        title="Geser untuk mengubah urutan"
      >
        <GripVertical size={13} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/**
 * Renders ONE equipment (e.g. PHB TM, Trafo, LVMDP) as an outer
 * accordion. Each group inside is its own inner accordion.
 *
 * Pure presentation — all state & handlers come from parent.
 */
export default function EquipmentSection({
  partKey,
  equipment,
  form,
  photos,
  onChange,
  onAddPhoto,
  onRemovePhoto,
  onClearSlotPhoto,
  onSwapPhotos,
  onSwapGroupPhotos,
  onCrossFieldMove,
  onRotatePhoto,
  flat = false,
  disablePaste = false,
  sortable = false,
  onGroupReorder,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = equipment.groups.map(g => g.key);
    const oldIdx = keys.indexOf(active.id);
    const newIdx = keys.indexOf(over.id);
    if (oldIdx !== -1 && newIdx !== -1)
      onGroupReorder?.(arrayMove(keys, oldIdx, newIdx));
  };
  // ── Dynamic rows (Pembumian, PHB TR Spec) ────────────────────────
  if (equipment.kind === "dynamic") {
    const rows = form[partKey]?.[equipment.key]?.rows ?? [];
    return (
      <PembumianSection
        eqKey={equipment.key}
        rowSchema={equipment.rowSchema ?? []}
        hasRowPhoto={equipment.hasRowPhoto ?? false}
        addLabel={equipment.hasRowPhoto ? "Tambah Grounding" : "Tambah Baris"}
        rows={rows}
        photos={photos[partKey] ?? {}}
        onRowsChange={(newRows) => onChange(partKey, `${equipment.key}.rows`, newRows)}
        onAddPhoto={(photoKey, e) => onAddPhoto(partKey, `${equipment.key}.${photoKey}`, e)}
        onRemovePhoto={(photoKey, i) => onRemovePhoto(partKey, `${equipment.key}.${photoKey}`, i)}
      />
    );
  }

  // ── Checklist (Pengaman Elektrik, Evaluasi Komponen) ─────────────
  if (equipment.kind === "checklist") {
    const data = form[partKey]?.[equipment.key] ?? {};
    return (
      <ChecklistSection
        eqKey={equipment.key}
        items={equipment.items ?? []}
        data={data}
        photos={photos[partKey] ?? {}}
        onChange={(itemKey, field, value) =>
          onChange(partKey, `${equipment.key}.${itemKey}.${field}`, value)
        }
        onAddPhoto={(itemKey, e) => onAddPhoto(partKey, `${equipment.key}.${itemKey}`, e)}
        onRemovePhoto={(itemKey, i) => onRemovePhoto(partKey, `${equipment.key}.${itemKey}`, i)}
      />
    );
  }

  const totalGroups = equipment.groups.filter(g => g.photo && g.kind !== "dynamic").length;
  const doneGroups = equipment.groups.filter(g => {
    if (!g.photo || g.kind === "dynamic") return false;
    const k = `${equipment.key}.${g.key}`;
    const arr = photos[partKey]?.[k] ?? [];
    const filled = arr.filter(p => p && p !== "").length;
    return filled >= (g.minPhotos ?? 1);
  }).length;

  const isolasiGroups = equipment.groups?.filter(g => g.key.startsWith("isolasi_") && g.perFieldPhotos) ?? [];

  const renderGroup = (grp) => {
    if (grp.kind === "dynamic") {
      return (
        <DynamicGroupList
          key={grp.key}
          partKey={partKey}
          equipmentKey={equipment.key}
          group={grp}
          form={form}
          photos={photos}
          onChange={onChange}
          onAddPhoto={onAddPhoto}
          onRemovePhoto={onRemovePhoto}
        />
      );
    }
    const siblingIsolasiGroups = grp.key.startsWith("isolasi_") && grp.perFieldPhotos
      ? isolasiGroups.filter(g => g.key !== grp.key)
      : [];
    return (
      <GroupBlock
        key={grp.key}
        partKey={partKey}
        equipmentKey={equipment.key}
        group={grp}
        form={form}
        photos={photos}
        onChange={onChange}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
        onClearSlotPhoto={onClearSlotPhoto}
        onSwapPhotos={onSwapPhotos}
        onSwapGroupPhotos={onSwapGroupPhotos}
        onCrossFieldMove={onCrossFieldMove}
        onRotatePhoto={onRotatePhoto}
        siblingIsolasiGroups={siblingIsolasiGroups}
        disablePaste={disablePaste}
      />
    );
  };

  const groupIds = equipment.groups.map(g => g.key);

  const groups = sortable ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {equipment.groups.map(grp => (
            <SortableGroupWrapper key={grp.key} id={grp.key}>
              {renderGroup(grp)}
            </SortableGroupWrapper>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  ) : (
    <div className="space-y-2">
      {equipment.groups.map(grp => renderGroup(grp))}
    </div>
  );

  if (flat) return groups;

  const headerBadge = totalGroups > 0 && (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        doneGroups === totalGroups
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {doneGroups}/{totalGroups}
    </span>
  );

  return (
    <Accordion
      title={equipment.label}
      subtitle={`${equipment.groups.length} bagian`}
      badge={headerBadge}
      defaultOpen={false}
    >
      <div className="space-y-2 mt-3">
        {equipment.groups.map(grp => renderGroup(grp))}
      </div>
    </Accordion>
  );
}

function GroupBlock({
  partKey,
  equipmentKey,
  group,
  form,
  photos,
  onChange,
  onAddPhoto,
  onRemovePhoto,
  onClearSlotPhoto,
  onSwapPhotos,
  onSwapGroupPhotos,
  onCrossFieldMove,
  onRotatePhoto,
  siblingIsolasiGroups = [],
  disablePaste = false,
}) {
  const [swapTarget, setSwapTarget] = useState(null);
  const swapMenuRef = useRef(null);

  useEffect(() => {
    if (!swapTarget) return;
    const handler = (e) => {
      if (swapMenuRef.current && !swapMenuRef.current.contains(e.target)) {
        setSwapTarget(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [swapTarget]);

  // ── Mode per-field photos (tahanan isolasi, dll) ───────────────
  if (group.perFieldPhotos) {
    const doneFields = group.fields.filter(f => {
      const arr = photos[partKey]?.[`${equipmentKey}.${group.key}.${f.name}`] ?? [];
      return arr.length >= group.perFieldPhotos;
    }).length;
    const total = group.fields.length;

    const hasSiblings = siblingIsolasiGroups.length > 0 && onSwapGroupPhotos;

    const handleSwap = (targetGroup) => {
      onSwapGroupPhotos(partKey, equipmentKey, group.key, group.fields, targetGroup.key, targetGroup.fields);
      setSwapTarget(null);
    };

    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100">
        <Accordion
          title={group.label}
          defaultOpen={false}
          badge={
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {hasSiblings && (
                <div className="relative" ref={swapMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSwapTarget(v => v ? null : group.key)}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                    title="Tukar foto dengan grup lain"
                  >
                    ⇄ Tukar
                  </button>
                  {swapTarget === group.key && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[200px]">
                      <p className="text-[10px] text-gray-400 px-3 pt-1 pb-1.5 font-medium uppercase tracking-wide">
                        Tukar foto dengan:
                      </p>
                      {siblingIsolasiGroups.map(sg => (
                        <button
                          key={sg.key}
                          type="button"
                          onClick={() => handleSwap(sg)}
                          className="w-full text-left text-xs px-3 py-2 hover:bg-amber-50 text-gray-700 transition"
                        >
                          {sg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                doneFields === total
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {doneFields}/{total}
              </span>
            </div>
          }
        >
          <div className="space-y-2 mt-3">
            {group.fields.map(f => {
              const path         = `${equipmentKey}.${group.key}.${f.name}`;
              const fieldPhotoKey = `${equipmentKey}.${group.key}.${f.name}`;
              const value        = getPath(form[partKey], path, "");
              const fieldPhotos  = photos[partKey]?.[fieldPhotoKey] ?? [];

              return (
                <MeasurementRow
                  key={f.name}
                  label={f.label}
                  value={value}
                  onChange={v => onChange(partKey, path, v)}
                  photos={fieldPhotos}
                  photoLabels={group.perFieldPhotoLabels ?? []}
                  maxPhotos={group.perFieldPhotos}
                  fieldKey={fieldPhotoKey}
                  onAddPhoto={e => onAddPhoto(partKey, fieldPhotoKey, e)}
                  onAddPhotoAt={(slotIdx, e) => onAddPhoto(partKey, fieldPhotoKey, e, slotIdx)}
                  onRemovePhoto={i => onRemovePhoto(partKey, fieldPhotoKey, i)}
                  onClearSlotPhoto={onClearSlotPhoto ? i => onClearSlotPhoto(partKey, fieldPhotoKey, i) : undefined}
                  onSwapPhotos={onSwapPhotos ? (a, b) => onSwapPhotos(partKey, fieldPhotoKey, a, b) : undefined}
                  onMovePhotoCross={onCrossFieldMove ? (srcKey, srcSlot, dstSlot) => onCrossFieldMove(partKey, srcKey, srcSlot, fieldPhotoKey, dstSlot) : undefined}
                  onRotatePhoto={onRotatePhoto ? i => onRotatePhoto(partKey, fieldPhotoKey, i) : undefined}
                  disablePaste={disablePaste}
                />
              );
            })}
          </div>
        </Accordion>
      </div>
    );
  }

  // ── Mode normal (group-level photo) ───────────────────────────
  const photoKey  = `${equipmentKey}.${group.key}`;
  const photoArr  = photos[partKey]?.[photoKey] ?? [];
  const minPhotos = group.minPhotos ?? 1;
  const isComplete = group.photo
    ? photoArr.filter(p => p && p !== "").length >= minPhotos
    : true;

  const [showPreview, setShowPreview] = useState(false);
  const [previewY, setPreviewY] = useState(100);
  const focusRef = useRef(null);
  const blurTimer = useRef(null);

  const handleFieldFocus = (e) => {
    clearTimeout(blurTimer.current);
    if (!photoArr.length) return;
    const rect = e.target.getBoundingClientRect();
    const panelH = Math.min(photoArr.length, 3) * 180 + 48;
    const top = Math.max(8, Math.min(rect.top - 8, window.innerHeight - panelH - 8));
    setPreviewY(top);
    setShowPreview(true);
  };

  const handleFieldBlur = () => {
    blurTimer.current = setTimeout(() => setShowPreview(false), 200);
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100">
      <Accordion
        title={group.label}
        defaultOpen={false}
        badge={
          group.photo && (
            <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center
              ${isComplete ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
              {isComplete ? "✓" : "•"}
            </span>
          )
        }
      >
        <div ref={focusRef} className={`mt-3 gap-2 ${
          group.fields.every(f => f.type === "checkbox")
            ? "flex flex-col"
            : "grid grid-cols-2"
        }`}>
          {!group.photoOnly && group.fields.map(f => {
            const path  = `${equipmentKey}.${group.key}.${f.name}`;
            const value = getPath(form[partKey], path, "");
            return (
              <FieldInput
                key={f.name}
                label={f.label}
                value={value}
                type={f.type}
                placeholder={f.placeholder}
                onChange={v => onChange(partKey, path, v)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
              />
            );
          })}
        </div>


        {group.photo && (
          <PhotoUploader
            photos={photoArr}
            minPhotos={minPhotos}
            photoLabels={group.photoLabels ?? []}
            onAdd={e => onAddPhoto(partKey, photoKey, e)}
            onAddAt={(slotIdx, e) => onAddPhoto(partKey, photoKey, e, slotIdx)}
            onRemove={i => onRemovePhoto(partKey, photoKey, i)}
            onClearSlot={onClearSlotPhoto ? i => onClearSlotPhoto(partKey, photoKey, i) : undefined}
            disablePaste={disablePaste}
          />
        )}
      </Accordion>

      {/* Floating photo preview panel saat field difokus */}
      {showPreview && photoArr.length > 0 && (
        <div
          style={{ position: "fixed", top: previewY, right: 24, zIndex: 9999 }}
          className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-3 flex flex-col gap-2 pointer-events-none"
        >
          <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide px-0.5">
            {group.label}
          </p>
          <div className="flex flex-col gap-2">
            {photoArr.map((photo, i) => {
              const lbl = group.photoLabels?.[i] ?? `Foto ${i + 1}`;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <img
                    src={photo}
                    alt={lbl}
                    className="w-[312px] h-[264px] object-cover rounded-xl shadow-sm"
                  />
                  <span className="text-[9px] text-gray-500">{lbl}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}