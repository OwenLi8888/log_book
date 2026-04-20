"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface MediaRow {
  id: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
  entry_id: string | null;
  entries: { date: string } | null;
}

interface Props {
  media: MediaRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function GalleryClient({ media }: Props) {
  const [lightbox, setLightbox] = useState<MediaRow | null>(null);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Build year/month options from media
  const { years, monthsByYear } = useMemo(() => {
    const yearSet = new Set<string>();
    const mByY: Record<string, Set<string>> = {};
    for (const item of media) {
      const d = new Date(item.uploaded_at);
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1).padStart(2, "0");
      yearSet.add(y);
      if (!mByY[y]) mByY[y] = new Set();
      mByY[y].add(m);
    }
    return { years: Array.from(yearSet).sort().reverse(), monthsByYear: mByY };
  }, [media]);

  const MONTH_NAMES: Record<string, string> = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December",
  };

  const availableMonths = filterYear !== "all"
    ? Array.from(monthsByYear[filterYear] ?? []).sort()
    : [];

  const filtered = useMemo(() => {
    return media.filter((item) => {
      const d = new Date(item.uploaded_at);
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1).padStart(2, "0");
      if (filterYear !== "all" && y !== filterYear) return false;
      if (filterMonth !== "all" && m !== filterMonth) return false;
      return true;
    });
  }, [media, filterYear, filterMonth]);

  function handleYearChange(y: string) {
    setFilterYear(y);
    setFilterMonth("all");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-navy">Gallery</h2>
          <p className="font-sans text-sm text-ink-light mt-1">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Filters */}
        {media.length > 0 && (
          <div className="flex items-center gap-3">
            <select
              value={filterYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="font-sans text-sm bg-paper-dark border border-ink/15 rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:border-forest cursor-pointer"
            >
              <option value="all">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {filterYear !== "all" && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="font-sans text-sm bg-paper-dark border border-ink/15 rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:border-forest cursor-pointer"
              >
                <option value="all">All months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{MONTH_NAMES[m]}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {media.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-serif text-2xl text-navy/40 mb-2">No photos yet</p>
          <p className="font-sans text-sm text-ink-light mb-6">
            Upload photos and videos in your daily entries to see them here.
          </p>
          <Link
            href="/entry"
            className="font-sans text-sm text-forest hover:underline"
          >
            Go to today&apos;s entry →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-xl text-navy/40">No items for this period</p>
        </div>
      ) : (
        /* Masonry grid using CSS columns */
        <div
          className="gap-3"
          style={{
            columnCount: 3,
            columnGap: "12px",
          }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid mb-3 relative group cursor-pointer rounded-xl overflow-hidden border border-ink/8 hover:border-ink/20 transition-all"
              onClick={() => setLightbox(item)}
            >
              {item.file_type.startsWith("video/") ? (
                <div className="aspect-video bg-navy/10 flex items-center justify-center">
                  <span className="text-4xl text-ink-light group-hover:scale-110 transition-transform">▶</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.file_url}
                  alt=""
                  className="w-full block group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/20 transition-all flex items-end p-3 opacity-0 group-hover:opacity-100">
                <span className="font-sans text-xs text-paper">
                  {formatDate(item.uploaded_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-navy/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 font-sans text-paper/70 hover:text-paper text-2xl leading-none"
            >
              ✕
            </button>

            {lightbox.file_type.startsWith("video/") ? (
              <video
                src={lightbox.file_url}
                controls
                className="w-full rounded-xl max-h-[75vh] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.file_url}
                alt=""
                className="w-full rounded-xl max-h-[75vh] object-contain"
              />
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="font-sans text-sm text-paper/70">
                {formatDate(lightbox.uploaded_at)}
              </p>
              {lightbox.entries?.date && (
                <Link
                  href={`/entry?date=${lightbox.entries.date}`}
                  onClick={() => setLightbox(null)}
                  className="font-sans text-sm text-paper/70 hover:text-paper transition-colors"
                >
                  View entry →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
