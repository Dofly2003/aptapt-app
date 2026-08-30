import { Download } from "lucide-react";

export default function DownloadDocButton({ label, url }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      disabled={!url}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
        flex-1 justify-center transition-all
        ${url
          ? "border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95"
          : "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60"
        }
      `}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label}</span>
      {!url && <span className="text-xs font-normal">(belum ada)</span>}
    </button>
  );
}
