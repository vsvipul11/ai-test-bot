// components/SymptomsDisplay.tsx
import React from 'react';
import { useSymptoms } from './SymptomsContext';
import { Loader2 } from 'lucide-react';

const SymptomsDisplay: React.FC = () => {
  const { symptoms, loading, error, refreshSymptoms } = useSymptoms();

  // Function to get color class based on severity
  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'bg-red-100 text-red-800';
    if (severity >= 5) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading symptoms...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error loading symptoms: {error}</p>
        <button 
          onClick={refreshSymptoms}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (symptoms.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No symptoms recorded yet.</p>
        <p className="text-sm">Describe your symptoms to Dr. Riya during the consultation.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {symptoms.map((symptom) => (
        <div key={symptom.id} className="p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900">{symptom.symptom}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(symptom.severity)}`}>
              Severity: {symptom.severity}/10
            </span>
          </div>
          
          {symptom.duration && (
            <div className="mt-1 text-sm text-gray-700">
              <span className="font-medium">Duration:</span> {symptom.duration}
            </div>
          )}
          
          {symptom.location && (
            <div className="mt-1 text-sm text-gray-700">
              <span className="font-medium">Location:</span> {symptom.location}
            </div>
          )}
          
          {symptom.triggers && (
            <div className="mt-1 text-sm text-gray-700">
              <span className="font-medium">Triggers:</span> {symptom.triggers}
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-500">
            Recorded: {new Date(symptom.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SymptomsDisplay;