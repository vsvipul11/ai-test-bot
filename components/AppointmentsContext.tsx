// components/AppointmentsContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Appointment {
  id: number;
  startDateTime: string;
  endDateTime: string;
  doctor: string;
  consultationType: string;
  status: string;
  campus: string;
  patientName: string;
  callerName: string;
}

interface AppointmentsContextType {
  appointment: Appointment | null;
  loading: boolean;
  error: string | null;
  checkAppointment: (phoneNumber: string) => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

interface AppointmentsProviderProps {
  children: ReactNode;
}

export const AppointmentsProvider: React.FC<AppointmentsProviderProps> = ({ children }) => {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkAppointment = async (phoneNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/appointments?phoneNumber=${encodeURIComponent(phoneNumber)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch appointment');
      }
      
      if (data.success && data.appointment) {
        setAppointment(data.appointment);
      } else {
        setAppointment(null);
        setError('No appointments found');
      }
    } catch (err) {
      setAppointment(null);
      setError((err as Error).message || 'Error checking appointment');
      console.error('Error checking appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppointmentsContext.Provider value={{ 
      appointment, 
      loading, 
      error, 
      checkAppointment 
    }}>
      {children}
    </AppointmentsContext.Provider>
  );
};

// Custom hook for using the appointments context
export const useAppointments = () => {
  const context = useContext(AppointmentsContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentsProvider');
  }
  return context;
};