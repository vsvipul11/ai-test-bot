// components/AvailableSlotsPopup.tsx
import { Calendar, Clock, MapPin, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface SlotDetails {
  date?: string;
  consultationType?: string;
  campus?: string;
}

interface Slot {
  timeRange: string;
  start_time: string;
  formatted: string;
}

interface AvailableSlotsPopupProps {
  slots: Slot[];
  details: SlotDetails;
  onClose: () => void;
}

const AvailableSlotsPopup: React.FC<AvailableSlotsPopupProps> = ({ 
  slots = [], 
  details = {}, 
  onClose 
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Debug logging
  useEffect(() => {
    console.log("AvailableSlotsPopup mounted with slots:", slots);
  }, [slots]);
  
  // Group slots by hour for better display
  const groupSlotsByHour = () => {
    const morningSlots = slots.filter(slot => {
      const hour = parseInt(slot.timeRange.split('-')[0]);
      return hour < 12;
    });
    
    const afternoonSlots = slots.filter(slot => {
      const hour = parseInt(slot.timeRange.split('-')[0]);
      return hour >= 12 && hour < 17;
    });
    
    const eveningSlots = slots.filter(slot => {
      const hour = parseInt(slot.timeRange.split('-')[0]);
      return hour >= 17;
    });
    
    return {
      morning: morningSlots,
      afternoon: afternoonSlots,
      evening: eveningSlots
    };
  };
  
  const groupedSlots = groupSlotsByHour();
  
  const handleConfirm = () => {
    if (!selectedSlot) return;
    
    // Update localStorage with selected slot
    try {
      const savedSlotData = localStorage.getItem('physiotattva_slot_data');
      if (savedSlotData) {
        const slotData = JSON.parse(savedSlotData);
        const selectedSlotObj = slots.find(s => s.timeRange === selectedSlot);
        
        const updatedData = {
          ...slotData,
          selected_timeRange: selectedSlot,
          selected_start_time: selectedSlotObj?.start_time || selectedSlot,
          selected_formatted: selectedSlotObj?.formatted || selectedSlot
        };
        
        localStorage.setItem('physiotattva_slot_data', JSON.stringify(updatedData));
        console.log("Updated slot selection in localStorage:", updatedData);
      }
    } catch (err) {
      console.error("Error updating slot selection:", err);
    }
    
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Available Appointment Slots</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium">{details.date || "Date not specified"}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm">
              {details.campus || "Location"} - {details.consultationType || "Consultation"}
            </span>
          </div>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          {slots.length === 0 ? (
            <div className="text-center p-6">
              <p className="text-gray-500">No available slots found for this date.</p>
              <p className="text-sm text-gray-400 mt-2">Try selecting a different date or location.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Morning slots */}
              {groupedSlots.morning.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Morning</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {groupedSlots.morning.map((slot, index) => (
                      <button
                        key={`morning-${index}`}
                        className={`p-2 rounded-md text-sm flex items-center justify-center ${
                          selectedSlot === slot.timeRange
                            ? 'bg-blue-100 border-blue-500 border text-blue-800'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSlot(slot.timeRange)}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {slot.formatted}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Afternoon slots */}
              {groupedSlots.afternoon.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Afternoon</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {groupedSlots.afternoon.map((slot, index) => (
                      <button
                        key={`afternoon-${index}`}
                        className={`p-2 rounded-md text-sm flex items-center justify-center ${
                          selectedSlot === slot.timeRange
                            ? 'bg-blue-100 border-blue-500 border text-blue-800'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSlot(slot.timeRange)}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {slot.formatted}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Evening slots */}
              {groupedSlots.evening.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Evening</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {groupedSlots.evening.map((slot, index) => (
                      <button
                        key={`evening-${index}`}
                        className={`p-2 rounded-md text-sm flex items-center justify-center ${
                          selectedSlot === slot.timeRange
                            ? 'bg-blue-100 border-blue-500 border text-blue-800'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedSlot(slot.timeRange)}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {slot.formatted}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={!selectedSlot}
              onClick={handleConfirm}
            >
              Confirm Selection
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Selecting a time will allow Dr. Riya to book an appointment for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvailableSlotsPopup;