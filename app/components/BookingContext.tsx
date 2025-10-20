// components/BookingContext.tsx
"use client";

import { create } from 'zustand';
import { DateRange } from 'react-day-picker';

export interface Room {
  adults: number;
  children: number;
  infants: number;
  roomType: string; // Added roomType
}

interface BookingState {
  destination: { id: string; name: string } | null;
  dates: DateRange | undefined;
  rooms: Room[];
  setDestination: (destination: { id: string; name: string } | null) => void;
  setDates: (dates: DateRange | undefined) => void;
  updateRoom: (index: number, newRoom: Partial<Room>) => void;
  addRoom: () => void;
  removeRoom: (index: number) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  destination: null,
  dates: undefined,
  rooms: [{ adults: 2, children: 0, infants: 0, roomType: 'deluxe' }], // Default room
  setDestination: (destination) => set({ destination }),
  setDates: (dates) => set({ dates }),
  updateRoom: (index, newRoom) => set((state) => {
    const rooms = [...state.rooms];
    if (rooms[index]) {
      rooms[index] = { ...rooms[index], ...newRoom };
    }
    return { rooms };
  }),
  addRoom: () => set((state) => ({
    rooms: [...state.rooms, { adults: 1, children: 0, infants: 0, roomType: 'deluxe' }]
  })),
  removeRoom: (index) => set((state) => ({
    rooms: state.rooms.filter((_, i) => i !== index)
  })),
}));

