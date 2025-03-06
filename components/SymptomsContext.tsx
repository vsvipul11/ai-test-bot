// components/SymptomsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define the symptom type
interface Symptom {
  id: string;
  symptom: string;
  severity: number;
  duration: string;
  location: string;
  triggers: string;
  created_at: string;
}

// Define the context type
interface SymptomsContextType {
  symptoms: Symptom[];
  loading: boolean;
  error: string | null;
  refreshSymptoms: () => Promise<void>;
  addLocalSymptom: (symptomData: Partial<Symptom>) => void;
}

// Create the context
const SymptomsContext = createContext<SymptomsContextType>({
  symptoms: [],
  loading: false,
  error: null,
  refreshSymptoms: async () => {},
  addLocalSymptom: () => {},
});

// Custom hook to use the symptoms context
export const useSymptoms = () => useContext(SymptomsContext);

// Helper function to get default symptoms for development
const getDefaultSymptoms = (): Symptom[] => [
  {
    id: '1',
    symptom: 'Lower back pain',
    severity: 7,
    duration: '3 weeks',
    location: 'Lower back, radiating to left leg',
    triggers: 'Prolonged sitting, bending',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    symptom: 'Shoulder stiffness',
    severity: 5,
    duration: '2 months',
    location: 'Right shoulder',
    triggers: 'Overhead movements',
    created_at: new Date().toISOString(),
  },
];

// Provider component
export const SymptomsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Function to add a local symptom (no API call)
  const addLocalSymptom = useCallback((symptomData: Partial<Symptom>) => {
    const newSymptom: Symptom = {
      id: Date.now().toString(),
      symptom: symptomData.symptom || 'Unknown symptom',
      severity: symptomData.severity || 5,
      duration: symptomData.duration || 'Not specified',
      location: symptomData.location || 'Not specified',
      triggers: symptomData.triggers || 'Not specified',
      created_at: new Date().toISOString(),
    };
    
    setSymptoms(prev => [newSymptom, ...prev]);
    
    // Save to localStorage as a backup
    try {
      const storedSymptoms = localStorage.getItem('physiotattva_symptoms');
      const existingSymptoms = storedSymptoms ? JSON.parse(storedSymptoms) : [];
      localStorage.setItem('physiotattva_symptoms', JSON.stringify([newSymptom, ...existingSymptoms]));
    } catch (e) {
      console.error('Failed to save symptom to localStorage:', e);
    }
  }, []);

  // Function to fetch symptoms from the API
  const refreshSymptoms = useCallback(async () => {
    setLoading(true);
    try {
      // Get the session ID from localStorage
      const sessionId = localStorage.getItem('physiotattva_session_id');
      
      if (!sessionId) {
        console.warn('No session ID found for fetching symptoms');
        
        // Try to load symptoms from localStorage as fallback
        const storedSymptoms = localStorage.getItem('physiotattva_symptoms');
        if (storedSymptoms) {
          const parsedSymptoms = JSON.parse(storedSymptoms);
          setSymptoms(parsedSymptoms);
          setLoading(false);
          return;
        }
        
        // No localStorage data either, use development samples
        if (process.env.NODE_ENV === 'development') {
          setSymptoms(getDefaultSymptoms());
        } else {
          setSymptoms([]);
        }
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/symptoms?sessionId=${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.symptoms)) {
          // If no symptoms are available, check localStorage or use samples in dev
          if (data.symptoms.length === 0) {
            // Try to load from localStorage first
            const storedSymptoms = localStorage.getItem('physiotattva_symptoms');
            if (storedSymptoms) {
              const parsedSymptoms = JSON.parse(storedSymptoms);
              setSymptoms(parsedSymptoms);
            } else if (process.env.NODE_ENV === 'development') {
              // Use sample data in development
              setSymptoms(getDefaultSymptoms());
            } else {
              setSymptoms([]);
            }
          } else {
            setSymptoms(data.symptoms);
            
            // Also store in localStorage as backup
            localStorage.setItem('physiotattva_symptoms', JSON.stringify(data.symptoms));
          }
        }
      } catch (err) {
        console.error('Error fetching symptoms from API:', err);
        
        // Fallback to localStorage
        const storedSymptoms = localStorage.getItem('physiotattva_symptoms');
        if (storedSymptoms) {
          const parsedSymptoms = JSON.parse(storedSymptoms);
          setSymptoms(parsedSymptoms);
        } else if (process.env.NODE_ENV === 'development') {
          // Use sample data in development
          setSymptoms(getDefaultSymptoms());
        }
      }
    } catch (err) {
      console.error('Global error in refreshSymptoms:', err);
      setError((err as Error).message || 'Failed to fetch symptoms');
      
      // Fallback to development samples
      if (process.env.NODE_ENV === 'development') {
        setSymptoms(getDefaultSymptoms());
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Listen for symptom updates from function calls
  useEffect(() => {
    const handleSymptomRecorded = (event: CustomEvent) => {
      console.log("Symptom recorded event received:", event.detail);
      if (event.detail && event.detail.symptom) {
        // Add the symptom locally
        addLocalSymptom({
          symptom: event.detail.symptom,
          severity: event.detail.severity || 5,
          duration: event.detail.duration || 'Not specified',
          location: event.detail.location || 'Not specified',
          triggers: event.detail.triggers || 'Not specified',
        });
      }
    };

    window.addEventListener('symptom_recorded', handleSymptomRecorded as EventListener);
    
    return () => {
      window.removeEventListener('symptom_recorded', handleSymptomRecorded as EventListener);
    };
  }, [addLocalSymptom]);

  // Initial fetch on mount
  useEffect(() => {
    if (!initialized) {
      refreshSymptoms();
    }
  }, [refreshSymptoms, initialized]);

  return (
    <SymptomsContext.Provider value={{ symptoms, loading, error, refreshSymptoms, addLocalSymptom }}>
      {children}
    </SymptomsContext.Provider>
  );
};