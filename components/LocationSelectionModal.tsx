// components/LocationSelectionModal.tsx
import React from 'react';
import * as Dialog from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationType: string;
}

const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({ 
  isOpen, 
  onClose,
  consultationType 
}) => {
  const locations = [
    { id: 'Indiranagar', name: 'Indiranagar', address: '12th Main Road, Indiranagar, Bangalore' },
    { id: 'Koramangala', name: 'Koramangala', address: '80 Feet Road, Koramangala, Bangalore' },
    { id: 'Whitefield', name: 'Whitefield', address: 'Phoenix Mall, Whitefield, Bangalore' },
    { id: 'Hyderabad', name: 'Hyderabad', address: 'Jubilee Hills, Hyderabad' }
  ];

  // Only show for in-person consultations
  if (consultationType !== 'In-Person') return null;

  const handleSelectLocation = (location: { id: any; name?: string; address?: string; }) => {
    // Dispatch a custom event with the selected location
    window.dispatchEvent(new CustomEvent('location_selected', { 
      detail: location.id
    }));
    
    // Close the modal
    onClose();
  };

  return (
    <Dialog.Dialog open={isOpen} onOpenChange={onClose}>
      <Dialog.DialogContent className="sm:max-w-md">
        <Dialog.DialogHeader>
          <Dialog.DialogTitle>Select Clinic Location</Dialog.DialogTitle>
          <Dialog.DialogDescription>
            Please choose a location for your in-person consultation
          </Dialog.DialogDescription>
        </Dialog.DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-60 overflow-y-auto">
          {locations.map((location) => (
            <Card 
              key={location.id} 
              className="p-3 border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => handleSelectLocation(location)}
            >
              <div className="font-medium">{location.name}</div>
              <div className="text-sm text-gray-500">{location.address}</div>
            </Card>
          ))}
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

export default LocationSelectionModal;