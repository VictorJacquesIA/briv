"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils/cn";

const RANGE_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
] as const;

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") ?? "hoje";
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);
  const [open, setOpen] = useState(false);

  function applyRange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    params.delete("from");
    params.delete("to");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}` as never);
  }

  function applyCustom(range: DateRange | undefined) {
    setDraft(range);

    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", "custom");
      params.set("from", range.from.toISOString().slice(0, 10));
      params.set("to", range.to.toISOString().slice(0, 10));
      params.delete("page");
      router.push(`${pathname}?${params.toString()}` as never);
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={currentRange === option.value ? "default" : "outline"}
          onClick={() => applyRange(option.value)}
        >
          {option.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={currentRange === "custom" ? "default" : "outline"}
            className={cn("gap-2")}
          >
            <CalendarIcon className="size-4" aria-hidden="true" />
            Personalizado
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Calendar
            mode="range"
            selected={draft}
            onSelect={applyCustom}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
