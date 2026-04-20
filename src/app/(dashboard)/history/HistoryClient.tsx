"use client";

import { useState } from "react";
import Link from "next/link";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MIN_YEAR = 2025;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface Props {
  entryDates: Set<string>;
}

export default function HistoryClient({ entryDates }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const today = todayISO();

  const currentYear = now.getFullYear();
  const years = Array.from(
    { length: currentYear - MIN_YEAR + 1 },
    (_, i) => MIN_YEAR + i
  );

  function prevMonth() {
    if (month === 0) {
      if (year <= MIN_YEAR) return;
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const totalDays = daysInMonth(year, month);
  const startDow = firstDayOfWeek(year, month);

  // Build calendar grid (leading empty slots + days)
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isPrevDisabled = year === MIN_YEAR && month === 0;
  const isNextDisabled = isCurrentMonth;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-medium text-navy">History</h2>
        <p className="font-sans text-sm text-ink-light mt-1">
          {entryDates.size} entries recorded
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            disabled={isPrevDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-ink/15 hover:border-ink/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-sans text-sm text-ink"
          >
            ‹
          </button>
          <h3 className="font-serif text-xl text-navy min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            disabled={isNextDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-ink/15 hover:border-ink/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-sans text-sm text-ink"
          >
            ›
          </button>
        </div>

        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            setYear(y);
            // Clamp month if switching to current year and month is in the future
            if (y === now.getFullYear() && month > now.getMonth()) {
              setMonth(now.getMonth());
            }
          }}
          className="font-sans text-sm bg-paper-dark border border-ink/15 rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:border-forest cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="border border-ink/10 rounded-xl overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-ink/8 bg-ink/3">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center font-sans text-xs text-ink-light font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-12 border-r border-b border-ink/6 last:border-r-0" />;
            }

            const iso = isoDate(year, month, day);
            const hasEntry = entryDates.has(iso);
            const isToday = iso === today;
            const isFuture = iso > today;

            return (
              <div
                key={iso}
                className={`h-12 border-r border-b border-ink/6 last-of-row:border-r-0 flex items-center justify-center relative ${
                  isFuture ? "opacity-30" : ""
                }`}
                style={{ borderRight: (idx + 1) % 7 === 0 ? "none" : undefined }}
              >
                {isFuture ? (
                  <span className="font-sans text-xs text-ink-light">{day}</span>
                ) : hasEntry ? (
                  <Link
                    href={`/entry?date=${iso}`}
                    className="flex flex-col items-center gap-0.5 group"
                    title={`View entry for ${iso}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs font-medium transition-all group-hover:scale-110 ${
                        isToday
                          ? "bg-navy text-paper"
                          : "bg-forest text-paper"
                      }`}
                    >
                      {day}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={`/entry?date=${iso}`}
                    className="flex flex-col items-center gap-0.5 group"
                    title={`Create entry for ${iso}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-sans text-xs transition-all group-hover:bg-ink/8 ${
                        isToday ? "border-2 border-navy text-navy font-medium" : "text-ink-light"
                      }`}
                    >
                      {day}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-forest" />
          <span className="font-sans text-xs text-ink-light">Entry logged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-ink/20" />
          <span className="font-sans text-xs text-ink-light">No entry</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-navy" />
          <span className="font-sans text-xs text-ink-light">Today</span>
        </div>
      </div>
    </div>
  );
}
