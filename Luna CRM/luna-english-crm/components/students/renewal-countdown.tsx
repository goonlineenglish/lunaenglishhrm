"use client";

import { differenceInDays, parseISO } from "date-fns";

export function RenewalCountdown({ levelEndDate }: { levelEndDate: string | null }) {
  if (!levelEndDate) {
    return <span className="text-muted-foreground text-sm">--</span>;
  }

  const endDate = parseISO(levelEndDate);
  const today = new Date();
  const days = differenceInDays(endDate, today);

  if (days < 0) {
    return (
      <span className="text-sm font-medium text-red-600">
        Hết hạn {Math.abs(days)} ngày
      </span>
    );
  }

  let colorClass = "text-green-600";
  if (days <= 7) {
    colorClass = "text-red-600";
  } else if (days <= 14) {
    colorClass = "text-yellow-600";
  }

  return (
    <span className={`text-sm font-medium ${colorClass}`}>
      {days} ngày
    </span>
  );
}
