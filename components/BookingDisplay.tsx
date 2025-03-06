// components/BookingDisplay.tsx
"use client";

import { useEffect, useState } from 'react';
import { Calendar, Clock, User, MapPin, CreditCard, ExternalLink, X } from 'lucide-react';
import { useBooking } from './BookingContext';
import { Button } from './ui/button';

const BookingDisplay = () => {
  const { currentBooking, clearBooking } = useBooking();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show the component with animation when booking exists
    if (currentBooking) {
      setVisible(true);
    }
  }, [currentBooking]);

  if (!currentBooking || !visible) {
    return null;
  }

  // Format date nicely if it's in ISO format
  const formatDate = (dateString) => {
    try {
      if (dateString.includes('T') || dateString.includes('-')) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  const handleClose = () => {
    setVisible(false);
    // Wait for animation to finish before actually clearing the booking data
    setTimeout(() => {
      clearBooking();
    }, 300);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 animate-fadeIn">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <Calendar className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-800">Appointment Confirmed!</h3>
            <p className="text-sm text-green-700">Your appointment has been successfully booked</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-green-700 hover:bg-green-100 -mt-1 -mr-1"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-white rounded-md p-4 border border-green-100 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start">
            <User className="h-4 w-4 mt-0.5 mr-2 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Doctor</p>
              <p className="text-sm text-gray-700">{currentBooking.doctor}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Clock className="h-4 w-4 mt-0.5 mr-2 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Date & Time</p>
              <p className="text-sm text-gray-700">
                {formatDate(currentBooking.date)}, {currentBooking.startDateTime}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mt-0.5 mr-2 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Consultation Type</p>
              <p className="text-sm text-gray-700">{currentBooking.consultationType}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <User className="h-4 w-4 mt-0.5 mr-2 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Patient</p>
              <p className="text-sm text-gray-700">
                {currentBooking.patientName} | {currentBooking.mobileNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {currentBooking.paymentUrl && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
            <span className="text-sm text-blue-700">Complete your payment to confirm appointment</span>
          </div>
          <a 
            href={currentBooking.paymentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md flex items-center"
          >
            Pay Now <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
};

export default BookingDisplay;
