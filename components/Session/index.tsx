// components/Session.tsx
import { Clipboard, HeartPulse, Loader2, LogOut, MessageCircle, Settings, StopCircle, Calendar } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PipecatMetricsData,
  RTVIClientConfigOption,
  RTVIEvent,
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
import ChatLog from "../ChatLogs";
import { useSymptoms } from "../SymptomsContext";
import BookingDisplay from "../BookingDisplay";
import SlotSelectionModal from "../SlotSelectionModal";
import LocationSelectionModal from "../LocationSelectionModal";

import Agent from "./Agent";
import Stats from "./Stats";
import UserMicBubble from "./UserMicBubble";
import * as Dialog from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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
    const [phoneNumber, setPhoneNumber] = useState<string>("9873219957");
    const [phoneInputVisible, setPhoneInputVisible] = useState<boolean>(true);
    const { refreshSymptoms } = useSymptoms();
    const [showSlotSelection, setShowSlotSelection] = useState<boolean>(false);
    const [showLocationSelection, setShowLocationSelection] = useState<boolean>(false);
    const [slotData, setSlotData] = useState(null);
    const [savedConsultationType, setSavedConsultationType] = useState<string>("Online");

    const modalRef = useRef<HTMLDialogElement>(null);

    // Event listeners for custom events
    useEffect(() => {
      // Listen for slot fetch event to show slot selection modal
      const handleSlotFetch = (event) => {
        if (event.detail && event.detail.success) {
          setSlotData(event.detail);
          setShowSlotSelection(true);
        }
      };

      // Listen for consultation type change to show location selection
      const handleConsultationTypeChange = (event) => {
        if (event.detail && event.detail === "In-Person") {
          setSavedConsultationType("In-Person");
          setShowLocationSelection(true);
        } else if (event.detail) {
          setSavedConsultationType(event.detail);
        }
      };

      window.addEventListener('fetch_slots_completed', handleSlotFetch);
      window.addEventListener('consultation_type_change', handleConsultationTypeChange);

      return () => {
        window.removeEventListener('fetch_slots_completed', handleSlotFetch);
        window.removeEventListener('consultation_type_change', handleConsultationTypeChange);
      };
    }, []);

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

    // Poll for symptoms periodically
    useEffect(() => {
      const intervalId = setInterval(() => {
        refreshSymptoms();
      }, 5000);
      
      return () => clearInterval(intervalId);
    }, [refreshSymptoms]);

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

    const handlePhoneSubmit = (e) => {
      e.preventDefault();
      if (phoneNumber && phoneNumber.length >= 10) {
        setPhoneInputVisible(false);
        // Update the phone number in any context or state that needs it
        localStorage.setItem('patient_phone_number', phoneNumber);
        
        // Dispatch a custom event to notify components that need to update
        window.dispatchEvent(new CustomEvent('phone_number_updated', { 
          detail: phoneNumber 
        }));
      }
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

        {/* Phone Number Input Dialog */}
        {phoneInputVisible && (
          <Dialog.Dialog open={phoneInputVisible} onOpenChange={setPhoneInputVisible}>
            <Dialog.DialogContent className="sm:max-w-md">
              <Dialog.DialogHeader>
                <Dialog.DialogTitle>Enter Your Mobile Number</Dialog.DialogTitle>
                <Dialog.DialogDescription>
                  Please enter your mobile number to proceed with the consultation and view your appointments.
                </Dialog.DialogDescription>
              </Dialog.DialogHeader>
              <form onSubmit={handlePhoneSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phoneNumber" className="text-right">
                      Mobile Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter 10 digit number"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <Dialog.DialogFooter>
                  <Button type="submit" disabled={!phoneNumber || phoneNumber.length < 10}>
                    Proceed
                  </Button>
                </Dialog.DialogFooter>
              </form>
            </Dialog.DialogContent>
          </Dialog.Dialog>
        )}

        {showStats &&
          createPortal(
            <Stats
              statsAggregator={stats_aggregator}
              handleClose={() => setShowStats(false)}
            />,
            document.getElementById("tray") || document.body
          )}

        {/* Slot Selection Modal */}
        <SlotSelectionModal 
          isOpen={showSlotSelection} 
          onClose={() => setShowSlotSelection(false)} 
          slotData={slotData} 
        />

        {/* Location Selection Modal */}
        <LocationSelectionModal 
          isOpen={showLocationSelection} 
          onClose={() => setShowLocationSelection(false)}
          consultationType={savedConsultationType}
        />

        {/* Main layout */}
        <div className="w-full max-w-6xl mx-auto p-2 md:p-4 flex flex-col">
          <BookingDisplay />

          {/* Main container with responsive design */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main left column - chat & controls */}
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
                
                {/* Single view with chat */}
                <div className="flex-1 h-[350px] md:h-[400px] overflow-hidden">
                  <ChatLog />
                </div>

                {/* Microphone control */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-center">
                  <UserMicBubble
                    active={hasStarted}
                    muted={muted}
                    handleMute={() => toggleMute()}
                  />
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
            
            {/* Right sidebar - Always visible on all screens */}
            <div className="w-full lg:w-80 space-y-4">
              {/* Symptoms Card */}
              <Card.Card className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                <Card.CardHeader className="bg-gray-50 py-3 px-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <Card.CardTitle className="text-base font-medium text-gray-800 flex items-center gap-1">
                      <Clipboard className="h-4 w-4 text-blue-600" />
                      Recorded Symptoms
                    </Card.CardTitle>
                    <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={refreshSymptoms}>
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                  </div>
                </Card.CardHeader>
                <Card.CardContent className="px-0 py-0 max-h-[200px] overflow-y-auto">
                  <SymptomsDisplay />
                </Card.CardContent>
              </Card.Card>
              
              {/* Appointments Card */}
              <Card.Card className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                <Card.CardHeader className="bg-gray-50 py-3 px-4 border-b border-gray-200">
                  <Card.CardTitle className="text-base font-medium text-gray-800 flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Your Appointments
                  </Card.CardTitle>
                </Card.CardHeader>
                <Card.CardContent className="px-0 py-0 max-h-[200px] overflow-y-auto">
                  <AppointmentDisplay phoneNumber={phoneNumber} />
                </Card.CardContent>
              </Card.Card>
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