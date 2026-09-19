"use client";

import { useState } from "react";

type SharePicksButtonProps = {
  eventId: string;
  className?: string;
};

export default function SharePicksButton({
  eventId,
  className,
}: SharePicksButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleShare() {
    setIsSharing(true);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/picks-share-image?event=${eventId}`);

      if (!response.ok) {
        throw new Error("Could not generate the picks image.");
      }

      const blob = await response.blob();
      const file = new File([blob], "racepicks-picks.png", {
        type: "image/png",
      });

      // Mobile: opens the OS share sheet with the image attached —
      // Messages, Messenger, WhatsApp etc. all show up here directly.
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "My Racepicks picks",
          text: "Check out my picks for this round on Racepicks!",
        });
        return;
      }

      // Desktop fallback: copy the image so it can be pasted straight
      // into a chat window.
      if (navigator.clipboard && "ClipboardItem" in window) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setStatusMessage("Image copied — paste it into a message.");
        return;
      }

      // Last-resort fallback: just download it.
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "racepicks-picks.png";
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setStatusMessage("Image downloaded.");
    } catch (err) {
      // A user cancelling the native share sheet also lands here (it
      // throws an AbortError) — that's not a real failure, so don't
      // show an error message for it.
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      console.error("Share picks error:", err);
      setStatusMessage("Couldn't share right now — try again.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        className={
          className ??
          "rounded-full border border-orange-500 px-6 py-3 text-sm font-black uppercase text-orange-500 transition hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isSharing ? "Preparing…" : "Share Picks"}
      </button>

      {statusMessage && (
        <p className="mt-2 text-xs font-bold text-zinc-500">
          {statusMessage}
        </p>
      )}
    </div>
  );
}