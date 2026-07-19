"use client";

import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
};

export default function AdminSubmitButton({
  children,
  pendingText = "Working…",
  className = "",
  disabled = false,
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}