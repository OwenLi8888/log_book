"use client";

import { useMemo } from "react";

interface Props {
  color: string;
  completedDates: Set<string>; // ISO date strings
}

export default function HabitGrid({ color, completedDates }: Props) {
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build 52 weeks × 7 days grid, ending on the Sunday of this week
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() + (7 - (today.getDay() || 7)));

    const startDate = new Date(endSunday);
    startDate.setDate(endSunday.getDate() - 52 * 7 + 1);

    const result: { date: string; completed: boolean; future: boolean }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endSunday) {
      const iso = cursor.toISOString().split("T")[0];
      result.push({
        date: iso,
        completed: completedDates.has(iso),
        future: cursor > today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [completedDates]);

  // Group by week columns
  const weeks = useMemo(() => {
    const w: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [cells]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={cell.date}
                className="w-[11px] h-[11px] rounded-[2px]"
                style={{
                  backgroundColor: cell.future
                    ? "transparent"
                    : cell.completed
                    ? color
                    : "rgba(74,64,53,0.1)",
                  border: cell.future ? "1px solid rgba(74,64,53,0.06)" : undefined,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
