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

import Agent from "./Agent";
import Stats from "./Stats";
import UserMicBubble from "./UserMicBubble";

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
    const [activeTab, setActiveTab] = useState<'chat' | 'symptoms' | 'appointments'>('chat');
    const { refreshSymptoms } = useSymptoms();

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

        {/* Main layout */}
        <div className="w-full max-w-6xl mx-auto p-2 md:p-4 flex flex-col">
        <BookingDisplay />

          {/* Main container with responsive design */}
          <div className="flex flex-col md:flex-row gap-4">
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
                
                {/* Mobile Tabs */}
                <div className="flex border-b md:hidden">
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('chat')}`}
                    onClick={() => setActiveTab('chat')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </span>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('symptoms')}`}
                    onClick={() => setActiveTab('symptoms')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Clipboard className="h-4 w-4" />
                      Symptoms
                    </span>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium ${getTabStyles('appointments')}`}
                    onClick={() => setActiveTab('appointments')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Appointments
                    </span>
                  </button>
                </div>
                
                {/* Content based on active tab (mobile) or always chat (desktop) */}
                <div className="flex-1 h-[550px] md:h-[600px] overflow-hidden">
                  {/* Mobile View */}
                  <div className="md:hidden h-full">
                    {activeTab === 'chat' && <ChatLog />}
                    {activeTab === 'symptoms' && <div className="p-4 overflow-y-auto h-full"><SymptomsDisplay /></div>}
                    {activeTab === 'appointments' && <div className="p-4 overflow-y-auto h-full"><AppointmentDisplay phoneNumber="9873219957" /></div>}
                  </div>
                  
                  {/* Desktop View - Always show chat */}
                  <div className="hidden md:block h-full">
                    <ChatLog />
                  </div>
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
            
            {/* Right sidebar - Desktop only */}
            <div className="hidden md:block md:w-80 space-y-4">
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
                <Card.CardContent className="px-0 py-0 max-h-[300px] overflow-y-auto">
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
                <Card.CardContent className="px-0 py-0 max-h-[300px] overflow-y-auto">
                  <AppointmentDisplay phoneNumber="9873219957" />
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