export default function LoadingOverlay({ visible, message = "Loading..." }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-slate-950/75 p-5 text-sky-100 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Spinner */}
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-sky-400 border-r-sky-400/60" />
        <span className="absolute inset-3 animate-[spin_1.8s_linear_infinite_reverse] rounded-full border-[3px] border-transparent border-l-emerald-400 border-b-emerald-400/60" />
        <span className="absolute inset-[22px] animate-pulse rounded-full bg-gradient-to-br from-sky-300 to-teal-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]" />
      </div>

      <div className="text-center">
        <p className="text-lg font-extrabold tracking-wide text-white">AI Worker Studio</p>
        <p className="mt-1 text-sm text-sky-300/80">{message}</p>
      </div>
    </div>
  );
}
