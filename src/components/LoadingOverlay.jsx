export default function LoadingOverlay({ visible, message = "Loading..." }) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-content-center justify-items-center gap-2 bg-slate-950/80 p-5 text-sky-100 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative grid h-28 w-28 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-300 border-r-sky-300/70" />
        <span className="absolute inset-3 animate-[spin_1.6s_linear_infinite_reverse] rounded-full border-2 border-transparent border-l-emerald-300 border-b-emerald-300/70" />
        <span className="h-6 w-6 animate-pulse rounded-full bg-gradient-to-br from-sky-100 to-sky-400 shadow-[0_0_18px_rgba(108,195,234,0.65)]" />
      </div>
      <p className="text-2xl font-extrabold tracking-wide text-white">AI Worker Studio</p>
      <p className="text-sm text-sky-100">{message}</p>
    </div>
  );
}
