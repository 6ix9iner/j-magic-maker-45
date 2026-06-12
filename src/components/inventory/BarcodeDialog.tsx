
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { Capacitor } from '@capacitor/core';
import MlKitScanner from '@/components/barcode/MlKitScanner';

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Track whether to render the scanner to ensure clean mounting/unmounting
  const [shouldRenderScanner, setShouldRenderScanner] = useState(false);
  const [scanner, setScanner] = useState<DynamsoftScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mlKitAvailable, setMlKitAvailable] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<'dynamsoft' | 'mlkit'>('dynamsoft');
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const dialogOpenRef = useRef(false);
  const videoContainerCreated = useRef<boolean>(false);
  const isDestroyingRef = useRef<boolean>(false);
  
  // Initialize the barcode reader library once on component mount
  useEffect(() => {
    // We don't set license here anymore - it's only set in the main scanner initialization
    // This avoids the "license is not allowed to change" error
    
    return () => {
      // Clean up any resources when component unmounts
      isDestroyingRef.current = true;
    };
  }, []);
  
  // Track dialog open state for proper scanner initialization/cleanup
  useEffect(() => {
    dialogOpenRef.current = isOpen;
    
    // When dialog opens, prepare for scanner mounting
    if (isOpen) {
      // check for native ML Kit plugin availability
      if (Capacitor.isNativePlatform()) {
        setMlKitAvailable(true);
      } else {
        setMlKitAvailable(false);
      }
      setShouldRenderScanner(true);
    } else {
      cleanupScanner();
      setShouldRenderScanner(false);
    }
  }, [isOpen]);
  
  // Set up the scanner when the container is ready and dialog is open
  useEffect(() => {
    if (!shouldRenderScanner || !dialogOpenRef.current) return;

    let isMounted = true;
    let mlkitListener: any = null;

    const setupDynamsoft = async () => {
      if (isDestroyingRef.current || !dialogOpenRef.current) return;

      try {
        console.log("Setting up scanner in dialog");

        // Create video container element required by Dynamsoft scanner
        if (scannerContainerRef.current && !videoContainerCreated.current) {
          const videoContainer = document.createElement('div');
          videoContainer.className = 'dce-video-container';
          videoContainer.id = 'dce-video-container-dialog';
          videoContainer.style.position = 'absolute';
          videoContainer.style.left = '0';
          videoContainer.style.top = '0';
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          scannerContainerRef.current.appendChild(videoContainer);
          videoContainerCreated.current = true;
          console.log("Dialog video container created");
        }

        // Create scanner instance without setting license again
        const scannerInstance = await DynamsoftScanner.createInstance();
        console.log("Dialog scanner instance created");

        // Update settings for better performance
        const settings = await scannerInstance.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;
        await scannerInstance.updateRuntimeSettings(settings);

        if (isMounted && dialogOpenRef.current && !isDestroyingRef.current) {
          setScanner(scannerInstance);

          // Set up callback for barcode detection
          scannerInstance.onUnduplicatedRead = (txt, result) => {
            console.log("Dialog barcode detected:", txt);
            onDetected(txt);
            // Close the dialog after detection
            onClose();
          };

          // Start scanning if container is ready
          if (scannerContainerRef.current) {
            try {
              await scannerInstance.setUIElement(scannerContainerRef.current);
              await scannerInstance.show();
              console.log("Dialog scanner started");
            } catch (err) {
              console.error("Failed to start dialog scanner:", err);
              if (isMounted && !isDestroyingRef.current) {
                setError("Camera access required");
              }
            }
          }
        } else {
          console.log("Component unmounted during scanner setup, cleaning up");
          try {
            await scannerInstance.destroyContext();
          } catch (e) {
            console.error("Error destroying scanner during setup cleanup:", e);
          }
        }
      } catch (err) {
        console.error("Dialog scanner setup error:", err);
        if (isMounted && !isDestroyingRef.current) {
          setError("Please allow camera access to scan");
        }
      }
    };

    const startMlKit = async () => {
      try {
        await MlKitScanner.startScan();

        // DOM event listener
        const domListener = (ev: any) => {
          const code = (ev && ev.detail && (ev.detail.code || ev.detail.value)) || (ev && ev.detail) || null;
          if (code) {
            onDetected(code);
            onClose();
          }
        };
        document.addEventListener('mlkitBarcodeDetected', domListener as any);

        // Capacitor style listener if available
        try {
          mlkitListener = await MlKitScanner.addListener('mlkitBarcodeDetected', (d: any) => {
            const R = (d && (d.code || d.value)) || null;
            if (R) {
              onDetected(R);
              onClose();
            }
          });
        } catch (e) {
          console.warn('Failed to attach mlkit listener', e);
        }

      } catch (e) {
        console.error('Error starting MlKit plugin', e);
        setError('Failed to start ML Kit scanner');
      }
    };

    // Choose scanner setup path
    if (selectedScanner === 'mlkit') {
      startMlKit();
    } else {
      setupDynamsoft();
    }

    return () => {
      isMounted = false;
      cleanupScanner();
      try {
        if (mlkitListener && mlkitListener.remove) mlkitListener.remove();
      } catch (e) {}
      try {
        MlKitScanner.stopScan();
      } catch (e) {}
    };
  }, [shouldRenderScanner, onDetected, onClose, selectedScanner]);

  // Clean up scanner resources
  const cleanupScanner = async () => {
    if (scanner) {
      try {
        console.log("Cleaning up dialog scanner");
        try {
          await scanner.hide();
          console.log("Dialog scanner hidden");
        } catch (e) {
          console.error("Error hiding dialog scanner:", e);
        }
        
        try {
          await scanner.destroyContext();
          console.log("Dialog scanner destroyed");
        } catch (e) {
          console.error("Error destroying dialog scanner:", e);
        }
        
        setScanner(null);
      } catch (e) {
        console.error("Error in dialog scanner cleanup:", e);
      }
    }
    
    // Clean up the video container
    if (scannerContainerRef.current) {
      const videoContainer = document.getElementById('dce-video-container-dialog');
      if (videoContainer && videoContainer.parentNode === scannerContainerRef.current) {
        scannerContainerRef.current.removeChild(videoContainer);
        console.log("Dialog video container removed");
      }
    }
    
    videoContainerCreated.current = false;
  };

  // Remove the handleDetection function as we're handling detection directly in the scanner callback

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
          <div className="flex items-center gap-2 mb-2">
            <button
              className={`px-3 py-1 rounded ${selectedScanner === 'dynamsoft' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setSelectedScanner('dynamsoft')}
            >
              Dynamsoft
            </button>
            {mlKitAvailable && (
              <button
                className={`px-3 py-1 rounded ${selectedScanner === 'mlkit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                onClick={() => setSelectedScanner('mlkit')}
              >
                ML Kit (Native)
              </button>
            )}
          </div>
          {shouldRenderScanner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
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
              
              <div 
                ref={scannerContainerRef} 
                className="absolute inset-0"
              >
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-40">
                    <div className="text-center p-4">
                      <p className="text-red-500 font-medium mb-2">{error}</p>
                      <p className="text-sm text-gray-600">
                        Please allow camera access to scan barcodes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
