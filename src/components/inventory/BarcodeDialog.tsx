
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Track whether to render the scanner to ensure clean mounting/unmounting
  const [shouldRenderScanner, setShouldRenderScanner] = useState(false);
  
  // Handle scanner mounting with a slight delay to ensure dialog is fully open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen) {
      // Short delay to ensure dialog is rendered before scanner
      timer = setTimeout(() => {
        setShouldRenderScanner(true);
      }, 300);
    } else {
      // Immediately remove scanner when dialog closes
      setShouldRenderScanner(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);
  
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
          {shouldRenderScanner && (
            <BarcodeScanner 
              onScan={handleScan} 
              key={`scanner-instance-${Date.now()}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
