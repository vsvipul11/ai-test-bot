// components/AppointmentDisplay.tsx
"use client";

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, AlertCircle, RefreshCw, Video, Briefcase } from 'lucide-react';

interface Appointment {
  id?: number;
  date: string;
  time: string;
  doctor: string;
  type: string;
  campus: string;
  status: string;
}

interface AppointmentDisplayProps {
  phoneNumber?: string;
}

const AppointmentDisplay: React.FC<AppointmentDisplayProps> = ({ phoneNumber = '9873219957' }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = '1'; // Default user ID
      const apiUrl = `https://api-dev.physiotattva247.com/follow-up-appointments/${encodeURIComponent(phoneNumber)}?user_id=${userId}`;
      
      console.log("Fetching appointments from:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Appointment data:", data);
      
      if (data.success && data.appointment) {
        // Format datetime properly
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
        
        const formattedAppointment = {
          id: data.appointment.id,
          date: formattedDate,
          time: formattedTime,
          doctor: data.appointment.doctor,
          type: data.appointment.consultationType,
          campus: data.appointment.campus || "Online",
          status: data.appointment.status
        };
        
        setAppointments([formattedAppointment]);
      } else {
        // No appointments
        setAppointments([]);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError((err as Error).message || 'Failed to fetch appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [phoneNumber]);

  const getStatusColor = (status: string) => {
    status = status.toLowerCase();
    if (status === 'confirmed' || status === 'booked') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  const getAppointmentTypeIcon = (type: string) => {
    return type.toLowerCase().includes('online') ? 
      <Video className="h-3 w-3 mr-1 text-blue-500" /> : 
      <Briefcase className="h-3 w-3 mr-1 text-indigo-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6 text-gray-500">
        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Error loading appointments</p>
          <p className="text-sm text-red-400">{error}</p>
          <button 
            onClick={fetchAppointments}
            className="mt-2 text-sm px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
          <Calendar className="h-6 w-6 text-blue-600" />
        </div>
        <p className="text-gray-600 mb-2">No upcoming appointments</p>
        <p className="text-sm text-gray-500">You can book a consultation with Dr. Riya.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {appointments.map((appointment, index) => (
        <div key={index} className="p-4 hover:bg-gray-50 transition">
          <div className="mb-2 flex justify-between items-start">
            <div className="flex items-center">
              <div className="bg-blue-50 rounded-lg p-2 mr-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-900">Appointment with {appointment.doctor}</h3>
                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                  {getAppointmentTypeIcon(appointment.type)}
                  <span>{appointment.type} Consultation</span>
                </div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="flex items-center text-xs text-gray-600">
              <Clock className="h-3 w-3 mr-1.5 text-gray-400" />
              <span>
                <span className="font-medium">Date & Time:</span> {appointment.date}, {appointment.time}
              </span>
            </div>
            
            {appointment.campus && (
              <div className="flex items-center text-xs text-gray-600">
                <MapPin className="h-3 w-3 mr-1.5 text-gray-400" />
                <span>
                  <span className="font-medium">Location:</span> {appointment.campus}
                </span>
              </div>
            )}
          </div>
          
          {appointment.type.toLowerCase() === 'online' && (
            <div className="mt-3 bg-blue-50 text-blue-700 text-xs p-2 rounded flex items-center">
              <Video className="h-3 w-3 mr-1.5" />
              Join link will be sent to your registered mobile number
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AppointmentDisplay;