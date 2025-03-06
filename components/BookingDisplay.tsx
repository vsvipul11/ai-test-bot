// components/BookingDisplay.tsx
import React from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import { useBooking } from './BookingContext';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

const BookingDisplay: React.FC = () => {
  const { currentBooking, showBookingDetails, setShowBookingDetails } = useBooking();

  if (!showBookingDetails || !currentBooking) {
    return null;
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Alert className="mb-4 border-green-200 bg-green-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="ml-3">
            <AlertTitle className="text-green-800 font-medium">
              Appointment Confirmed!
            </AlertTitle>
            <AlertDescription className="mt-2 text-sm text-green-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium">Doctor:</p>
                  <p>{currentBooking.doctor}</p>
                </div>
                <div>
                  <p className="font-medium">Date & Time:</p>
                  <p>{formatDate(currentBooking.startDateTime)}</p>
                  <p>{formatTime(currentBooking.startDateTime)}</p>
                </div>
                <div>
                  <p className="font-medium">Consultation Type:</p>
                  <p>{currentBooking.consultationType}</p>
                </div>
                <div>
                  <p className="font-medium">Patient:</p>
                  <p>{currentBooking.patientName}</p>
                  <p>{currentBooking.mobileNumber}</p>
                </div>
              </div>
              
              {currentBooking.paymentMode === "pay now" && currentBooking.paymentUrl && (
                <div className="mt-3">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => window.open(currentBooking.paymentUrl, '_blank')}
                  >
                    Complete Payment
                  </Button>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={() => setShowBookingDetails(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default BookingDisplay;