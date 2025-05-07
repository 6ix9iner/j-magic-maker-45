
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
  
  // Handle scanner mounting with a slight delay to ensure dialog is fully open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen) {
      // Longer delay to ensure dialog is rendered before scanner
      timer = setTimeout(() => {
        setShouldRenderScanner(true);
      }, 500);
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
    onDetected(code);
    onClose();
  };

  // Setup the required DOM container for Dynamsoft scanner
  useEffect(() => {
    if (shouldRenderScanner && containerRef.current) {
      console.log("BarcodeDialog: Setting up scanner container");
      
      // Check if the dce-video-container already exists
      if (!containerRef.current.querySelector('.dce-video-container')) {
        // Create the required container element
        const videoContainer = document.createElement('div');
        videoContainer.className = 'dce-video-container';
        videoContainer.style.position = 'absolute';
        videoContainer.style.left = '0';
        videoContainer.style.top = '0';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        videoContainer.style.backgroundColor = 'black';
        containerRef.current.appendChild(videoContainer);
        
        console.log("BarcodeDialog: Created dce-video-container element");
      }
    }
  }, [shouldRenderScanner]);

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
