
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";
import { motion } from "framer-motion";

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
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-32px)] p-0 bg-white overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
          <DialogTitle className="text-xl font-bold">Scan Barcode</DialogTitle>
          <DialogDescription className="text-white/80">
            Position the barcode in view of your camera
          </DialogDescription>
        </DialogHeader>
        <div className="p-2">
          {shouldRenderScanner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              ref={containerRef} 
              className="barcode-container relative overflow-hidden rounded-xl" 
              style={{ height: "350px" }}
            >
              <div className="absolute inset-0 bg-black/5 pointer-events-none z-10 rounded-xl"></div>
              
              {/* Animated scanning line */}
              <motion.div 
                className="absolute inset-x-0 h-0.5 bg-blue-500 z-20"
                initial={{ top: "0%" }}
                animate={{ 
                  top: ["0%", "100%", "0%"]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              />
              
              {/* Targeting frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <motion.div 
                  className="w-64 h-64 border-2 border-white/60 rounded-lg"
                  animate={{
                    boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 0 10px rgba(255,255,255,0.2)"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-400"></div>
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-400"></div>
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-400"></div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-400"></div>
                </motion.div>
              </div>
              
              <BarcodeScanner 
                onDetected={handleDetection} 
                key={`scanner-instance-${Date.now()}`}
              />
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
