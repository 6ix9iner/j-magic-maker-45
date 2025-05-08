import React, { useEffect, useRef, useState } from 'react';
import { BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { createBarcodeReaderConfig, BEEP_SOUND_URL } from './BarcodeConfigUtils';
import { initializeBarcodeReader, isBarcodeReaderInitialized } from './BarcodeInitializer';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, open, onOpenChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = useState<DynamsoftScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoContainerCreated = useRef<boolean>(false);
  const isDestroyingRef = useRef<boolean>(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = open !== undefined && onOpenChange !== undefined;

  // Sound effect for successful scan
  const playBeep = () => {
    try {
      const audio = new Audio(BEEP_SOUND_URL);
      audio.play().catch(err => console.error("Error playing sound:", err));
    } catch (err) {
      console.error("Error creating audio:", err);
    }
  };

  useEffect(() => {
    // Ensure barcode library is initialized
    const ensureInitialized = async () => {
      if (!isBarcodeReaderInitialized()) {
        try {
          await initializeBarcodeReader();
        } catch (err) {
          console.error("Failed to initialize barcode reader:", err);
          setError("Failed to initialize scanner");
        }
      }
    };
    
    ensureInitialized();
  }, []);

  useEffect(() => {
    // If we're in controlled mode and not open, do nothing
    if (isControlled && !open) {
      return;
    }
    
    let isMounted = true;
    let scannerInstance: DynamsoftScanner | null = null;
    console.log("BarcodeScanner component mounted");

    // Create the required dce-video-container element
    const ensureVideoContainer = () => {
      if (!containerRef.current || videoContainerCreated.current) return;
      
      // Create the container element needed by Dynamsoft
      const videoContainer = document.createElement('div');
      videoContainer.id = 'dce-video-container';
      videoContainer.className = 'dce-video-container';
      videoContainer.style.position = 'absolute';
      videoContainer.style.left = '0';
      videoContainer.style.top = '0';
      videoContainer.style.width = '100%';
      videoContainer.style.height = '100%';
      containerRef.current.appendChild(videoContainer);
      videoContainerCreated.current = true;
      console.log("Video container created");
    };

    // Reset the destroying flag when mounting
    isDestroyingRef.current = false;

    const initScanner = async () => {
      try {
        console.log("Initializing scanner...");
        // Ensure video container is created before scanner initialization
        ensureVideoContainer();
        
        // Make sure barcode reader is initialized globally
        if (!isBarcodeReaderInitialized()) {
          await initializeBarcodeReader();
        }
        
        // Create scanner instance
        scannerInstance = await DynamsoftScanner.createInstance();
        console.log("Scanner instance created");
        
        // Apply configuration
        const config = createBarcodeReaderConfig();
        
        const settings = await scannerInstance.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;

        // Apply region settings if provided
        if (config.region) {
          settings.region = config.region;
        }
        
        await scannerInstance.updateRuntimeSettings(settings);
        
        if (!isMounted || isDestroyingRef.current) {
          console.log("Component unmounted during initialization, cleaning up scanner");
          if (scannerInstance) {
            try {
              await scannerInstance.destroyContext();
            } catch (e) {
              console.error("Error destroying scanner during cleanup:", e);
            }
          }
          return;
        }

        // Set result callback
        scannerInstance.onUnduplicatedRead = (txt, result) => {
          console.log("Barcode detected:", txt, result.barcodeFormatString);
          playBeep();
          onDetected(txt);
          
          // Close scanner if we're in controlled mode
          if (isControlled && onOpenChange) {
            onOpenChange(false);
          }
        };
        
        setScanner(scannerInstance);
        setIsLoading(false);
        
        // If we have a container, start scanning
        if (containerRef.current) {
          try {
            await scannerInstance.setUIElement(containerRef.current);
            await scannerInstance.open();
            console.log("Scanner opened successfully");
          } catch (err) {
            console.error("Failed to start scanner:", err);
            if (isMounted && !isDestroyingRef.current) {
              setError("Failed to start camera. Please check camera permissions.");
            }
          }
        }
      } catch (err) {
        console.error("Scanner initialization error:", err);
        if (isMounted && !isDestroyingRef.current) {
          setError("Failed to initialize scanner. Please try again.");
          setIsLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      console.log("BarcodeScanner component unmounting, cleaning up resources");
      isMounted = false;
      isDestroyingRef.current = true;
      videoContainerCreated.current = false;
      
      // Clean up any created video containers
      if (containerRef.current) {
        const videoContainer = document.getElementById('dce-video-container');
        if (videoContainer && videoContainer.parentNode === containerRef.current) {
          containerRef.current.removeChild(videoContainer);
          console.log("Video container removed");
        }
      }
      
      if (scannerInstance) {
        // Make sure to properly close and destroy the scanner
        (async () => {
          try {
            console.log("Closing and destroying scanner instance");
            try {
              await scannerInstance.close();
              console.log("Scanner closed");
            } catch (e) {
              console.error("Error closing scanner:", e);
            }
            
            try {
              // Using destroyContext() instead of destroy() which doesn't exist
              await scannerInstance.destroyContext();
              console.log("Scanner instance destroyed");
            } catch (e) {
              console.error("Error destroying scanner context:", e);
            }
          } catch (e) {
            console.error("Error in scanner cleanup:", e);
          }
        })();
      }
    };
  }, [onDetected, open, onOpenChange, isControlled]);

  // If we're in controlled mode and not open, render nothing
  if (isControlled && !open) {
    return null;
  }

  return (
    <div className="w-full">
      {error ? (
        <div className="bg-red-50 p-4 rounded-md text-center">
          <p className="text-red-600 font-medium mb-2">Camera access required</p>
          <p className="text-sm text-gray-600">
            Please allow camera access when prompted
          </p>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="relative w-full aspect-[4/3] bg-black rounded-md overflow-hidden"
          style={{ minHeight: '300px' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
            <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-70">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
            </div>
          </div>
        </div>
      )}
      <p className="text-sm text-center mt-3 text-gray-600">
        Position barcode within the frame for automatic scanning
      </p>
    </div>
  );
};

export default BarcodeScanner;
