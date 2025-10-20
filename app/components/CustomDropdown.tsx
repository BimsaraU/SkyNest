// components/CustomDropdown.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import gsap from 'gsap';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  placeholder?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(listRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
    }
  }, [isOpen]);

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="search-input w-full text-sm text-left border-none outline-none bg-transparent text-white flex items-center justify-between"
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder || 'Select an option'}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-auto bg-[#181d28] border border-gray-700 rounded-sm shadow-lg z-10 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400"></div>
          <ul ref={listRef}>
            {options.map(option => (
              <li
                key={option.value}
                onClick={() => handleSelect(option)}
                className="relative px-6 py-3 text-sm text-gray-300 hover:text-amber-300 cursor-pointer transition-colors duration-200 group"
              >
                <span className="relative z-10">{option.label}</span>
                <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="absolute left-0 top-0 h-full w-[2px] bg-amber-400 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ease-in-out origin-center shadow-[0_0_10px_1px_#f59e0b]"></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;

