import { useLoading } from "../context/LoadingContext";

export default function GlobalLoader() {
  const { loading, text } = useLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white px-8 py-6 rounded-2xl shadow-xl text-center">

        {/* 🔥 SPINNER ANIMASI */}
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <p className="text-sm font-semibold">{text}</p>

      </div>
    </div>
  );
}