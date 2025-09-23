"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CalendarProps = {
  mode?: "single" | "range";
  selected?: Date | { from?: Date; to?: Date };
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void;
  className?: string;
  numberOfMonths?: number;
  defaultMonth?: Date;
  initialFocus?: boolean;
};

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  className,
  numberOfMonths = 1,
  defaultMonth = new Date(),
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(defaultMonth);
  const [rangeStart, setRangeStart] = React.useState<Date | undefined>(
    mode === "range" && typeof selected === "object" && selected && "from" in selected 
      ? selected.from 
      : undefined
  );
  const [rangeEnd, setRangeEnd] = React.useState<Date | undefined>(
    mode === "range" && typeof selected === "object" && selected && "to" in selected
      ? selected.to
      : undefined
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const handleDayClick = (date: Date) => {
    if (mode === "single") {
      onSelect?.(date);
    } else if (mode === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(date);
        setRangeEnd(undefined);
        onSelect?.({ from: date, to: undefined });
      } else {
        // Complete range
        if (date < rangeStart) {
          setRangeStart(date);
          setRangeEnd(rangeStart);
          onSelect?.({ from: date, to: rangeStart });
        } else {
          setRangeEnd(date);
          onSelect?.({ from: rangeStart, to: date });
        }
      }
    }
  };

  const isSelected = (date: Date) => {
    if (!date) return false;
    
    if (mode === "single" && selected instanceof Date) {
      return isSameDay(date, selected);
    } else if (mode === "range") {
      if (rangeStart && isSameDay(date, rangeStart)) return true;
      if (rangeEnd && isSameDay(date, rangeEnd)) return true;
      if (rangeStart && rangeEnd && date > rangeStart && date < rangeEnd) return true;
    }
    return false;
  };

  const isInRange = (date: Date) => {
    if (!date || mode !== "range" || !rangeStart || !rangeEnd) return false;
    return date > rangeStart && date < rangeEnd;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const monthYearString = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={cn("p-3", className)}>
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth("prev")}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{monthYearString}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth("next")}
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0">
          {getDaysInMonth(currentMonth).map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-9 w-9" />;
            }

            const selected = isSelected(date);
            const inRange = isInRange(date);
            const isToday = isSameDay(date, new Date());

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                className={cn(
                  "h-9 w-9 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  inRange && "bg-accent",
                  isToday && "border border-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Quick Select Buttons */}
        {mode === "range" && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date();
                weekAgo.setDate(today.getDate() - 7);
                setRangeStart(weekAgo);
                setRangeEnd(today);
                onSelect?.({ from: weekAgo, to: today });
              }}
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const monthAgo = new Date();
                monthAgo.setMonth(today.getMonth() - 1);
                setRangeStart(monthAgo);
                setRangeEnd(today);
                onSelect?.({ from: monthAgo, to: today });
              }}
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setRangeStart(startOfMonth);
                setRangeEnd(today);
                onSelect?.({ from: startOfMonth, to: today });
              }}
            >
              This Month
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}