"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

interface PhotoUploadProps {
  onPhotosChange: (urls: string[]) => void;
}

export default function PhotoUpload({ onPhotosChange }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const newPhotos = [...photos];

    for (const file of Array.from(files)) {
      if (newPhotos.length >= 6) break;

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = fileName;

      const { error } = await supabase.storage
        .from("observation-photos")
        .upload(filePath, file, { upsert: false });

      if (error) {
        console.error("Upload failed:", error.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("observation-photos")
        .getPublicUrl(filePath);

      newPhotos.push({ url: urlData.publicUrl, path: filePath });
    }

    setPhotos(newPhotos);
    onPhotosChange(newPhotos.map((p) => p.url));
    setUploading(false);

    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(index: number) {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotosChange(updated.map((p) => p.url));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">
        Photos
      </label>

      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {photos.map((photo, i) => (
            <div key={photo.path} className="relative group">
              <img
                src={photo.url}
                alt={`Observation photo ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-stone-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-stone-800 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < 6 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-600 transition disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Tap to attach photos"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      <p className="mt-1 text-xs text-stone-400">
        Up to 6 photos · jpg, png, webp, heic · 5MB max each
      </p>
    </div>
  );
}
