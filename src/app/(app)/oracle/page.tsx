"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_LONG_SIDE_PX = 1500;
const MAX_4MB = 4 * 1024 * 1024;
const MAX_5MB = 5 * 1024 * 1024;
const JPEG_QUALITY_HIGH = 0.85;
const JPEG_QUALITY_FALLBACK = 0.7;

/** Approximate decoded byte size of the base64 payload in a data URL. */
function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Resize so longest side ≤ 1500px, export JPEG. If output still &gt; 4MB, retry at lower quality.
 */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const longSide = Math.max(width, height);
    const scale = longSide > MAX_LONG_SIDE_PX ? MAX_LONG_SIDE_PX / longSide : 1;
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    let dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY_HIGH);
    if (dataUrlByteLength(dataUrl) > MAX_4MB) {
      dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY_FALLBACK);
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

type IdentifyJson = {
  common_name: string;
  scientific_name: string | null;
  confidence: string;
  visual_notes: string;
};

type OracleSections = {
  plant_id: string;
  ecological_role: string;
  soil_message: string;
  traditional_uses: string;
  companion_notes: string;
};

export default function OraclePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identification, setIdentification] = useState<IdentifyJson | null>(
    null,
  );
  const [sections, setSections] = useState<OracleSections | null>(null);
  const [chunksUsed, setChunksUsed] = useState<number | null>(null);

  const revokePreview = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokePreview();
  }, [revokePreview]);

  const onFileChosen = useCallback(
    (file: File | null) => {
      setError(null);
      setSections(null);
      setIdentification(null);
      setChunksUsed(null);
      if (!file || !file.type.startsWith("image/")) {
        revokePreview();
        setPreviewUrl(null);
        setSelectedFile(null);
        return;
      }
      revokePreview();
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreviewUrl(url);
      setSelectedFile(file);
    },
    [revokePreview],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      onFileChosen(file ?? null);
    },
    [onFileChosen],
  );

  const askOracle = async () => {
    if (!selectedFile) {
      setError("Add a photo first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSections(null);
    setIdentification(null);
    setChunksUsed(null);
    try {
      const compressedDataUrl = await compressImage(selectedFile);
      if (dataUrlByteLength(compressedDataUrl) > MAX_5MB) {
        setError(
          "Image is still too large after compression (over 5MB). Try a smaller photo.",
        );
        return;
      }
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setSections(data.sections);
      setIdentification(data.identification ?? null);
      setChunksUsed(
        typeof data.libraryChunksUsed === "number"
          ? data.libraryChunksUsed
          : null,
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800">
          Plant Oracle
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Show the land a leaf or a flower — we&apos;ll seek a name and a little
          ecological story, grounded in your library when we can.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-stone-300 bg-amber-50/60 p-8 text-center transition hover:border-green-300 hover:bg-amber-50"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
        />
        <p className="text-stone-700">
          Drag and drop a photo here, or click to upload
        </p>
        <p className="mt-2 text-xs text-stone-500">
          JPG, PNG, or WebP — clear leaves or flowers help most
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:border-green-300 hover:bg-green-50/80"
        >
          Take photo
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onFileChosen(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={!selectedFile || loading}
          onClick={askOracle}
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-900 shadow-sm transition enabled:hover:border-green-300 enabled:hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Listening to the land…" : "Ask the Oracle"}
        </button>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Plant preview"
            className="max-h-80 w-full object-contain"
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-amber-50/80 p-6 text-center text-stone-600">
          <p className="text-sm font-medium">Consulting vision and library…</p>
          <p className="mt-1 text-xs text-stone-500">This may take a moment.</p>
        </div>
      ) : null}

      {sections && !loading ? (
        <div className="space-y-4">
          {identification ? (
            <p className="text-xs text-stone-500">
              Match confidence:{" "}
              <span className="font-medium text-stone-700">
                {identification.confidence}
              </span>
              {chunksUsed !== null ? (
                <>
                  {" "}
                  · Library passages used:{" "}
                  <span className="font-medium text-stone-700">
                    {chunksUsed}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}

          <section className="rounded-2xl border border-stone-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-green-800">
              Plant ID
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {sections.plant_id}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              Ecological role
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {sections.ecological_role}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              Soil message
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {sections.soil_message}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              Traditional uses
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {sections.traditional_uses}
            </p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-amber-50/80 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-green-800">
              Companion notes
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {sections.companion_notes}
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
