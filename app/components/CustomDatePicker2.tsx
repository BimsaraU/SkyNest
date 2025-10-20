// components/CustomDatePicker2.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CustomDatePicker2Props {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
}

export default function CustomDatePicker2({ value, onChange, placeholder, minDate }: CustomDatePicker2Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const disabledDate = minDate || today

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-white/50 border-gray-300 hover:bg-white/70",
            !value && "text-gray-500"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
          {value ? (
            <span className="text-gray-900 font-medium">{format(value, "PPP")}</span>
          ) : (
            <span className="text-gray-500">{placeholder || "Pick a date"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => date < disabledDate}
          initialFocus
          className="rounded-md border shadow-lg"
          classNames={{
            day_selected: "bg-amber-600 text-white hover:bg-amber-700 hover:text-white focus:bg-amber-700 focus:text-white",
            day_today: "bg-amber-100 text-amber-900",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}


