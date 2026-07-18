"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export function DatePickerField({
  name,
  placeholder = "Selecione a data",
  className,
}: {
  name: string;
  placeholder?: string;
  className?: string;
}) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const isoValue = date ? date.toISOString().slice(0, 10) : "";

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name={name} value={isoValue} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarIcon className="size-4" aria-hidden="true" />
            {date ? (
              date.toLocaleDateString("pt-BR")
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selected) => {
              setDate(selected);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
