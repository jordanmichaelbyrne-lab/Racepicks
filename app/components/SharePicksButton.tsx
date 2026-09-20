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

    // Only a genuine failure to fetch the image itself counts as a
    // real error — every share METHOD below (native share, clipboard,
    // download) is tried independently, so one method misbehaving in
    // an embedded WebView (Capacitor's Android/iOS WebView is often
    // inconsistent here, unlike a real browser) falls through to the
    // next rather than failing the whole thing.
    let blob: Blob;

    try {
      const response = await fetch(`/api/picks-share-image?event=${eventId}`);

      if (!response.ok) {
        throw new Error("Could not generate the picks image.");
      }

      blob = await response.blob();
    } catch (err) {
      console.error("Share picks: image fetch failed:", err);
      setStatusMessage("Couldn't create the image — try again.");
      setIsSharing(false);
      return;
    }

    const file = new File([blob], "racepicks-picks.png", {
      type: "image/png",
    });

    // Tier 1: native share sheet (Messages, Messenger, WhatsApp, etc.)
    try {
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
        setIsSharing(false);
        return;
      }
    } catch (err) {
      // A user cancelling the native share sheet throws an AbortError
      // — that's not a failure, just don't fall through to the next
      // tier for that specific case.
      if (err instanceof DOMException && err.name === "AbortError") {
        setIsSharing(false);
        return;
      }

      console.error(
        "Share picks: native share failed, falling back:",
        err
      );
      // Any other error here — including this WebView simply not
      // supporting file sharing properly — falls through to tier 2.
    }

    // Tier 2: copy the image so it can be pasted into a chat (desktop
    // browsers mainly; many embedded WebViews don't support this).
    try {
      if (navigator.clipboard && "ClipboardItem" in window) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setStatusMessage("Image copied — paste it into a message.");
        setIsSharing(false);
        return;
      }
    } catch (err) {
      console.error(
        "Share picks: clipboard copy failed, falling back:",
        err
      );
      // Falls through to tier 3 regardless of why this failed.
    }

    // Tier 3: plain download — the most universally supported option,
    // works even in restrictive embedded WebViews.
    try {
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "racepicks-picks.png";
      link.click();
      URL.revokeObjectURL(downloadUrl);
      setStatusMessage("Image saved — find it in your downloads.");
    } catch (err) {
      console.error("Share picks: download fallback failed:", err);
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