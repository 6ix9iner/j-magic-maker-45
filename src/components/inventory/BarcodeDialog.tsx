
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Use state to track dialog open/close to properly trigger scanner reset
  const [wasOpen, setWasOpen] = useState(false);
  
  // Create a handler that adapts onDetected to the expected onScan interface
  const handleScan = (code: string, symbology: string) => {
    onDetected(code);
    onClose();
  };

  // Track open state changes
  React.useEffect(() => {
    if (isOpen) {
      setWasOpen(true);
    } else if (wasOpen) {
      // Add a small delay before resetting wasOpen to ensure proper cleanup
      const timer = setTimeout(() => {
        setWasOpen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, wasOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Position the barcode in view of your camera
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {/* Only mount the scanner when dialog is open and unmount when closed */}
          {isOpen && (
            <BarcodeScanner 
              onScan={handleScan} 
              key={`scanner-instance-${Date.now()}`} // Force new instance on each open
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
