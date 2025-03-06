// components/AppointmentDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, PhoneCall, Loader2 } from 'lucide-react';

interface AppointmentDisplayProps {
  phoneNumber: string;
}

interface AppointmentData {
  date: string;
  time: string;
  doctor: string;
  type: string;
  campus: string;
  status: string;
}

const AppointmentDisplay: React.FC<AppointmentDisplayProps> = ({ phoneNumber }) => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async (phone: string) => {
    if (!phone) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Default user ID
      const userId = '1';
      
      // Call the API
      const response = await fetch(`https://api-dev.physiotattva247.com/follow-up-appointments/${encodeURIComponent(phone)}?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format the appointment data
      const formattedAppointments: AppointmentData[] = [];
      
      if (data && data.success && data.appointment) {
        const startDate = new Date(data.appointment.startDateTime);
        const formattedDate = startDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = startDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        formattedAppointments.push({
          date: formattedDate,
          time: formattedTime,
          doctor: data.appointment.doctor,
          type: data.appointment.consultationType,
          campus: data.appointment.campus || "Online",
          status: data.appointment.status
        });
      }
      
      setAppointments(formattedAppointments);
      
      // For development/testing, if no appointments are available, use sample data
      if (formattedAppointments.length === 0 && process.env.NODE_ENV === 'development') {
        setAppointments([
          {
            date: 'Monday, March 18, 2025',
            time: '10:30 AM',
            doctor: 'Dr. Riya Sharma',
            type: 'Follow-up',
            campus: 'Online',
            status: 'Confirmed'
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    
      
      // For development, use sample data if API fails
      if (process.env.NODE_ENV === 'development') {
        setAppointments([
          {
            date: 'Monday, March 18, 2025',
            time: '10:30 AM',
            doctor: 'Dr. Riya Sharma',
            type: 'Follow-up',
            campus: 'Online',
            status: 'Confirmed'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch appointments when phone number changes
  useEffect(() => {
    fetchAppointments(phoneNumber);
  }, [phoneNumber]);

  // Listen for phone number updates
  useEffect(() => {
    const handlePhoneUpdate = (event: CustomEvent) => {
      if (event.detail) {
        fetchAppointments(event.detail);
      }
    };

    window.addEventListener('phone_number_updated', handlePhoneUpdate as EventListener);
    
    return () => {
      window.removeEventListener('phone_number_updated', handlePhoneUpdate as EventListener);
    };
  }, []);

  // Listen for appointment check events from function calls
  useEffect(() => {
    const handleAppointmentCheck = (event: CustomEvent) => {
      if (event.detail && event.detail.success) {
        if (event.detail.appointments && event.detail.appointments.length > 0) {
          setAppointments(event.detail.appointments);
        }
      }
    };

    window.addEventListener('appointment_check_completed', handleAppointmentCheck as EventListener);
    
    return () => {
      window.removeEventListener('appointment_check_completed', handleAppointmentCheck as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error loading appointments: {error}</p>
        <button 
          onClick={() => fetchAppointments(phoneNumber)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No upcoming appointments found.</p>
        <p className="text-sm">Talk to Dr. Riya to schedule an appointment.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {appointments.map((appointment, index) => (
        <div key={index} className="p-4 hover:bg-gray-50">
          <div className="font-medium text-gray-900 mb-2">{appointment.type} Appointment</div>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-blue-600 mr-2" />
              <span>{appointment.date}</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600 mr-2" />
              <span>{appointment.time}</span>
            </div>
            
            <div className="flex items-center">
              <User className="h-4 w-4 text-blue-600 mr-2" />
              <span>{appointment.doctor}</span>
            </div>
            
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-blue-600 mr-2" />
              <span>{appointment.campus}</span>
            </div>
            
            <div className="flex items-center">
              <PhoneCall className="h-4 w-4 text-blue-600 mr-2" />
              <span>{phoneNumber}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {appointment.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppointmentDisplay;