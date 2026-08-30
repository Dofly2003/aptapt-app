export default function TestimonialsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7 animate-pulse">
          <div className="w-9 h-9 rounded bg-white/10 mb-4" />
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="w-4 h-4 rounded bg-white/10" />
            ))}
          </div>
          <div className="h-4 w-full bg-white/10 rounded mb-2" />
          <div className="h-4 w-5/6 bg-white/10 rounded mb-2" />
          <div className="h-4 w-3/4 bg-white/10 rounded mb-6" />
          <div className="flex items-center gap-4 pt-5 border-t border-white/10">
            <div className="w-12 h-12 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-white/10 rounded mb-2" />
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}