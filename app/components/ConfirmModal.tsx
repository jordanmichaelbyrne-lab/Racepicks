"use client";

export default function ConfirmModal({
  title,
  warning,
  details,
  confirmLabel,
  cancelLabel = "Cancel",
  isPending,
  onConfirm,
  onCancel,
}: {
  title: string;
  /** Short "this is permanent" style line, shown in an orange callout. */
  warning: string;
  /** Free-form summary of exactly what's about to happen. */
  details: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-neutral-800 bg-neutral-950 p-6 sm:rounded-3xl"
      >
        <p className="text-xs font-black uppercase tracking-widest text-orange-500">
          Please Confirm
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">{title}</h2>

        <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="text-sm font-bold text-orange-300">{warning}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-800 bg-black p-4 text-sm text-neutral-300">
          {details}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-full border border-neutral-700 px-5 py-3 text-sm font-black uppercase text-neutral-300 transition hover:border-neutral-500 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-full bg-orange-500 px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}