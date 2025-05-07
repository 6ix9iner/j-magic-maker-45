
import React, { useState, useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogOpenRef = useRef(false);
  
  // Track dialog open state for proper scanner initialization/cleanup
  useEffect(() => {
    dialogOpenRef.current = isOpen;
  }, [isOpen]);
  
  // Handle scanner mounting with a slight delay to ensure dialog is fully open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen) {
      // Longer delay to ensure dialog is rendered before scanner
      timer = setTimeout(() => {
        if (dialogOpenRef.current) {
          console.log("Rendering scanner in dialog");
          setShouldRenderScanner(true);
        }
      }, 300);
    } else {
      // Immediately remove scanner when dialog closes
      setShouldRenderScanner(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Create a handler that adapts onDetected to the expected interface
  const handleDetection = (code: string) => {
    console.log("Barcode detected in dialog:", code);
    onDetected(code);
    // Close the dialog after detection to ensure scanner is properly cleaned up
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
            <div 
              ref={containerRef} 
              className="barcode-container relative" 
              style={{ minHeight: "300px" }}
            >
              <BarcodeScanner 
                onDetected={handleDetection} 
                key={`scanner-instance-${Date.now()}`}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
