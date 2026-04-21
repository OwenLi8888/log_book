"use client";

import { useMemo, useState } from "react";

interface Props {
  color: string;
  completedDates: Set<string>; // ISO date strings
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function HabitGrid({ color, completedDates }: Props) {
  const currentYear = new Date().getFullYear();

  // Years that have any habit data, plus current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    Array.from(completedDates).forEach((iso) => {
      years.add(parseInt(iso.slice(0, 4), 10));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [completedDates, currentYear]);

  const [year, setYear] = useState(currentYear);

  const minYear = availableYears[0];
  const maxYear = currentYear;

  function prevYear() {
    const idx = availableYears.indexOf(year);
    if (idx > 0) setYear(availableYears[idx - 1]);
  }

  function nextYear() {
    const idx = availableYears.indexOf(year);
    if (idx < availableYears.length - 1) setYear(availableYears[idx + 1]);
  }

  const isPrevDisabled = year <= minYear;
  const isNextDisabled = year >= maxYear;

  const { weeks } = useMemo(() => {
    const todayISO = isoDate(new Date());

    // Grid starts on the Monday of the week containing Jan 1
    const jan1 = new Date(year, 0, 1);
    const dow = jan1.getDay(); // 0=Sun … 6=Sat
    const daysBack = dow === 0 ? 6 : dow - 1; // steps back to Monday
    const gridStart = new Date(year, 0, 1 - daysBack);

    // Grid ends on the Sunday of the week containing Dec 31
    const dec31 = new Date(year, 11, 31);
    const dowDec31 = dec31.getDay();
    const daysForward = dowDec31 === 0 ? 0 : 7 - dowDec31;
    const gridEnd = new Date(year, 11, 31 + daysForward);

    const jan1ISO = `${year}-01-01`;
    const dec31ISO = `${year}-12-31`;

    const cells: { date: string; completed: boolean; inRange: boolean; future: boolean }[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      const iso = isoDate(cursor);
      cells.push({
        date: iso,
        completed: completedDates.has(iso),
        inRange: iso >= jan1ISO && iso <= dec31ISO,
        future: iso > todayISO,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Group into 7-day columns (Mon–Sun)
    const w: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }

    return { weeks: w };
  }, [year, completedDates]);

  return (
    <div>
      {/* Year selector */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={prevYear}
          disabled={isPrevDisabled}
          className="w-5 h-5 flex items-center justify-center rounded text-ink-light hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors font-sans text-xs leading-none"
          aria-label="Previous year"
        >
          ‹
        </button>
        <span className="font-sans text-xs text-ink-light w-8 text-center select-none">
          {year}
        </span>
        <button
          onClick={nextYear}
          disabled={isNextDisabled}
          className="w-5 h-5 flex items-center justify-center rounded text-ink-light hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors font-sans text-xs leading-none"
          aria-label="Next year"
        >
          ›
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => {
                const empty = !cell.inRange || cell.future;
                return (
                  <div
                    key={cell.date}
                    title={cell.inRange ? cell.date : undefined}
                    className="w-[11px] h-[11px] rounded-[2px]"
                    style={{
                      backgroundColor: empty
                        ? "transparent"
                        : cell.completed
                        ? color
                        : "rgba(74,64,53,0.1)",
                      border: empty ? "1px solid rgba(74,64,53,0.06)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
