import { Camera, X } from "lucide-react";
import CameraButton from "./CameraButton";
import CachedImage from "../offline/CachedImage";

const BASE = "trafo.isolasiTransformator";

const PRIMER_ROWS = [
  { key: "rg", label: "R–G" },
  { key: "sg", label: "S–G" },
  { key: "tg", label: "T–G" },
  { key: "rs", label: "R–S", interphase: true },
  { key: "st", label: "S–T", interphase: true },
  { key: "tr", label: "T–R", interphase: true },
];

const SEKUNDER_ROWS = [
  { key: "rg", label: "R–G" },
  { key: "sg", label: "S–G" },
  { key: "tg", label: "T–G" },
  { key: "ng", label: "N–G", highlight: true },
  { key: "rs", label: "R–S", interphase: true },
  { key: "st", label: "S–T", interphase: true },
  { key: "tr", label: "T–R", interphase: true },
];

const PS_ROWS = [
  { key: "rr", label: "R–R" },
  { key: "ss", label: "S–S" },
  { key: "tt", label: "T–T" },
];

function MeasurementRow({ partKey, sub, row, prevWasInterphase, form, photos, onChange, onAddPhoto, onRemovePhoto }) {
  const valuePath = `${BASE}.${sub}.${row.key}.nilai`;
  const photoKey  = `${BASE}.${sub}.${row.key}`;
  const value     = form[partKey]?.trafo?.isolasiTransformator?.[sub]?.[row.key]?.nilai ?? "";
  const pic       = photos[partKey]?.[photoKey]?.[0] ?? null;

  const showDivider = row.interphase && !prevWasInterphase;

  return (
    <>
      {showDivider && <div className="h-px bg-gray-200 mx-3 my-1" />}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mx-1 ${
        row.highlight ? "bg-blue-50 border border-blue-200" : ""
      }`}>
        <span className={`w-9 text-xs font-mono font-semibold shrink-0 ${
          row.interphase ? "text-gray-400" : "text-gray-700"
        }`}>
          {row.label}
        </span>

        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={e => onChange(
            partKey, valuePath,
            e.target.value === "" ? null : Number(e.target.value)
          )}
          placeholder="MΩ"
          className={`flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:ring-1 focus:ring-blue-400 ${
            row.interphase ? "bg-gray-50 text-gray-500 border-gray-200" : "border-gray-300"
          }`}
        />

        <div className="shrink-0 w-10 h-10">
          {pic ? (
            <div className="relative w-10 h-10">
              <CachedImage
                src={pic}
                alt={row.label}
                className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                fallback={<div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse" />}
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(partKey, photoKey, 0)}
                className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <CameraButton
              onChange={e => onAddPhoto(partKey, photoKey, e)}
              className="flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 active:bg-gray-50 transition"
            >
              <Camera size={15} />
            </CameraButton>
          )}
        </div>
      </div>
    </>
  );
}

function IsolasiCard({ title, sub, rows, partKey, form, photos, onChange, onAddPhoto, onRemovePhoto }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
      <div className="bg-slate-700 px-4 py-2.5">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-[10px] text-slate-300">Label | Nilai (MΩ) | Foto megger</p>
      </div>
      <div className="py-2 space-y-0.5">
        {rows.map((row, idx) => (
          <MeasurementRow
            key={row.key}
            partKey={partKey}
            sub={sub}
            row={row}
            prevWasInterphase={idx > 0 && rows[idx - 1].interphase}
            form={form}
            photos={photos}
            onChange={onChange}
            onAddPhoto={onAddPhoto}
            onRemovePhoto={onRemovePhoto}
          />
        ))}
      </div>
    </div>
  );
}

export default function IsolasiTransformatorSection({ partKey = "part1", form, photos, onChange, onAddPhoto, onRemovePhoto }) {
  const hasilEvaluasi = form[partKey]?.trafo?.isolasiTransformator?.hasilEvaluasi ?? "";

  return (
    <div className="mt-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="h-1 w-1 rounded-full bg-amber-500" />
        <h3 className="text-sm font-bold text-slate-700">C.1 Pengukuran Tahanan Isolasi Transformator</h3>
      </div>

      <IsolasiCard
        title="Isolasi Primer"
        sub="primer"
        rows={PRIMER_ROWS}
        partKey={partKey}
        form={form}
        photos={photos}
        onChange={onChange}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
      />

      <IsolasiCard
        title="Isolasi Sekunder"
        sub="sekunder"
        rows={SEKUNDER_ROWS}
        partKey={partKey}
        form={form}
        photos={photos}
        onChange={onChange}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
      />

      <IsolasiCard
        title="Primer ↔ Sekunder"
        sub="primerSekunder"
        rows={PS_ROWS}
        partKey={partKey}
        form={form}
        photos={photos}
        onChange={onChange}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
      />

      {/* Hasil Evaluasi */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
        <label className="text-xs font-semibold text-slate-600 block mb-2">
          Hasil Evaluasi / Keterangan
        </label>
        <textarea
          rows={3}
          value={hasilEvaluasi}
          onChange={e => onChange(partKey, `${BASE}.hasilEvaluasi`, e.target.value)}
          placeholder="Tulis hasil evaluasi pengukuran isolasi transformator..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>
  );
}
