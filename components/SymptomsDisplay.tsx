// components/SymptomsDisplay.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSymptoms } from './SymptomsContext';
import { AlertCircle, Activity, Clock, MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

const SymptomsDisplay = () => {
  const { symptoms, loading, error, refreshSymptoms } = useSymptoms();
  const [isExpanded, setIsExpanded] = useState(false);

  // Unlike the original component, we're not calling refreshSymptoms on mount
  // as that's now handled in the Session component and symptoms are only
  // updated when the assessment is complete

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6 text-gray-500">
        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm">Loading symptoms...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-start gap-2">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Error loading symptoms</p>
          <p className="text-sm text-red-400">{error}</p>
          <Button 
            onClick={refreshSymptoms}
            variant="outline"
            size="sm"
            className="mt-2 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (symptoms.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-3">
          <Activity className="h-6 w-6 text-blue-600" />
        </div>
        <p className="text-gray-600 mb-2">No symptoms recorded yet.</p>
        <p className="text-sm text-gray-500">Complete a symptom assessment with Dr. Riya to record symptoms.</p>
      </div>
    );
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to determine severity color
  const getSeverityColor = (severity) => {
    if (!severity) return 'bg-gray-100 text-gray-700';
    if (severity <= 3) return 'bg-green-100 text-green-800';
    if (severity <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Function to determine severity label
  const getSeverityLabel = (severity) => {
    if (!severity) return 'Not specified';
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    return 'Severe';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">{symptoms.length} symptoms recorded</span>
        <Button 
          onClick={refreshSymptoms}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:bg-blue-50 p-1 h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <ul className="divide-y divide-gray-100">
        {symptoms.slice(0, isExpanded ? undefined : 3).map((symptom, index) => (
          <li key={index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-900">{symptom.symptom}</h3>
                  {symptom.severity && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getSeverityColor(symptom.severity)}`}>
                      {getSeverityLabel(symptom.severity)} ({symptom.severity}/10)
                    </span>
                  )}
                </div>
                
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500">
                  {symptom.location && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>{symptom.location}</span>
                    </div>
                  )}
                  {symptom.duration && (
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>{symptom.duration}</span>
                    </div>
                  )}
                </div>
                
                {symptom.triggers && (
                  <div className="mt-1 text-xs text-gray-500">
                    <span className="font-medium">Triggers:</span> {symptom.triggers}
                  </div>
                )}
                
                <div className="mt-1 text-xs text-gray-400">
                  Recorded at {formatTimestamp(symptom.timestamp)}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {symptoms.length > 3 && (
        <div className="p-3 text-center border-t border-gray-100">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
          >
            {isExpanded ? 'Show Less' : `Show All (${symptoms.length})`}
            <ArrowRight className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SymptomsDisplay;
