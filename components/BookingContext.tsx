// components/BookingContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Booking {
  doctor: string;
  date: string;
  startDateTime: string;
  consultationType: string;
  patientName: string;
  mobileNumber: string;
  paymentUrl?: string;
  paymentMode?: string;
  leadId?: string;
  referenceId?: string;
}

interface BookingContextType {
  currentBooking: Booking | null;
  setCurrentBooking: (booking: Booking) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBooking, setCurrentBookingState] = useState<Booking | null>(null);

  // Load any existing booking from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedBooking = localStorage.getItem('physiotattva_current_booking');
    if (savedBooking) {
      try {
        const bookingData = JSON.parse(savedBooking);
        setCurrentBookingState(bookingData);
      } catch (err) {
        console.error('Error parsing saved booking:', err);
      }
    }
  }, []);

  // Set current booking - also saves to localStorage
  const setCurrentBooking = useCallback((booking: Booking) => {
    setCurrentBookingState(booking);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('physiotattva_current_booking', JSON.stringify(booking));
    }
  }, []);

  // Clear current booking - also removes from localStorage
  const clearBooking = useCallback(() => {
    setCurrentBookingState(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('physiotattva_current_booking');
    }
  }, []);

  // Listen for custom appointment_booked events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleBookingEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.success && event.detail.appointment_details) {
        const details = event.detail.appointment_details;
        const payment = event.detail.payment_details;
        
        setCurrentBooking({
          doctor: details.doctor,
          date: details.date,
          startDateTime: details.time,
          consultationType: details.type,
          patientName: details.patient,
          mobileNumber: details.mobile,
          paymentUrl: payment?.url,
          paymentMode: payment?.mode,
          referenceId: payment?.reference
        });
      }
    };
    
    window.addEventListener('appointment_booked', handleBookingEvent as EventListener);
    
    return () => {
      window.removeEventListener('appointment_booked', handleBookingEvent as EventListener);
    };
  }, [setCurrentBooking]);

  return (
    <BookingContext.Provider value={{ currentBooking, setCurrentBooking, clearBooking }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
