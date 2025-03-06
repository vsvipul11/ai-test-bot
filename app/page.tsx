"use client"; 

import { DailyTransport } from "@daily-co/realtime-ai-daily"; 
import { useEffect, useRef, useState } from "react"; 
import { FunctionCallParams, LLMHelper, RTVIClient } from "realtime-ai"; 
import { RTVIClientAudio, RTVIClientProvider } from "realtime-ai-react"; 
import App from "@/components/App"; 
import { AppProvider } from "@/components/context"; 
import Splash from "@/components/Splash";
import { SymptomsProvider } from "@/components/SymptomsContext";
import { BookingProvider } from "@/components/BookingContext";
import { 
  BOT_READY_TIMEOUT, 
  defaultBotProfile, 
  defaultConfig, 
  defaultMaxDuration, 
  defaultServices, 
  endpoints 
} from "@/rtvi.config"; 

// Import Radix UI components directly
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export default function Home(): React.ReactNode { 
  const [showSplash, setShowSplash] = useState<boolean>(true); 
  const [processingFunction, setProcessingFunction] = useState<boolean>(false);
  const voiceClientRef = useRef<any>(null); 
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
  // Initialize or retrieve session ID on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    // Check if there's an existing session ID in localStorage
    const savedSessionId = localStorage.getItem('physiotattva_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    } else {
      // Create a new session ID
      const newSessionId = Math.random().toString(36).substring(2, 15);
      setSessionId(newSessionId);
      localStorage.setItem('physiotattva_session_id', newSessionId);
    }
    
    // Set loaded state to prevent flickering
    setIsLoaded(true);
  }, []);
  
  useEffect(() => { 
    if (!showSplash || voiceClientRef.current || !sessionId) { 
      return; 
    } 
    
    try { 
      // Create RTVIClient - using your project's imports
      const voiceClient = new RTVIClient({ 
        transport: new DailyTransport(), 
        params: { 
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "/api", 
          endpoints: endpoints, 
          requestData: { 
            services: defaultServices, 
            config: defaultConfig, 
            bot_profile: defaultBotProfile, 
            max_duration: defaultMaxDuration,
          }, 
        }, 
        timeout: BOT_READY_TIMEOUT, 
        enableMic: true, 
        enableCam: false, 
      }); 
      
      voiceClient.on("botReady", () => { 
        console.log("Bot is ready!"); 
      }); 
      
      voiceClient.on("error", (error) => { 
        console.error("Voice client error:", error); 
      }); 
      
      // Initialize LLM Helper with function calling for Anthropic
      const llmHelper = voiceClient.registerHelper(
        "llm",
        new LLMHelper({
          callbacks: {
            // Add this callback to track when function is being called
            onLLMFunctionCall: (fn) => {
              setProcessingFunction(true);
              console.log("Function being called:", fn.functionName);
            }
          }
        })
      );
      
      // Handle function calls
      llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
        console.log("Function call received:", fn.functionName, fn.arguments);
        const args = fn.arguments as any;

        try {
          // Handle symptom recording
          if (fn.functionName === "record_symptom") {
            console.log("Recording symptom:", args);
            
            // Default values for missing optional fields
            const severity = args.severity || 5; // Default severity if not provided
            const duration = args.duration || "Not specified";
            const location = args.location || "Not specified";
            const triggers = args.triggers || "Not specified";
            
            // Call our symptoms API to store the symptom
            try {
              const response = await fetch('/api/symptoms', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  symptom: args.symptom,
                  severity,
                  duration,
                  location,
                  triggers,
                  sessionId: sessionId,
                }),
              });
              
              if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
              }
              
              const result = await response.json();
              console.log("Symptom recorded successfully:", result);
              
              // Ensure we explicitly dispatch the event
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('symptom_recorded', { 
                  detail: {
                    success: true,
                    symptom: args.symptom,
                    severity,
                    duration,
                    location,
                    triggers
                  }
                }));
              }
            } catch (error) {
              console.error("Error recording symptom:", error);
              
              // Fallback - create a mock symptom in localStorage if API fails
              const existingSymptoms = localStorage.getItem('physiotattva_symptoms');
              const symptoms = existingSymptoms ? JSON.parse(existingSymptoms) : [];
              
              symptoms.push({
                id: Date.now().toString(),
                symptom: args.symptom,
                severity,
                duration,
                location,
                triggers,
                created_at: new Date().toISOString()
              });
              
              localStorage.setItem('physiotattva_symptoms', JSON.stringify(symptoms));
              
              // Still dispatch the event so UI updates
              window.dispatchEvent(new CustomEvent('symptom_recorded', { 
                detail: {
                  success: true,
                  symptom: args.symptom,
                  severity,
                  duration,
                  location,
                  triggers
                }
              }));
            }
            
            setProcessingFunction(false);
            return {
              success: true,
              symptom: args.symptom,
              recorded: true,
              message: `Successfully recorded symptom: ${args.symptom}`
            };
          }
          
          // Handle consultation type setting
          if (fn.functionName === "set_consultation_type") {
            const consultationType = args.type;
            
            // Dispatch a custom event with the consultation type
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('consultation_type_change', { 
                detail: consultationType
              }));
            }
            
            setProcessingFunction(false);
            return {
              success: true,
              consultation_type: consultationType,
              message: `Consultation type set to ${consultationType}`
            };
          }
          
          // Handle appointment checking
          if (fn.functionName === "check_appointment") {
            let phoneNumber = args.phone_number;
            
            if (!phoneNumber || 
                phoneNumber === "patient_phone_number" || 
                phoneNumber === "patient's phone number") {
              // Try to get from localStorage first
              const savedPhone = localStorage.getItem('patient_phone_number');
              phoneNumber = savedPhone || '9873219957';
            }
            
            // CALLING EXTERNAL API
            const userId = '1'; // Default user ID
            const apiUrl = `https://api-dev.physiotattva247.com/follow-up-appointments/${encodeURIComponent(phoneNumber)}?user_id=${userId}`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              cache: 'no-store' 
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Format the appointment data
            let formattedAppointments = [];
            
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
            
            // Dispatch a custom event with the appointment data
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('appointment_check_completed', { 
                detail: {
                  success: true,
                  has_appointments: formattedAppointments.length > 0,
                  appointments: formattedAppointments,
                  appointment_count: formattedAppointments.length
                }
              }));
            }
            
            setProcessingFunction(false);
            return {
              success: true,
              has_appointments: formattedAppointments.length > 0,
              appointments: formattedAppointments,
              appointment_count: formattedAppointments.length,
              message: formattedAppointments.length > 0 
                ? `Found ${formattedAppointments.length} upcoming appointment for phone number ${phoneNumber}` 
                : `No upcoming appointments found for phone number ${phoneNumber}`
            };
          }

          // Handle slot fetching
          if (fn.functionName === "fetch_slots") {
            const weekSelection = args.week_selection || "this week";
            const selectedDay = args.selected_day;
            const consultationType = args.consultation_type || "Online";
            const campusId = args.campus_id || "Indiranagar";
            const userId = '1';
            
            if (!selectedDay) {
              throw new Error("Day of the week is required");
            }
            
            const day = selectedDay.toLowerCase().substring(0, 3);
            
            const apiUrl = `https://api-dev.physiotattva247.com/fetch-slots?week_selection=${encodeURIComponent(weekSelection)}&selected_day=${encodeURIComponent(day)}&consultation_type=${encodeURIComponent(consultationType)}&campus_id=${encodeURIComponent(campusId)}&user_id=${userId}`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              cache: 'no-store'
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extract available slots
            const availableSlots = [];
            if (data && data.success && data.hourly_slots) {
              for (const [slotKey, availability] of Object.entries(data.hourly_slots)) {
                if (availability === "available") {
                  const timeRange = slotKey.replace("slot_available_", "");
                  
                  const [startHour, endHour] = timeRange.split('-').map(Number);
                  const formattedSlot = {
                    timeRange,
                    start_time: `${startHour}:00 ${startHour >= 12 ? 'PM' : 'AM'}`,
                    formatted: `${startHour > 12 ? startHour - 12 : startHour}:00 ${startHour >= 12 ? 'PM' : 'AM'} - ${endHour > 12 ? endHour - 12 : endHour}:00 ${endHour >= 12 ? 'PM' : 'AM'}`
                  };
                  
                  availableSlots.push(formattedSlot);
                }
              }
            }
            
            localStorage.setItem('physiotattva_slot_data', JSON.stringify({
              date: data?.search_criteria?.date,
              consultation_type: consultationType,
              campus_id: campusId,
              week_selection: weekSelection,
              selected_day: selectedDay,
              available_slots: availableSlots
            }));
            
            // Dispatch a custom event with the slot data
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('fetch_slots_completed', { 
                detail: {
                  success: true,
                  date: data?.search_criteria?.date,
                  available_slots: availableSlots,
                  total_available: availableSlots.length,
                  consultation_type: consultationType,
                  campus: campusId
                }
              }));
            }
            
            setProcessingFunction(false);
            return {
              success: true,
              date: data?.search_criteria?.date,
              available_slots: availableSlots,
              total_available: availableSlots.length,
              consultation_type: consultationType,
              campus: campusId,
              message: availableSlots.length > 0
                ? `Found ${availableSlots.length} available slots for ${data?.search_criteria?.date} at ${campusId}`
                : `No available slots found for ${data?.search_criteria?.date} at ${campusId}`
            };
          }
          
          // Handle appointment booking
          if (fn.functionName === "book_appointment") {
            const savedSlotData = localStorage.getItem('physiotattva_slot_data');
            let slotData = savedSlotData ? JSON.parse(savedSlotData) : null;
            
            // Required booking params
            const weekSelection = args.week_selection || (slotData?.week_selection || "this week");
            const selectedDay = args.selected_day || (slotData?.selected_day || "mon");
            const startTime = args.start_time;
            const consultationType = args.consultation_type || (slotData?.consultation_type || "Online");
            const campusId = args.campus_id || (slotData?.campus_id || "Indiranagar");
            const specialityId = args.speciality_id || "Physiotherapist";
            
            // Try to get patient name and mobile number from args or localStorage
            let patientName = args.patient_name;
            let mobileNumber = args.mobile_number;
            
            if (!mobileNumber) {
              const storedNumber = localStorage.getItem('patient_phone_number');
              if (storedNumber) {
                mobileNumber = storedNumber;
              }
            }
            
            const paymentMode = args.payment_mode || "pay now";
            const userId = '1';
            
            if (!selectedDay || !startTime || !consultationType || !patientName || !mobileNumber) {
              throw new Error("Missing required booking information");
            }
            
            const apiUrl = `https://api-dev.physiotattva247.com/book-appointment`;
            
            const requestBody = {
              week_selection: weekSelection,
              selected_day: selectedDay.toLowerCase().substring(0, 3),
              start_time: startTime,
              consultation_type: consultationType,
              campus_id: campusId,
              speciality_id: specialityId,
              user_id: userId,
              patient_name: patientName,
              mobile_number: mobileNumber,
              payment_mode: paymentMode
            };
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              cache: 'no-store'
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.appointmentInfo) {
              localStorage.setItem('physiotattva_current_booking', JSON.stringify({
                doctor: data.appointmentInfo.appointed_doctor,
                date: data.appointmentInfo.calculated_date,
                startDateTime: data.appointmentInfo.startDateTime,
                consultationType: data.appointmentInfo.consultation_type,
                leadId: data.appointmentInfo.lead_id,
                paymentMode: data.appointmentInfo.payment_mode,
                paymentUrl: data.payment?.short_url,
                referenceId: data.payment?.reference_id,
                patientName: patientName,
                mobileNumber: mobileNumber
              }));
            }
            
            const bookingResponse = {
              success: data.success,
              appointment_details: {
                doctor: data.appointmentInfo?.appointed_doctor,
                date: data.appointmentInfo?.calculated_date,
                time: new Date(data.appointmentInfo?.startDateTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }),
                type: data.appointmentInfo?.consultation_type,
                campus: campusId,
                patient: patientName,
                mobile: mobileNumber
              },
              payment_details: {
                mode: data.appointmentInfo?.payment_mode,
                url: data.payment?.short_url,
                reference: data.payment?.reference_id
              },
              message: data.success 
                ? `Appointment successfully booked with ${data.appointmentInfo?.appointed_doctor} on ${data.appointmentInfo?.calculated_date}.`
                : `Unable to book appointment. Please try again later.`
            };
            
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('appointment_booked', { 
                detail: bookingResponse
              }));
            }
          
            setProcessingFunction(false);
            return bookingResponse;
          }
        } catch (error: any) {
          console.error('Error handling function call:', error);
          setProcessingFunction(false);
          return {
            success: false,
            error: error.message,
            message: `Error: ${error.message}`
          };
        }
        
        setProcessingFunction(false);
        return null; // Return null for unhandled function calls
      });
    
      voiceClientRef.current = voiceClient;
      console.log("Voice client initialized with function calling");
    } catch (error) { 
      console.error("Error initializing voice client:", error); 
    } 
  }, [showSplash, sessionId]); 

  if (showSplash) { 
    return <Splash onComplete={() => setShowSplash(false)} />; 
  } 
  
  // Prevent flickering by waiting until loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {/* Optional loading indicator */}
      </div>
    );
  }

  // Use the TooltipProvider directly from the primitive
  return ( 
    <TooltipPrimitive.Provider>
      <RTVIClientProvider client={voiceClientRef.current}> 
        <RTVIClientAudio /> 
        <SymptomsProvider>
          <BookingProvider>
            <div className="flex flex-col min-h-svh"> 
              <main className="flex flex-1 flex-col items-center justify-center p-4 sm:px-6 md:px-8"> 
                <AppProvider> 
                  <App /> 
                </AppProvider> 
              </main> 
            </div> 
          </BookingProvider>
        </SymptomsProvider>
      </RTVIClientProvider>
    </TooltipPrimitive.Provider>
  ); 
}