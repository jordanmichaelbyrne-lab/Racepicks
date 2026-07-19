export default function PicksLoading() {
  return (
    <main className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm px-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-orange-500" />
        </div>

        <h1 className="mt-7 text-4xl font-black tracking-tight">
          Racepicks<span className="text-orange-500">.</span>
        </h1>

        <p className="mt-3 text-sm font-black uppercase tracking-[0.3em] text-zinc-500">
          Loading Picks
        </p>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-zinc-900">
          <div className="racepicks-loading-bar h-full rounded-full bg-orange-500" />
        </div>
      </div>
    </main>
  );
}