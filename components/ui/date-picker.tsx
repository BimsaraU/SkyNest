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

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  disabled,
  placeholder = "Pick a date",
  className
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-[#10141c] border-gray-700 text-gray-300 hover:bg-[#181d28] hover:border-gray-600 hover:text-gray-200",
            !date && "text-gray-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-[#181d28] border-gray-700">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={disabled}
          initialFocus
          className="rounded-md bg-[#181d28] text-gray-300"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center text-gray-200",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-300 hover:bg-gray-700 rounded-md"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-800/50 [&:has([aria-selected])]:bg-gray-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-700 rounded-md text-gray-300"
            ),
            day_range_end: "day-range-end",
            day_selected: "bg-amber-500 text-black hover:bg-amber-600 hover:text-black focus:bg-amber-500 focus:text-black",
            day_today: "bg-gray-700 text-gray-200",
            day_outside: "day-outside text-gray-600 opacity-50 aria-selected:bg-gray-800/50 aria-selected:text-gray-500 aria-selected:opacity-30",
            day_disabled: "text-gray-600 opacity-50",
            day_range_middle: "aria-selected:bg-gray-800 aria-selected:text-gray-300",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
