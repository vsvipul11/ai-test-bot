// components/SlotSelectionModal.tsx
import React from 'react';
import * as Dialog from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface SlotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData: any;
}

const SlotSelectionModal: React.FC<SlotSelectionModalProps> = ({ isOpen, onClose, slotData }) => {
  if (!slotData) return null;

  const handleSelectSlot = (slot: { start_time: any; formatted: any; }) => {
    // Dispatch a custom event with the selected slot data
    window.dispatchEvent(new CustomEvent('slot_selected', { 
      detail: {
        time: slot.start_time,
        formatted: slot.formatted
      }
    }));
    
    // Close the modal
    onClose();
  };

  return (
    <Dialog.Dialog open={isOpen} onOpenChange={onClose}>
      <Dialog.DialogContent className="sm:max-w-md">
        <Dialog.DialogHeader>
          <Dialog.DialogTitle>Available Appointment Slots</Dialog.DialogTitle>
          <Dialog.DialogDescription>
            {slotData.date ? `For ${slotData.date} at ${slotData.campus || 'Online'}` : 
             'Please select a time slot for your appointment'}
          </Dialog.DialogDescription>
        </Dialog.DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-60 overflow-y-auto">
          {slotData.available_slots && slotData.available_slots.length > 0 ? (
            slotData.available_slots.map((slot: { formatted: any; start_time?: any; }, index: React.Key | null | undefined) => (
              <Card key={index} className="p-3 border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => handleSelectSlot(slot)}>
                <div className="font-medium">{slot.formatted}</div>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-500">No available slots found for this date.</p>
          )}
        </div>
        
        <Dialog.DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </Dialog.DialogFooter>
      </Dialog.DialogContent>
    </Dialog.Dialog>
  );
};

export default SlotSelectionModal;