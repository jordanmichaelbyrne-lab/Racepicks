"use client";

import type { ButtonHTMLAttributes, ReactNode, MouseEvent } from "react";
import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
  // Optional — if set, clicking the button shows a browser confirm()
  // dialog with this message first. The form only submits if the
  // person clicks "OK". Use this for actions that are hard to undo or
  // that trigger side effects like emailing every player.
  confirmMessage?: string;
};

export default function AdminSubmitButton({
  children,
  pendingText = "Working…",
  className = "",
  disabled = false,
  type = "submit",
  confirmMessage,
  onClick,
  ...buttonProps
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  const isDisabled = pending || disabled;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);

      if (!confirmed) {
        event.preventDefault();
        return;
      }
    }

    onClick?.(event);
  }

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={handleClick}
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