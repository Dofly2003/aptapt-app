export default function FieldInput({ label, value, onChange, type = "text", placeholder }) {
  if (type === "checkbox") {
    return (
      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id={label}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0"
        />
        <label htmlFor={label} className="text-[11px] font-medium text-gray-700 cursor-pointer leading-tight">
          {label}
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-600">{label}</label>
      <input
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "decimal" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "-"}
        className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50
                   focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                   outline-none transition"
      />
    </div>
  );
}
