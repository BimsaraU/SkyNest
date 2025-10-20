// components/BookingBar.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CustomDropdown from './CustomDropdown'; // Import the custom dropdown
import CustomDatePicker from './CustomDatePicker'; // Import the custom date picker

gsap.registerPlugin(ScrollTrigger);

export default function BookingBar() {
  // Updated state to work with custom components
  const [guests, setGuests] = useState<number>(1);
  const [branch, setBranch] = useState<string | undefined>(undefined);
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  
  const bookingBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A slight delay ensures all elements are rendered and measurable
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        // This timeline orchestrates the entire morphing animation
        const timeline = gsap.timeline({ paused: true })
          // Step 1: Animate the container's shape and color
          .to(".search-container", {
            borderRadius: 0, backdropFilter: 'blur(0px)', backgroundColor: '#10141c',
            borderWidth: '0px 0px 1px 0px', borderColor: '#374151',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            duration: 0.4, ease: 'sine.inOut'
          }, 0.3)
          // Also resize the wrappers to fit the navbar
          .to(".search-wrapper", { maxWidth: '100%', padding: 0, duration: 0.5, ease: 'sine.inOut' }, 0.3)
          .to(".search-content", { maxWidth: '1280px', margin: 'auto', padding: '0 1rem', duration: 0.5, ease: 'sine.inOut' }, 0.3)
          
          // Step 2 (Part A): Fade out the labels and inputs quickly at the start
          .to([".search-label", ".search-input", ".bbu"], { 
            opacity: 0, 
            y: -10, 
            duration: 0.3, // Faster fade-out
            ease: 'sine.inOut',
          }, 0)


          // Step 2 (Part B): Fade the inputs AND labels back in after a delay
          .to([".search-label", ".search-input", ".bbu"], { 
            opacity: 1, 
            y: 0,
            duration: 0.3,
            ease: 'sine.inOut',
          }, 0.8) // Start this animation at the 0.4s mark of the timeline

        // ScrollTrigger now uses toggleClass for React-friendly pinning
        ScrollTrigger.create({
          trigger: bookingBarRef.current,
          start: "top 81px", // Corrected to match navbar height (81px)
          end: 99999,
          toggleClass: { targets: bookingBarRef.current, className: "is-pinned" },
          onEnter: () => timeline.play(),
          onLeaveBack: () => timeline.reverse(),
        });

      }, bookingBarRef);

      return () => ctx.revert();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Formatted options for the CustomDropdown
  const branchOptions = [
    { value: 'colombo', label: 'Colombo' }, 
    { value: 'kandy', label: 'Kandy' }, 
    { value: 'galle', label: 'Galle' }
  ];

  const guestOptions = [1,2,3,4].map(num => ({
    value: num,
    label: `${num} Guest${num > 1 ? 's' : ''}`
  }));

  return (
    <>
      {/* This style tag defines the pinned state class */}
      <style>{`
        .is-pinned {
          position: sticky !important;
          top: 65px;
          margin-top: 0 !important;
        }
      `}</style>
      <div ref={bookingBarRef} className="relative w-full -mt-10 z-40">
        <div className="search-wrapper max-w-6xl px-6 mx-auto">
          <div className="search-container bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-4">
            <div className="search-content flex items-center gap-4">
              <div className="flex-1 group/input">
                <label className="font-l font-medium text-base search-label block mb-1 uppercase tracking-wide text-gray-200">Branch</label>
                <CustomDropdown
                  options={branchOptions}
                  value={branch}
                  onChange={(val) => setBranch(val as string)}
                  placeholder="Select a branch"
                />
              </div>
              <div className="w-px h-12 bg-gray-500/50"></div>
              <div className="flex-1">
                <label className="font-l font-medium text-base search-label block mb-1 uppercase tracking-wide text-gray-200">Check-in</label>
                <CustomDatePicker
                  value={checkIn}
                  onChange={setCheckIn}
                  placeholder="Select date"
                />
              </div>
              <div className="w-px h-12 bg-gray-500/50"></div>
              <div className="flex-1">
                <label className="font-l font-medium text-base search-label block mb-1 uppercase tracking-wide text-gray-200">Check-out</label>
                <CustomDatePicker
                  value={checkOut}
                  onChange={setCheckOut}
                  placeholder="Select date"
                />
              </div>
              <div className="w-px h-12 bg-gray-500/50"></div>
              <div className="flex-1 group/input">
                <label className="font-l font-medium text-base search-label block mb-1 uppercase tracking-wide text-gray-200">Guests</label>
                <CustomDropdown
                  options={guestOptions}
                  value={guests}
                  onChange={(val) => setGuests(val as number)}
                />
              </div>
              {/* Added 'border' class and corrected padding for a perfect pill shape */}
              <Link href="/guest/search-rooms" className="bbu border border-amber-400 hover:bg-amber-400 text-amber-400 hover:text-gray-800 px-10 py-3 rounded-full flex items-center transition font-bold">
                <span>BOOK</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

