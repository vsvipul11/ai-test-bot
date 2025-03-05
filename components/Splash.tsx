// components/Splash.tsx
import { HeartPulse, ArrowRight } from "lucide-react";
import React from "react";
import Image from 'next/image';
import { Button } from "./ui/button";

type SplashProps = {
  onComplete: () => void;
};

export const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  return (
    <main className="w-full min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-white to-blue-50 p-4">
      <div className="flex flex-col gap-8 items-center md:items-start text-center md:text-left max-w-xl px-4 md:px-12 mb-8 md:mb-0">
        <div className="mb-4">
          <Image
            src="https://www.app.physiotattva247.com/assets/assets/images/logo.91ea6cf29a55da199eea5a233fca5f82.png"
            alt="Physiotattva"
            width={250}
            height={60}
            priority
            className="h-auto w-auto"
          />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
          Virtual Physiotherapy Consultation
        </h1>
        
        <p className="text-lg text-gray-600 md:pr-12">
          Connect with Dr. Riya, our expert physiotherapist, to discuss your symptoms 
          and get personalized care from the comfort of your home.
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-md">
          <Button 
            onClick={() => onComplete()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-lg shadow-md transform transition hover:-translate-y-1"
          >
            Start Your Consultation
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 text-gray-600 justify-center md:justify-start">
            <HeartPulse className="text-blue-500 h-5 w-5" />
            <span className="text-sm">Available 24/7, No Appointment Needed</span>
          </div>
        </div>
      </div>
      
      <div className="hidden md:block max-w-md">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
            alt="Physiotherapy Session"
            width={500}
            height={600}
            className="object-cover h-[600px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 to-transparent flex items-end p-8">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2">Expert Physiotherapy</h3>
              <p className="text-sm text-gray-100">Personalized care for your recovery journey</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Splash;