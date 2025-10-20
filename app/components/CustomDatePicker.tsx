// components/CustomDatePicker.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import gsap from 'gsap';

interface CustomDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(calendarRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
    }
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={pickerRef}>
       <style>{`
        .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
          background-color: #f59e0b !important; color: #10141c !important; font-weight: bold;
        }
        .rdp-day_today { font-weight: bold; color: #f59e0b !important; background-color: transparent !important; }
       `}</style>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="search-input w-full text-sm text-left border-none outline-none bg-transparent text-white flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? format(value, 'PPP') : placeholder || 'Select date'}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div ref={calendarRef} className="absolute top-full mt-2 w-auto bg-[#181d28] border border-gray-700 rounded-md shadow-lg z-10">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400"></div>
          <DayPicker
            numberOfMonths={1}
            mode="single"
            selected={value}
            onSelect={(date) => { onChange(date); setIsOpen(false); }}
            initialFocus
            classNames={{
              root: 'p-3', // Reduced padding for a more compact look
              month: 'font-l space-y-2',
              caption: 'flex justify-center items-center relative mb-2',
              caption_label: 'text-lg font-medium text-white',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-gray-400 rounded-md w-9 font-normal text-xs',
              row: 'flex w-full mt-2',
              cell: 'h-9 w-9 text-center text-sm p-0 relative',
              day: 'h-9 w-9 p-0 font-normal text-gray-300 hover:text-amber-400 rounded-xs',
              day_outside: 'text-gray-600 opacity-50',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;

