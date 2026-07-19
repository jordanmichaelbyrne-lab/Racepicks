export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-orange-500" />

          <p className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Race Control
          </p>

          <h1 className="mt-3 text-2xl font-black uppercase">
            Loading
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Preparing the next admin screen.
          </p>
        </div>
      </div>
    </main>
  );
}