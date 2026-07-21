"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type AvatarUploadProps = {
  userId: string;
  displayName: string;
  currentAvatarUrl: string | null;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AvatarUpload({
  userId,
  displayName,
  currentAvatarUrl,
}: AvatarUploadProps) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl
  );

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("Please choose an image smaller than 5MB.");
      return;
    }

    setIsUploading(true);

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${userId}/avatar.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Cache-bust the URL so the new photo shows immediately, rather
    // than a browser-cached copy of the old one at the same path.
    const bustedUrl = `${publicUrl}?updated=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: bustedUrl })
      .eq("id", userId);

    if (profileError) {
      setErrorMessage(profileError.message);
      setIsUploading(false);
      return;
    }

    setPreviewUrl(bustedUrl);
    setIsUploading(false);
    router.refresh();
  }

  function triggerFileSelect() {
    fileInputRef.current?.click();
  }

  const initials = getInitials(displayName) || "RP";

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={displayName}
            className="h-20 w-20 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black text-black">
            {initials}
          </div>
        )}
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={isUploading}
          className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-bold text-white transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Change Photo"}
        </button>

        <p className="mt-2 text-xs text-zinc-500">
          JPG, PNG or GIF. Max 5MB.
        </p>

        {errorMessage && (
          <p className="mt-2 text-xs font-bold text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}