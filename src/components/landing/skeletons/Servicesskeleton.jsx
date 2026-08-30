export default function ServicesSkeleton() {
  return (
    <div className="space-y-16">
      {[0, 1].map((gi) => (
        <div key={gi}>
          {/* Category header banner skeleton */}
          <div className="h-20 lg:h-24 rounded-2xl bg-slate-200 animate-pulse mb-6" />
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((ci) => (
              <div
                key={ci}
                className="h-56 sm:h-60 rounded-2xl bg-slate-200 animate-pulse"
                style={{ animationDelay: `${ci * 80}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
