"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";

export interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
}

const PRESETS = [
  { label: "7 ngay", days: 7 },
  { label: "30 ngay", days: 30 },
  { label: "90 ngay", days: 90 },
] as const;

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  function handlePreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    onChange({ from, to });
  }

  function handleCalendarSelect(range: DayPickerRange | undefined) {
    if (range?.from && range?.to) {
      const from = new Date(range.from);
      const to = new Date(range.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      onChange({ from, to });
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((preset) => (
        <Button
          key={preset.days}
          variant="outline"
          size="sm"
          onClick={() => handlePreset(preset.days)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(value.from, "dd/MM/yy", { locale: vi })} -{" "}
            {format(value.to, "dd/MM/yy", { locale: vi })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
