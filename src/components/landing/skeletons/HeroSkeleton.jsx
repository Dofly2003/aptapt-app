export default function HeroSkeleton() {
  return (
    <section
      className="w-full min-h-[580px] xl:h-[800px] flex items-center animate-pulse"
      style={{ background: '#221d19' }}
    >
      <div className="flex flex-col gap-6 w-full" style={{ paddingLeft: 'clamp(20px, 6.77vw, 130px)', paddingRight: 20 }}>
        <div className="h-4 w-52 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="h-12 w-full max-w-[560px] rounded" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="h-12 w-3/4 max-w-[420px] rounded" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="h-5 w-2/3 max-w-[380px] rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-5 w-1/2 max-w-[300px] rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex gap-3 mt-2">
          <div className="h-11 w-40 rounded-xl" style={{ background: 'rgba(238,122,60,0.3)' }} />
          <div className="h-11 w-32 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>
    </section>
  );
}