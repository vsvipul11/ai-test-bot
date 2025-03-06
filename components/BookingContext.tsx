// components/BookingContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the booking type
interface BookingDetails {
  doctor: string;
  date: string;
  startDateTime: string;
  consultationType: string;
  leadId: string;
  paymentMode: string;
  paymentUrl: string | null;
  referenceId: string | null;
  patientName: string;
  mobileNumber: string;
}

// Define the context type
interface BookingContextType {
  currentBooking: BookingDetails | null;
  showBookingDetails: boolean;
  setShowBookingDetails: (show: boolean) => void;
}

// Create the context
const BookingContext = createContext<BookingContextType>({
  currentBooking: null,
  showBookingDetails: false,
  setShowBookingDetails: () => {},
});

// Custom hook to use the booking context
export const useBooking = () => useContext(BookingContext);

// Provider component
export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBooking, setCurrentBooking] = useState<BookingDetails | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState<boolean>(false);

  // Load any existing booking on mount
  useEffect(() => {
    const savedBooking = localStorage.getItem('physiotattva_current_booking');
    if (savedBooking) {
      try {
        const bookingData = JSON.parse(savedBooking);
        setCurrentBooking(bookingData);
      } catch (err) {
        console.error('Error parsing saved booking data:', err);
      }
    }
  }, []);

  // Listen for new bookings
  useEffect(() => {
    const handleBookingCreated = (event: CustomEvent) => {
      if (event.detail && event.detail.success) {
        // Show the booking details notification
        setShowBookingDetails(true);
        
        // Update current booking if available in localStorage
        const savedBooking = localStorage.getItem('physiotattva_current_booking');
        if (savedBooking) {
          try {
            const bookingData = JSON.parse(savedBooking);
            setCurrentBooking(bookingData);
          } catch (err) {
            console.error('Error parsing saved booking data:', err);
          }
        }
      }
    };

    window.addEventListener('appointment_booked', handleBookingCreated as EventListener);
    
    return () => {
      window.removeEventListener('appointment_booked', handleBookingCreated as EventListener);
    };
  }, []);

  return (
    <BookingContext.Provider 
      value={{ 
        currentBooking, 
        showBookingDetails,
        setShowBookingDetails
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};