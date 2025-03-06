"use client"; 

import { DailyTransport } from "@daily-co/realtime-ai-daily"; 
import { TooltipProvider } from "@radix-ui/react-tooltip"; 
import { useEffect, useRef, useState } from "react"; 
import { FunctionCallParams, LLMHelper, RTVIClient } from "realtime-ai"; 
import { RTVIClientAudio, RTVIClientProvider } from "realtime-ai-react"; 
import App from "@/components/App"; 
import { AppProvider } from "@/components/context"; 
import Header from "@/components/Header"; 
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

export default function Home() { 
  const [showSplash, setShowSplash] = useState(true); 
  const voiceClientRef = useRef(null); 
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Initialize or retrieve session ID on component mount
  useEffect(() => {
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
  }, []);
  
  useEffect(() => { 
    if (!showSplash || voiceClientRef.current || !sessionId) { 
      return; 
    } 
    
    try { 
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
      
      // Initialize LLM Helper with function calling for Meta Llama
      const llmHelper = voiceClient.registerHelper(
        "llm",
        new LLMHelper({
          callbacks: {}
        })
      ) as LLMHelper;
      
      // Handle function calls from Meta Llama
      llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
        console.log("Function call received:", fn.functionName, fn.arguments);
        
        // Handle symptom recording
        if (fn.functionName === "record_symptom") {
          const args = fn.arguments as any;
          try {
            // Call our symptoms API to store the symptom
            const response = await fetch('/api/symptoms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                symptom: args.symptom,
                severity: args.severity,
                duration: args.duration,
                location: args.location,
                triggers: args.triggers,
                sessionId: sessionId, // Use consistent session ID
              }),
            });
            
            const result = await response.json();
            console.log("Symptom recorded:", result);
            
            // Return the result to the LLM so it can continue the conversation
            return {
              success: true,
              symptom: args.symptom,
              recorded: true,
              message: `Successfully recorded symptom: ${args.symptom}`
            };
          } catch (error) {
            console.error('Error recording symptom:', error);
            return {
              success: false,
              error: 'Failed to record symptom'
            };
          }
        }
        
        // Handle appointment checking - DIRECT EXTERNAL API CALL
        if (fn.functionName === "check_appointment") {
          const args = fn.arguments as any;
          let phoneNumber = args.phone_number;
          
          console.log("Phone number from function call:", phoneNumber);
          
          // Use the test phone number if not provided or if it's a placeholder
          if (!phoneNumber || 
              phoneNumber === "patient_phone_number" || 
              phoneNumber === "patient's phone number") {
            phoneNumber = '9873219957';
          }
          
          try {
            // CALLING EXTERNAL API DIRECTLY
            const userId = '1'; // Default user ID
            const apiUrl = `https://api-dev.physiotattva247.com/follow-up-appointments/${encodeURIComponent(phoneNumber)}?user_id=${userId}`;
            
            console.log("Calling external API directly:", apiUrl);
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                // Add any required authentication headers here if needed
              },
              cache: 'no-store' // Disable caching
            });
            
            console.log("API response status:", response.status);
            
            // Only proceed if we get a successful response
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            // Parse the API response
            const data = await response.json();
            console.log("API response data:", data);
            
            // Format the appointment data for the LLM
            let formattedAppointments = [];
            
            // Check if data exists and has appointment
            if (data && data.success && data.appointment) {
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
              
              formattedAppointments.push({
                date: formattedDate,
                time: formattedTime,
                doctor: data.appointment.doctor,
                type: data.appointment.consultationType,
                campus: data.appointment.campus || "Online",
                status: data.appointment.status
              });
            }
            
            // Return the formatted appointments to the LLM
            return {
              success: true,
              phone_number: phoneNumber,
              has_appointments: formattedAppointments.length > 0,
              appointments: formattedAppointments,
              appointment_count: formattedAppointments.length,
              message: formattedAppointments.length > 0 
                ? `Found ${formattedAppointments.length} upcoming appointment for phone number ${phoneNumber}` 
                : `No upcoming appointments found for phone number ${phoneNumber}`
            };
          } catch (error) {
            console.error('Error calling external appointment API:', error);
            
            // Return error information without mock data
            return {
              success: false,
              phone_number: phoneNumber,
              has_appointments: false,
              appointments: [],
              appointment_count: 0,
              error: (error as Error).message,
              message: `Unable to retrieve appointments for ${phoneNumber}. Please try again later.`
            };
          }
        }

        // Handle slot fetching - DIRECT EXTERNAL API CALL
        if (fn.functionName === "fetch_slots") {
          const args = fn.arguments as any;
          console.log("Slot fetch arguments:", args);
          
          try {
            // Build query params from arguments
            const weekSelection = args.week_selection || "this week";
            const selectedDay = args.selected_day;
            const consultationType = args.consultation_type || "Online";
            const campusId = args.campus_id || "Indiranagar";
            const userId = '1'; // Default user ID
            
            // Validate required fields
            if (!selectedDay) {
              throw new Error("Day of the week is required");
            }
            
            // Convert day string to proper format (mon, tue, etc.)
            const day = selectedDay.toLowerCase().substring(0, 3);
            
            // CALLING EXTERNAL API DIRECTLY
            const apiUrl = `https://api-dev.physiotattva247.com/fetch-slots?week_selection=${encodeURIComponent(weekSelection)}&selected_day=${encodeURIComponent(day)}&consultation_type=${encodeURIComponent(consultationType)}&campus_id=${encodeURIComponent(campusId)}&user_id=${userId}`;
            
            console.log("Calling slots API directly:", apiUrl);
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              cache: 'no-store' // Disable caching
            });
            
            console.log("API response status:", response.status);
            
            // Only proceed if we get a successful response
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            // Parse the API response
            const data = await response.json();
            console.log("Slots API response data:", data);
            
            // Extract available slots
            const availableSlots = [];
            if (data && data.success && data.hourly_slots) {
              // Process hourly slots
              for (const [slotKey, availability] of Object.entries(data.hourly_slots)) {
                if (availability === "available") {
                  // Extract time range from slot key (e.g., "slot_available_9-10" -> "9-10")
                  const timeRange = slotKey.replace("slot_available_", "");
                  
                  // Format for better readability (e.g., "9-10" -> "9:00 AM - 10:00 AM")
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
            
            // Save the slot data to localStorage for booking reference
            localStorage.setItem('physiotattva_slot_data', JSON.stringify({
              date: data?.search_criteria?.date,
              consultation_type: consultationType,
              campus_id: campusId,
              week_selection: weekSelection,
              selected_day: selectedDay,
              available_slots: availableSlots
            }));
            
            // Return formatted slots to the LLM
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
          } catch (error) {
            console.error('Error fetching slots:', error);
            
            // Return error information
            return {
              success: false,
              error: (error as Error).message,
              message: `Unable to fetch available slots. Please try again or select a different day.`
            };
          }
        }
        
        // Handle appointment booking - DIRECT EXTERNAL API CALL
        if (fn.functionName === "book_appointment") {
          const args = fn.arguments as any;
          console.log("Booking appointment with arguments:", args);
          
          try {
            // Get saved slot data if available (for reference)
            const savedSlotData = localStorage.getItem('physiotattva_slot_data');
            let slotData = savedSlotData ? JSON.parse(savedSlotData) : null;
            
            // Required booking params
            const weekSelection = args.week_selection || (slotData?.week_selection || "this week");
            const selectedDay = args.selected_day || (slotData?.selected_day || "mon");
            const startTime = args.start_time;
            const consultationType = args.consultation_type || (slotData?.consultation_type || "Online");
            const campusId = args.campus_id || (slotData?.campus_id || "Indiranagar");
            const specialityId = args.speciality_id || "Physiotherapist";
            const patientName = args.patient_name;
            const mobileNumber = args.mobile_number;
            const paymentMode = args.payment_mode || "pay now";
            const userId = '1'; // Default user ID
            
            // Validate required fields
       // Validate required fields
            if (!selectedDay || !startTime || !consultationType || !patientName || !mobileNumber) {
              throw new Error("Missing required booking information");
            }
            
            // Book the appointment
            const apiUrl = `https://api-dev.physiotattva247.com/book-appointment`;
            
            console.log("Calling booking API directly:", apiUrl);
            
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
            
            console.log("Booking request body:", requestBody);
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              cache: 'no-store' // Disable caching
            });
            
            console.log("API response status:", response.status);
            
            // Only proceed if we get a successful response
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            // Parse the API response
            const data = await response.json();
            console.log("Booking API response data:", data);
            
            // Save the booking info for display
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
            
            // Format booking response for LLM
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
            
            // Dispatch custom event to update booking UI
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('appointment_booked', { 
                detail: bookingResponse
              }));
            }
          
            return bookingResponse;
          } catch (error) {
            console.error('Error booking appointment:', error);
            
            // Return error information
            return {
              success: false,
              error: (error as Error).message,
              message: `Unable to book the appointment. Please try again later.`
            };
          }
        }
      
        return null; // Return null for unhandled function calls
      });
    
      voiceClientRef.current = voiceClient;
      console.log("Voice client initialized with Meta Llama function calling");
    } catch (error) { 
      console.error("Error initializing voice client:", error); 
    } 
  }, [showSplash, sessionId]); 

  if (showSplash) { 
    return <Splash onComplete={() => setShowSplash(false)} />; 
  } 

  return ( 
    <RTVIClientProvider client={voiceClientRef.current}> 
      <RTVIClientAudio /> 
      <TooltipProvider> 
        <SymptomsProvider>
          <BookingProvider>
            <div className="flex flex-col min-h-svh"> 
              {/* <Header />  */}
              <main className="flex flex-1 flex-col items-center justify-center p-4 sm:px-6 md:px-8"> 
                <AppProvider> 
                  <App /> 
                </AppProvider> 
              </main> 
            </div> 
          </BookingProvider>
        </SymptomsProvider>
      </TooltipProvider> 
    </RTVIClientProvider> 
  ); 
}
