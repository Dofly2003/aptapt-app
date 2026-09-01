// src/components/admin/ItemAutocomplete.jsx
// Input dengan dropdown suggest dari master_harga.
// Fitur:
//   - Fuzzy search saat mengetik
//   - Preview harga historis + harga dengan markup 7%
//   - Trend indicator (naik/turun/stabil)
//   - Usage count (jumlah kali dipakai)
//   - Badge "BARU" kalau tidak ada match — item akan otomatis tercatat saat RAB disimpan
//   - Keyboard nav (↑/↓/Enter/Esc)

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Sparkles, History } from "lucide-react";
import { findTopMatches, similarity } from "../../utils/normalizeItemName";
import { getPriceTrend } from "../../services/masterHargaService";
import { MARKUP_PERCENT, applyMarkup, formatRupiah } from "../../services/rabService";

export default function ItemAutocomplete({
  value,
  onChange,          // (patch: { nama, satuan?, hargaSatuan? }) => void
  items = [],        // master_harga list dari parent (cached)
  disabled = false,
  placeholder = "Ketik nama barang…",
  className = "",
  inputClassName = "",
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = useMemo(
    () => findTopMatches(value || "", items, 8, 0.25),
    [value, items]
  );

  const query = (value || "").trim();
  const hasExactMatch = query
    ? suggestions.some((s) => similarity(query, s.nama) >= 0.9)
    : false;
  const showNewBadge = query.length >= 2 && !hasExactMatch;

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset active idx when suggestions change
  useEffect(() => {
    setActiveIdx(0);
  }, [suggestions.length, value]);

  const handleSelect = (item) => {
    if (!item) return;
    onChange?.({
      nama: item.nama,
      satuan: item.satuan || "pcs",
      hargaSatuan: applyMarkup(item.harga),
    });
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestions[activeIdx]) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const inpBase =
    inputClassName ||
    "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-white text-slate-900 placeholder-slate-400";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.({ nama: e.target.value })}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inpBase}
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && !disabled && (suggestions.length > 0 || showNewBadge) && (
        <div className="absolute z-30 mt-1 left-0 right-0 min-w-[280px] max-h-[320px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl">
          {/* Header */}
          <div className="sticky top-0 bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Search size={11} />
              {suggestions.length > 0
                ? `${suggestions.length} saran dari master harga`
                : "Item baru"}
            </span>
            <span className="text-[10px] text-slate-400">
              Markup <span className="font-semibold text-amber-600">+{MARKUP_PERCENT}%</span>
            </span>
          </div>

          {/* Suggestions */}
          {suggestions.map((item, i) => (
            <SuggestionRow
              key={item.id}
              item={item}
              isActive={i === activeIdx}
              onClick={() => handleSelect(item)}
              onHover={() => setActiveIdx(i)}
            />
          ))}

          {/* New item hint */}
          {showNewBadge && (
            <div className="px-3 py-2.5 bg-emerald-50 border-t border-emerald-100 flex items-start gap-2">
              <Sparkles size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-800">
                  "{query}" akan disimpan sebagai item baru
                </p>
                <p className="text-emerald-700 mt-0.5">
                  Setelah RAB disimpan, master harga akan otomatis mencatat item ini.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ item, isActive, onClick, onHover }) {
  const trend = useMemo(() => getPriceTrend(item.history || []), [item.history]);
  const markedPrice = applyMarkup(item.harga);
  const lastDate = getLastDate(item);

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`
        w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-0
        transition-colors flex items-start gap-3
        ${isActive ? "bg-amber-50" : "hover:bg-slate-50"}
      `}
    >
      {/* Left: name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-800 text-sm leading-snug">{item.nama}</span>
          <TrendBadge trend={trend} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
          <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium text-[10px]">
            {item.satuan || "pcs"}
          </span>
          {item.usageCount > 0 && (
            <span className="flex items-center gap-0.5">
              <History size={10} />
              {item.usageCount}×
            </span>
          )}
          {lastDate && <span className="text-slate-400">· {lastDate}</span>}
        </div>
      </div>

      {/* Right: price */}
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] text-slate-400 line-through">
          {formatRupiah(item.harga)}
        </div>
        <div className="text-sm font-bold text-amber-700">{formatRupiah(markedPrice)}</div>
        <div className="text-[9px] text-amber-600 font-semibold">+{MARKUP_PERCENT}%</div>
      </div>
    </button>
  );
}

function TrendBadge({ trend }) {
  if (trend.direction === "stable") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 font-medium">
        <Minus size={9} />
        stabil
      </span>
    );
  }
  if (trend.direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-red-600 font-semibold">
        <TrendingUp size={9} />
        {trend.percent > 0 ? `+${trend.percent}%` : `${trend.percent}%`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold">
      <TrendingDown size={9} />
      {trend.percent}%
    </span>
  );
}

function getLastDate(item) {
  const raw = item.lastUsedAt || item.updatedAt;
  if (!raw) return null;
  const d = raw?.toDate ? raw.toDate() : new Date(raw);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hari ini";
  if (diff === 1) return "kemarin";
  if (diff < 7) return `${diff}h lalu`;
  if (diff < 30) return `${Math.floor(diff / 7)}mgg lalu`;
  if (diff < 365) return `${Math.floor(diff / 30)}bln lalu`;
  return `${Math.floor(diff / 365)}th lalu`;
}
