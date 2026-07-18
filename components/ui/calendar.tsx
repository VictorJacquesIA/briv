"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/utils/cn";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        nav: "flex items-center justify-between",
        button_previous:
          "size-7 rounded-md border border-border bg-transparent p-0 text-foreground hover:bg-secondary disabled:opacity-30",
        button_next:
          "size-7 rounded-md border border-border bg-transparent p-0 text-foreground hover:bg-secondary disabled:opacity-30",
        month_caption: "flex items-center justify-center pb-2",
        caption_label: "text-sm font-medium",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-xs font-normal text-muted-foreground",
        week: "flex w-full",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "size-9 rounded-md text-sm font-normal text-foreground transition-colors hover:bg-secondary aria-selected:opacity-100",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover",
        today: "[&>button]:border [&>button]:border-primary/50",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30",
        range_start: "[&>button]:bg-primary [&>button]:text-primary-foreground",
        range_middle: "[&>button]:bg-secondary [&>button]:text-foreground",
        range_end: "[&>button]:bg-primary [&>button]:text-primary-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
