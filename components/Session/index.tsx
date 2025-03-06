// components/Session.tsx
import { Clipboard, HeartPulse, Loader2, LogOut, MessageCircle, Settings, StopCircle, Calendar, Activity, Mic, MicOff } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PipecatMetricsData,
  RTVIClientConfigOption,
  RTVIEvent,
  RTVIMessage,
  TransportState,
} from "realtime-ai";
import { useRTVIClient, useRTVIClientEvent } from "realtime-ai-react";

import StatsAggregator from "../../utils/stats_aggregator";
import { Configure } from "../Setup";
import { Button } from "../ui/button";
import * as Card from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SymptomsDisplay from "../SymptomsDisplay";
import AppointmentDisplay from "../AppointmentDisplay";
import { useSymptoms } from "../SymptomsContext";
import BookingDisplay from "../BookingDisplay";
import AvailableSlotsPopup from "../AvailableSlotsPopup";

import Agent from "./Agent";
import Stats from "./Stats";

let stats_aggregator: StatsAggregator;

interface SessionProps {
  state: TransportState;
  onLeave: () => void;
  openMic?: boolean;
  startAudioOff?: boolean;
}

export const Session = React.memo(
  ({ state, onLeave, startAudioOff = false }: SessionProps) => {
    const voiceClient = useRTVIClient()!;
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const [showConfig, setShowConfig] = useState<boolean>(false);
    const [showStats, setShowStats] = useState<boolean>(false);
    const [muted, setMuted] = useState(startAudioOff);
    const [activeTab, setActiveTab] = useState<'actions' | 'symptoms' | 'appointments'>('symptoms');
    const { refreshSymptoms, updateSymptoms } = useSymptoms();
    
    // New state for function calls display
    const [functionCalls, setFunctionCalls] = useState([]);
    const [pendingSymptoms, setPendingSymptoms] = useState([]);
    const [showSlots, setShowSlots] = useState(false);
    const [slots, setSlots] = useState([]);
    const [slotDetails, setSlotDetails] = useState({});
    const [processingMsg, setProcessingMsg] = useState("");

    const modalRef = useRef<HTMLDialogElement>(null);

    // ---- Voice Client Events
    useRTVIClientEvent(
      RTVIEvent.Metrics,
      useCallback((metrics: PipecatMetricsData) => {
        metrics?.ttfb?.map((m: { processor: string; value: number }) => {
          stats_aggregator.addStat([m.processor, "ttfb", m.value, Date.now()]);
        });
      }, [])
    );

    useRTVIClientEvent(
      RTVIEvent.BotStoppedSpeaking,
      useCallback(() => {
        if (hasStarted) return;
        setHasStarted(true);
      }, [hasStarted])
    );

    useRTVIClientEvent(
      RTVIEvent.UserStoppedSpeaking,
      useCallback(() => {
        if (hasStarted) return;
        setHasStarted(true);
      }, [hasStarted])
    );

    // Listen for function calls from the bot
    useRTVIClientEvent(RTVIEvent.LLMFunctionCall, (message) => {
      const functionCall = message.data;
      if (functionCall) {
        setFunctionCalls(prev => [...prev, {
          id: Date.now(),
          timestamp: new Date(),
          ...functionCall
        }]);
        
        // Set processing message to let user know what's happening
        setProcessingMsg(`Processing: ${functionCall.functionName.replace(/_/g, ' ')}`);
        
        // Handle specific function calls
        if (functionCall.functionName === "record_symptom") {
          const symptomData = functionCall.arguments;
          if (symptomData) {
            setPendingSymptoms(prev => [...prev, {
              symptom: symptomData.symptom,
              severity: symptomData.severity,
              duration: symptomData.duration,
              location: symptomData.location,
              triggers: symptomData.triggers,
              timestamp: new Date().toISOString()
            }]);
          }
        } else if (functionCall.functionName === "fetch_slots") {
          // Will be populated when the function returns
        }
      }
    });

    // Listen for function call results
    useRTVIClientEvent(RTVIEvent.LLMFunctionCallResult, (message) => {
      const result = message.data;
      setProcessingMsg("");
      
      if (result && result.functionName) {
        // Update the function call with its result
        setFunctionCalls(prev => prev.map(fc => 
          fc.functionName === result.functionName ? {...fc, result: result.result} : fc
        ));
        
        // Handle specific function results
        if (result.functionName === "fetch_slots" && result.result && result.result.available_slots) {
          setSlots(result.result.available_slots);
          setSlotDetails({
            date: result.result.date,
            consultationType: result.result.consultation_type,
            campus: result.result.campus
          });
          setShowSlots(true);
        } else if (result.functionName === "book_appointment" && result.result && result.result.success) {
          // Handle booking success
        }
      }
    });

    // Listen for assessment completion event
    useRTVIClientEvent(RTVIEvent.BotUtterance, (message) => {
      const content = message.data;
      
      // Check if this is the assessment completion message
      if (typeof content === 'string' && 
          (content.includes("assessment complete") || 
          content.includes("symptom assessment") || 
          content.includes("I've recorded all your symptoms"))) {
        
        // Transfer pending symptoms to the symptoms context
        if (pendingSymptoms.length > 0) {
          updateSymptoms(pendingSymptoms);
          setPendingSymptoms([]);
        }
      }
    });

    // ---- Effects

    useEffect(() => {
      // Reset started state on mount
      setHasStarted(false);
    }, []);

    useEffect(() => {
      // If we joined unmuted, enable the mic once in ready state
      if (!hasStarted || startAudioOff) return;
      voiceClient.enableMic(true);
    }, [voiceClient, startAudioOff, hasStarted]);

    useEffect(() => {
      // Create new stats aggregator on mount (removes stats from previous session)
      stats_aggregator = new StatsAggregator();
      
      // Refresh symptoms when session starts
      refreshSymptoms();
    }, [refreshSymptoms]);

    useEffect(() => {
      // Leave the meeting if there is an error
      if (state === "error") {
        onLeave();
      }
    }, [state, onLeave]);

    useEffect(() => {
      // Config modal effect
      const current = modalRef.current;
      if (current && showConfig) {
        current.inert = true;
        current.showModal();
        current.inert = false;
      }
      return () => current?.close();
    }, [showConfig]);

    function toggleMute() {
      voiceClient.enableMic(muted);
      setMuted(!muted);
    }

    // Tab button styles
    const getTabStyles = (tab: string) => {
      return activeTab === tab 
        ? "text-blue-600 border-b-2 border-blue-600 font-medium" 
        : "text-gray-500 hover:text-gray-700 hover:border-gray-300";
    };

    return (
      <>
        {/* Configuration Modal */}
        <dialog ref={modalRef} className="backdrop:bg-black/50 rounded-lg overflow-hidden">
          <Card.Card className="w-full max-w-md">
            <Card.CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <Card.CardTitle>Consultation Settings</Card.CardTitle>
            </Card.CardHeader>
            <Card.CardContent>
              <Configure state={state} inSession={true} />
            </Card.CardContent>
            <Card.CardFooter className="flex justify-between bg-gray-50">
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const config: RTVIClientConfigOption[] = (
                    voiceClient.params.requestData as {
                      config: RTVIClientConfigOption[];
                    }
                  )?.config;
                  if (!config) return;

                  setShowConfig(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </Card.CardFooter>
          </Card.Card>
        </dialog>

        {showStats &&
          createPortal(
            <Stats
              statsAggregator={stats_aggregator}
              handleClose={() => setShowStats(false)}
            />,
            document.getElementById("tray") || document.body
          )}

        {/* Available slots popup */}
        {showSlots && (
          <AvailableSlotsPopup 
            slots={slots} 
            details={slotDetails}
            onClose={() => setShowSlots(false)} 
          />
        )}

        {/* Main layout */}
        <div className="w-full max-w-6xl mx-auto p-2 md:p-4 flex flex-col">
          <BookingDisplay />

          {/* Main container with responsive design */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Main left column - tabs & content */}
            <div className="flex-1 flex flex-col">
              <Card.Card className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 mb-4">
                <Card.CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="h-5 w-5" />
                      <Card.CardTitle className="text-lg font-medium">Dr. Riya - Physiotherapist</Card.CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onLeave}
                      className="text-white hover:bg-blue-700/50"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </div>
                </Card.CardHeader>
                
                {/* Tabs - both mobile and desktop */}
                <div className="flex border-b">
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('symptoms')}`}
                    onClick={() => setActiveTab('symptoms')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Clipboard className="h-4 w-4" />
                      <span className="hidden sm:inline">Symptoms</span>
                    </span>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('appointments')}`}
                    onClick={() => setActiveTab('appointments')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Appointments</span>
                    </span>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('actions')}`}
                    onClick={() => setActiveTab('actions')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">Actions</span>
                    </span>
                  </button>
                </div>
                
                {/* Tab content */}
                <div className="h-[450px] md:h-[550px] overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {activeTab === 'symptoms' && 
                      <div className="p-4">
                        <h2 className="text-lg font-medium mb-3">Your Symptoms</h2>
                        <SymptomsDisplay />
                      </div>
                    }
                    
                    {activeTab === 'appointments' && 
                      <div className="p-4">
                        <h2 className="text-lg font-medium mb-3">Your Appointments</h2>
                        <AppointmentDisplay phoneNumber="9873219957" />
                      </div>
                    }
                    
                    {activeTab === 'actions' && 
                      <div className="p-4">
                        <h2 className="text-lg font-medium mb-3">Actions Performed</h2>
                        <div className="space-y-3">
                          {functionCalls.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                              No actions have been performed yet. Start speaking to Dr. Riya.
                            </div>
                          ) : (
                            functionCalls.map((fc) => (
                              <div key={fc.id} className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 p-3 border-b">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-800 capitalize">
                                      {fc.functionName.replace(/_/g, ' ')}
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                      {new Date(fc.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <div className="grid grid-cols-1 gap-2">
                                    {fc.arguments && Object.entries(fc.arguments).map(([key, value]) => (
                                      <div key={key} className="text-sm">
                                        <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}: </span>
                                        <span className="text-gray-600">{
                                          typeof value === 'object' 
                                            ? JSON.stringify(value) 
                                            : String(value)
                                        }</span>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {fc.result && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h4 className="text-sm font-medium text-gray-700 mb-1">Result:</h4>
                                      {fc.result.success ? (
                                        <div className="text-sm text-green-600">{fc.result.message}</div>
                                      ) : (
                                        <div className="text-sm text-red-600">{fc.result.message || "Error occurred"}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    }
                  </div>
                </div>

                {/* Microphone and status area */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col items-center">
                    {processingMsg && (
                      <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center w-full max-w-md">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {processingMsg}
                      </div>
                    )}
                    
                    <Button
                      size="lg"
                      onClick={toggleMute}
                      className={`rounded-full w-16 h-16 ${
                        muted ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
                      } text-white`}
                    >
                      {muted ? (
                        <Mic className="h-6 w-6" />
                      ) : (
                        <MicOff className="h-6 w-6" />
                      )}
                    </Button>
                    
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium">
                        {muted ? "Click to speak" : "Listening..."}
                      </p>
                    </div>
                  </div>
                </div>
              </Card.Card>
              
              {/* Control buttons */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipContent>Interrupt Dr. Riya</TooltipContent>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700"
                        onClick={() => {
                          voiceClient.action({
                            service: "tts",
                            action: "interrupt",
                            arguments: [],
                          });
                        }}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Interrupt</span>
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipContent>Settings</TooltipContent>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700"
                        onClick={() => setShowConfig(true)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    </TooltipTrigger>
                  </Tooltip>
                </div>
                
                <Button 
                  onClick={() => onLeave()} 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  End Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
  (p, n) => p.state === n.state
);

Session.displayName = "Session";

export default Session;
