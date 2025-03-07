"use client";

import { HeartPulse, Loader2 } from "lucide-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { RTVIError, RTVIEvent, RTVIMessage } from "realtime-ai";
import {
  useRTVIClient,
  useRTVIClientEvent,
  useRTVIClientTransportState,
} from "realtime-ai-react";

import { AppContext } from "./context";
import Session from "./Session";
import { Configure } from "./Setup";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import * as Card from "./ui/card";
import * as Dialog from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const status_text = {
  idle: "Initializing...",
  initialized: "Start Consultation",
  authenticating: "Connecting to Dr. Riya...",
  connecting: "Connecting...",
  disconnected: "Start Consultation",
};

export default function App() {
  const voiceClient = useRTVIClient()!;
  const transportState = useRTVIClientTransportState();

  const [appState, setAppState] = useState<
    "idle" | "ready" | "connecting" | "connected"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [startAudioOff, setStartAudioOff] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);
  const { clientParams } = useContext(AppContext);
  
  // Phone number collection states
  const [phoneNumber, setPhoneNumber] = useState<string>("9873219957");
  const [phoneInputVisible, setPhoneInputVisible] = useState<boolean>(false);
  const [phoneNumberReady, setPhoneNumberReady] = useState<boolean>(false);

  useRTVIClientEvent(
    RTVIEvent.Error,
    useCallback((message: RTVIMessage) => {
      const errorData = message.data as { error: string; fatal: boolean };
      if (!errorData.fatal) return;
      setError(errorData.error);
    }, [])
  );

  // Check if phone number exists on component mount
  useEffect(() => {
    const storedPhoneNumber = localStorage.getItem('patient_phone_number');
    if (storedPhoneNumber) {
      setPhoneNumber(storedPhoneNumber);
      setPhoneNumberReady(true);
    } else {
      setPhoneInputVisible(true);
      setPhoneNumberReady(false);
    }
  }, []);

  useEffect(() => {
    // Initialize local audio devices only if phone number is ready
    if (!voiceClient || mountedRef.current || !phoneNumberReady) return;
    mountedRef.current = true;
    voiceClient.initDevices();
  }, [appState, voiceClient, phoneNumberReady]);

  useEffect(() => {
    if (!voiceClient || !voiceClient.params || !phoneNumberReady) {
      return;
    }
    
    voiceClient.params = {
      ...voiceClient.params,
      requestData: {
        ...(voiceClient.params.requestData || {}),
        ...clientParams,
      },
    };
  }, [voiceClient, appState, clientParams, phoneNumberReady]);

  useEffect(() => {
    // Update app state based on voice client transport state.
    // We only need a subset of states to determine the ui state,
    // so this effect helps avoid excess inline conditionals.
    console.log(transportState);
    switch (transportState) {
      case "initialized":
      case "disconnected":
        setAppState("ready");
        break;
      case "authenticating":
      case "connecting":
        setAppState("connecting");
        break;
      case "connected":
      case "ready":
        setAppState("connected");
        break;
      default:
        setAppState("idle");
    }
  }, [transportState]);

  // Handle phone number submission
  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber && phoneNumber.length >= 10) {
      setPhoneInputVisible(false);
      localStorage.setItem('patient_phone_number', phoneNumber);
      
      window.dispatchEvent(new CustomEvent('phone_number_updated', { 
        detail: phoneNumber 
      }));
      
      // Set the phone number as ready, which will trigger initialization
      setPhoneNumberReady(true);
    }
  };

  async function start() {
    if (!voiceClient || !phoneNumberReady) return;

    // Join the session
    try {
      // Disable the mic until the bot has joined
      // to avoid interrupting the bot's welcome message
      voiceClient.enableMic(false);
      await voiceClient.connect();
    } catch (e) {
      setError((e as RTVIError).message || "Unknown error occurred");
      voiceClient.disconnect();
    }
  }

  async function leave() {
    await voiceClient.disconnect();
  }

  /**
   * UI States
   */

  // Show phone number input dialog if needed
  if (phoneInputVisible) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
                  Continue
                </Button>
              </Dialog.DialogFooter>
            </form>
          </Dialog.DialogContent>
        </Dialog.Dialog>
      </div>
    );
  }

  // Error: show full screen message
  if (error) {
    return (
      <Alert intent="danger" title="An error occurred">
        {error}
      </Alert>
    );
  }

  // Connected: show session view
  if (appState === "connected") {
    return (
      <Session
        state={transportState}
        onLeave={() => leave()}
        startAudioOff={startAudioOff}
      />
    );
  }

  // Default: show setup view
  const isReady = appState === "ready" && phoneNumberReady;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card.Card className="overflow-hidden border border-gray-200 rounded-xl shadow-lg">
        <Card.CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <Card.CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6" />
            <span>Virtual Physiotherapy Consultation</span>
          </Card.CardTitle>
          <p className="text-blue-100 text-sm mt-1">
            Connect with Dr. Riya for personalized care
          </p>
        </Card.CardHeader>
        
        <Card.CardContent className="p-6">
          <div className="mb-6 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100 flex items-start gap-3">
            <HeartPulse className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-1">For the best experience:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 pl-1">
                <li>Use a quiet environment</li>
                <li>Ensure a stable internet connection</li>
                <li>Speak clearly when prompted</li>
                <li>Allow microphone access when requested</li>
              </ul>
            </div>
          </div>
          
          <Configure
            startAudioOff={startAudioOff}
            handleStartAudioOff={() => setStartAudioOff(!startAudioOff)}
            state={appState}
          />
        </Card.CardContent>
        
        <Card.CardFooter className="bg-gray-50 px-6 py-4 flex justify-end">
          <Button
            onClick={() => start()}
            disabled={!isReady}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center gap-2 transition-all"
          >
            {!isReady && <Loader2 className="animate-spin h-5 w-5" />}
            {status_text[transportState as keyof typeof status_text]}
          </Button>
        </Card.CardFooter>
      </Card.Card>
    </div>
  );
}