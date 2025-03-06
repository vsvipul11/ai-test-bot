// components/SymptomsContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Symptom {
  symptom: string;
  severity?: number;
  duration?: string;
  location?: string;
  triggers?: string;
  timestamp: string;
}

interface SymptomsContextType {
  symptoms: Symptom[];
  loading: boolean;
  error: string | null;
  updateSymptoms: (newSymptoms: Symptom[]) => void;
  refreshSymptoms: () => void;
}

const SymptomsContext = createContext<SymptomsContextType | undefined>(undefined);

export const SymptomsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch symptoms from API
  const refreshSymptoms = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get session ID from local storage
      const sessionId = localStorage.getItem('physiotattva_session_id');
      
      if (!sessionId) {
        setSymptoms([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/symptoms?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch symptoms: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.symptoms)) {
        setSymptoms(data.symptoms);
      } else {
        setSymptoms([]);
      }
    } catch (err) {
      console.error("Error fetching symptoms:", err);
     setError((err as Error).message || 'Failed to fetch symptoms');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to update symptoms - used for bulk updates after assessment completes
  const updateSymptoms = useCallback(async (newSymptoms: Symptom[]) => {
    if (newSymptoms.length === 0) return;
    
    try {
      // Get session ID from local storage
      const sessionId = localStorage.getItem('physiotattva_session_id');
      
      if (!sessionId) return;
      
      // Save symptoms to backend in bulk
      const promises = newSymptoms.map(symptom => 
        fetch('/api/symptoms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...symptom,
            sessionId
          }),
        })
      );
      
      await Promise.all(promises);
      
      // Update local state with new symptoms
      setSymptoms(prevSymptoms => {
        const existingSymptomMap = new Map();
        prevSymptoms.forEach(s => existingSymptomMap.set(s.symptom, true));
        
        // Filter out duplicates
        const uniqueNewSymptoms = newSymptoms.filter(s => !existingSymptomMap.has(s.symptom));
        
        return [...prevSymptoms, ...uniqueNewSymptoms];
      });
    } catch (err) {
      console.error("Error updating symptoms:", err);
    }
  }, []);

  return (
    <SymptomsContext.Provider value={{ symptoms, loading, error, updateSymptoms, refreshSymptoms }}>
      {children}
    </SymptomsContext.Provider>
  );
};

export const useSymptoms = () => {
  const context = useContext(SymptomsContext);
  if (context === undefined) {
    throw new Error('useSymptoms must be used within a SymptomsProvider');
  }
  return context;
};
