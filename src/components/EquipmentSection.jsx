import Accordion from "./Accordion";
import FieldInput from "./FieldInput";
import PhotoUploader from "./PhotoUploader";
import MeasurementRow from "./MeasurementRow";
import PembumianSection from "./PembumianSection";
import ChecklistSection from "./ChecklistSection";
import DynamicGroupList from "./DynamicGroupList";
import { getPath } from "../utils/nestedPath";

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
  flat = false,   // true = render grup langsung tanpa outer accordion
}) {
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
    return arr.length >= (g.minPhotos ?? 1);
  }).length;

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
      />
    );
  };

  const groups = (
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
}) {
  // ── Mode per-field photos (tahanan isolasi, dll) ───────────────
  if (group.perFieldPhotos) {
    const doneFields = group.fields.filter(f => {
      const arr = photos[partKey]?.[`${equipmentKey}.${group.key}.${f.name}`] ?? [];
      return arr.length >= group.perFieldPhotos;
    }).length;
    const total = group.fields.length;

    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100">
        <Accordion
          title={group.label}
          defaultOpen={false}
          badge={
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              doneFields === total
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {doneFields}/{total}
            </span>
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
                  onAddPhoto={e => onAddPhoto(partKey, fieldPhotoKey, e)}
                  onRemovePhoto={i => onRemovePhoto(partKey, fieldPhotoKey, i)}
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
  const isComplete = group.photo ? photoArr.length >= minPhotos : true;

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
        <div className={`mt-3 gap-2 ${
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
            onRemove={i => onRemovePhoto(partKey, photoKey, i)}
          />
        )}
      </Accordion>
    </div>
  );
}