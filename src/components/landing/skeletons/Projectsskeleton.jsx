export default function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 h-[420px] bg-slate-200 rounded-2xl animate-pulse" />
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[200px] bg-slate-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}