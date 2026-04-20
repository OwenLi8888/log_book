"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
}

interface Props {
  userId: string;
  selectedDate: string;
}

const MAX_FILES = 5;
const ACCEPTED = "image/*,video/*";

export default function MediaUpload({ userId, selectedDate }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Get or create entry_id for this date
      const { data: entry } = await supabase
        .from("entries")
        .select("id")
        .eq("user_id", userId)
        .eq("date", selectedDate)
        .maybeSingle();

      if (!entry) { setMedia([]); setLoading(false); return; }

      const { data } = await supabase
        .from("media")
        .select("id, file_url, file_type")
        .eq("user_id", userId)
        .eq("entry_id", entry.id)
        .order("uploaded_at");
      setMedia(data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_FILES - media.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_FILES} files per entry.`);
      return;
    }

    setError(null);
    setUploading(true);

    // Ensure entry exists
    const { data: entry } = await supabase
      .from("entries")
      .upsert(
        { user_id: userId, date: selectedDate },
        { onConflict: "user_id,date" }
      )
      .select("id")
      .single();

    if (!entry) { setUploading(false); setError("Could not create entry."); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    const uploaded: MediaItem[] = [];

    for (const file of toUpload) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${selectedDate}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lifelog-media")
        .upload(path, file, { upsert: false });

      if (upErr) { setError(`Upload failed: ${upErr.message}`); continue; }

      const { data: urlData } = supabase.storage
        .from("lifelog-media")
        .getPublicUrl(path);

      const { data: dbRow } = await supabase
        .from("media")
        .insert({
          user_id: userId,
          entry_id: entry.id,
          file_url: urlData.publicUrl,
          file_type: file.type,
        })
        .select("id, file_url, file_type")
        .single();

      if (dbRow) uploaded.push(dbRow);
    }

    setMedia((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function handleDelete(item: MediaItem) {
    // Extract path from URL
    const url = item.file_url;
    const bucketPath = url.split("/lifelog-media/")[1];
    if (bucketPath) {
      await supabase.storage.from("lifelog-media").remove([bucketPath]);
    }
    await supabase.from("media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  if (loading) return <div className="h-20 bg-ink/5 rounded-lg animate-pulse" />;

  return (
    <div>
      {media.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {media.map((item) => (
            <div key={item.id} className="relative group">
              {item.file_type.startsWith("video/") ? (
                <video
                  src={item.file_url}
                  className="w-24 h-24 object-cover rounded-lg border border-ink/10"
                  controls={false}
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.file_url}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg border border-ink/10"
                />
              )}
              <button
                onClick={() => handleDelete(item)}
                className="absolute top-1 right-1 w-5 h-5 bg-navy/70 text-paper rounded-full text-xs
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
              {item.file_type.startsWith("video/") && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-paper text-xl drop-shadow">▶</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="font-sans text-xs text-red-500 mb-3">{error}</p>
      )}

      {media.length < MAX_FILES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="font-sans text-sm text-forest hover:text-forest-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : `+ Add photos/videos (${media.length}/${MAX_FILES})`}
          </button>
        </>
      )}
    </div>
  );
}
