// components/SymptomsContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Symptom {
  symptom: string;
  severity?: number;
  duration?: string;
  location?: string;
  triggers?: string;
  timestamp: string;
  sessionId: string;
}

interface SymptomsContextType {
  symptoms: Symptom[];
  addSymptom: (symptom: Omit<Symptom, 'timestamp' | 'sessionId'>) => Promise<void>;
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  refreshSymptoms: () => Promise<void>;
}

const SymptomsContext = createContext<SymptomsContextType | undefined>(undefined);

interface SymptomsProviderProps {
  children: ReactNode;
}

export const SymptomsProvider: React.FC<SymptomsProviderProps> = ({ children }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Initialize or retrieve session ID
  useEffect(() => {
    // Check if there's an existing session ID in localStorage
    const savedSessionId = localStorage.getItem('physiotattva_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      // Fetch existing symptoms for this session only once at initialization
      fetchSymptoms(savedSessionId);
    } else {
      // We'll create a session ID when the first symptom is added
      const newSessionId = Math.random().toString(36).substring(2, 15);
      setSessionId(newSessionId);
      localStorage.setItem('physiotattva_session_id', newSessionId);
    }
  }, []);

  // Throttled fetch to avoid too many requests
  const fetchSymptoms = async (sid: string) => {
    // Avoid fetching too frequently
    const now = Date.now();
    if (now - lastFetch < 2000) { // Only fetch if more than 2 seconds have passed
      return;
    }
    
    setLastFetch(now);
    
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const response = await fetch(`/api/symptoms?sessionId=${sid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.symptoms) {
        setSymptoms(data.symptoms);
      }
    } catch (err) {
      console.error('Error fetching symptoms:', err);
      // Don't set error on the UI to avoid alarming users with many error messages
      // setError('Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };

  const refreshSymptoms = async () => {
    if (sessionId) {
      await fetchSymptoms(sessionId);
    }
  };

  const addSymptom = async (symptomData: Omit<Symptom, 'timestamp' | 'sessionId'>) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...symptomData,
          sessionId: sessionId,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // If this is the first symptom, save the session ID
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem('physiotattva_session_id', data.sessionId);
        }
        
        // Add the new symptom to the list directly without refreshing
        if (data.symptomRecord) {
          setSymptoms(prev => [...prev, data.symptomRecord]);
        }
      } else {
        setError(data.error || 'Failed to record symptom');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error adding symptom:', err);
    } finally {
      setLoading(false);
    }
  };

  // Store recorded symptoms in localStorage as a backup
  useEffect(() => {
    if (symptoms.length > 0 && sessionId) {
      localStorage.setItem(`symptoms_${sessionId}`, JSON.stringify(symptoms));
    }
  }, [symptoms, sessionId]);

  // Load from localStorage on initialization if API fails
  useEffect(() => {
    if (sessionId && symptoms.length === 0) {
      const savedSymptoms = localStorage.getItem(`symptoms_${sessionId}`);
      if (savedSymptoms) {
        try {
          const parsedSymptoms = JSON.parse(savedSymptoms);
          setSymptoms(parsedSymptoms);
        } catch (e) {
          console.error('Error parsing saved symptoms', e);
        }
      }
    }
  }, [sessionId, symptoms.length]);

  return (
    <SymptomsContext.Provider value={{ 
      symptoms, 
      addSymptom, 
      loading, 
      error, 
      sessionId,
      refreshSymptoms
    }}>
      {children}
    </SymptomsContext.Provider>
  );
};

// Custom hook for using the symptoms context
export const useSymptoms = () => {
  const context = useContext(SymptomsContext);
  if (context === undefined) {
    throw new Error('useSymptoms must be used within a SymptomsProvider');
  }
  return context;
};