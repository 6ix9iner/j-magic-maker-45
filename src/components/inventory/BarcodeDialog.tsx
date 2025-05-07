
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Create a unique ID for this instance that changes with each open/close cycle
  const [instanceId] = useState(`dialog-scanner-${Date.now()}`);
  
  // Create a handler that adapts onDetected to the expected onScan interface
  const handleScan = (code: string, symbology: string) => {
    onDetected(code);
    onClose();
  };

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
          {/* Conditionally mount the scanner with a unique key to force re-mount */}
          {isOpen && (
            <BarcodeScanner 
              onScan={handleScan} 
              key={`scanner-instance-${isOpen ? Date.now() : 'closed'}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
