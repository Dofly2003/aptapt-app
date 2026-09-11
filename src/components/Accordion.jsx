import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Generic collapsible section.
 *  - title / subtitle
 *  - badge slot (e.g. ✓ when complete)
 *  - defaultOpen
 */
export default function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  badge = null,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => setOpen(o => !o);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* role=button, bukan <button>: badge bisa berisi kontrol interaktif
          (mis. tombol "Tukar" di foto isolasi) — <button> di dalam <button>
          merusak DOM & bikin klik hapus foto tidak jalan. */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggle();
          }
        }}
        className="w-full flex items-center justify-between p-3 active:bg-gray-50 transition cursor-pointer select-none"
      >
        <div className="text-left">
          <div className="text-sm font-semibold text-gray-800">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}