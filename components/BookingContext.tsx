// components/BookingContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BookingDetails {
  doctor: string;
  date: string;
  startDateTime: string;
  consultationType: string;
  leadId: string | number;
  paymentMode: string;
  paymentUrl?: string;
  referenceId?: string;
  patientName: string;
  mobileNumber: string;
}

interface BookingContextType {
  currentBooking: BookingDetails | null;
  loading: boolean;
  error: string | null;
  setCurrentBooking: (booking: BookingDetails) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ children }) => {
  const [currentBooking, setCurrentBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load any existing booking from localStorage on mount
  useEffect(() => {
    try {
      const savedBooking = localStorage.getItem('physiotattva_current_booking');
      if (savedBooking) {
        setCurrentBooking(JSON.parse(savedBooking));
      }
    } catch (error) {
      console.error('Error loading booking from localStorage:', error);
    }
  }, []);

  // Listen for appointment_booked events
  useEffect(() => {
    const handleBookingEvent = (event: CustomEvent) => {
      const bookingData = event.detail;
      if (bookingData && bookingData.success && bookingData.appointment_details) {
        const formattedBooking: BookingDetails = {
          doctor: bookingData.appointment_details.doctor,
          date: bookingData.appointment_details.date,
          startDateTime: bookingData.appointment_details.time,
          consultationType: bookingData.appointment_details.type,
          leadId: bookingData.appointment_details.id || 'unknown',
          paymentMode: bookingData.payment_details?.mode || 'unknown',
          paymentUrl: bookingData.payment_details?.url,
          referenceId: bookingData.payment_details?.reference,
          patientName: bookingData.appointment_details.patient,
          mobileNumber: bookingData.appointment_details.mobile
        };
        setCurrentBooking(formattedBooking);
      }
    };

    window.addEventListener('appointment_booked', handleBookingEvent as EventListener);
    return () => {
      window.removeEventListener('appointment_booked', handleBookingEvent as EventListener);
    };
  }, []);

  const clearBooking = () => {
    setCurrentBooking(null);
    localStorage.removeItem('physiotattva_current_booking');
  };

  const handleSetBooking = (booking: BookingDetails) => {
    setCurrentBooking(booking);
    localStorage.setItem('physiotattva_current_booking', JSON.stringify(booking));
  };

  return (
    <BookingContext.Provider value={{ 
      currentBooking, 
      loading, 
      error, 
      setCurrentBooking: handleSetBooking,
      clearBooking
    }}>
      {children}
    </BookingContext.Provider>
  );
};

// Custom hook for using the booking context
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};