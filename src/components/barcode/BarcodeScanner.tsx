
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBarcodeScannerSDK } from '@/hooks/useBarcodeScannerSDK';
import BarcodeScannerUI from './BarcodeScannerUI';
import { BEEP_SOUND_URL } from './BarcodeConfigUtils';
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface BarcodeScannerProps {
  onDetected: (result: string) => void;
  // Add onScan as an alias to onDetected for backward compatibility
  onScan?: (code: string, symbology: string) => void;
}

const BarcodeScanner = ({ onDetected, onScan }: BarcodeScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [useSheet, setUseSheet] = useState(false);
  const [scanReady, setScanReady] = useState(false);
  const [domReady, setDomReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef<number>(0);
  const torchStateRef = useRef<boolean>(false);
  const scannerInitializedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setUseSheet(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    try {
      audioRef.current = new Audio();
      audioRef.current.src = BEEP_SOUND_URL;
      audioRef.current.volume = 1.0;
      audioRef.current.preload = 'auto';
      const loadAudio = () => {
        if (audioRef.current) {
          audioRef.current.load();
        }
      };
      document.addEventListener('click', loadAudio, { once: true });
      return () => {
        document.removeEventListener('click', loadAudio);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.log("Audio setup error:", error);
    }
  }, []);

  const handleScan = (code: string, symbology: string) => {
    const invalidCodes = [
      "scanner reset please try scanning again",
      "scanner failed to initialize",
      "invalid scan",
    ];
    if (invalidCodes.includes(code.toLowerCase().trim())) {
      console.warn("Ignored invalid barcode scan:", code);
      return;
    }
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}
    }
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    // Call both callback types for backward compatibility
    onDetected(code);
    if (onScan) {
      onScan(code, symbology);
    }
    
    toast.success(`Barcode scanned: ${symbology}`, { duration: 2000 });
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const {
    viewRef,
    isScanning,
    isTorchOn,
    isInitialized,
    isError,
    cameraPermissions,
    toggleScanning,
    toggleTorch,
    requestCameraPermission,
    cleanupScanner,
    resetScanner,
    setTorchState,
    preInitialize
  } = useBarcodeScannerSDK({ onScan: handleScan });

  useEffect(() => {
    if (!scannerInitializedRef.current) {
      scannerInitializedRef.current = true;
      const timer = setTimeout(() => {
        preInitialize().catch(err => {
          console.log("Pre-initialization failed:", err);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [preInitialize]);

  // Ensure the DOM is ready and prepared for Dynamsoft SDK
  useEffect(() => {
    if (scanReady && containerRef.current) {
      console.log("BarcodeScanner: Ensuring DOM structure for scanner");
      
      // 1. Create dce-video-container if needed
      let videoContainer = containerRef.current.querySelector('.dce-video-container');
      if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.className = 'dce-video-container';
        
        // Use proper type casting for HTMLElement to set inline styles
        const containerElement = videoContainer as HTMLElement;
        containerElement.style.position = 'absolute';
        containerElement.style.left = '0';
        containerElement.style.top = '0';
        containerElement.style.width = '100%';
        containerElement.style.height = '100%';
        containerElement.style.backgroundColor = 'black';
        
        containerRef.current.appendChild(videoContainer);
        console.log("BarcodeScanner: Created dce-video-container element");
      }
      
      // 2. Short delay to ensure DOM is ready before signaling
      setTimeout(() => {
        setDomReady(true);
        console.log("BarcodeScanner: DOM ready for scanner");
      }, 200);
    }
    
    return () => {
      if (scanReady) {
        setDomReady(false);
      }
    };
  }, [scanReady, isOpen]);

  // Start scanning when DOM is ready
  useEffect(() => {
    if (domReady && scanReady && !isScanning && isInitialized) {
      console.log("BarcodeScanner: DOM is ready, starting scanner");
      const timer = setTimeout(() => {
        toggleScanning();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [domReady, scanReady, isScanning, isInitialized, toggleScanning]);

  const handleOpenScanner = async () => {
    retryCountRef.current = 0;
    torchStateRef.current = false;
    try {
      await requestCameraPermission();
      setScanReady(true);
      setIsOpen(true);
    } catch (err) {
      console.error("Permission error:", err);
    }
  };

  const handleStopScanning = async () => {
    if (torchStateRef.current) {
      try {
        await setTorchState(false);
        torchStateRef.current = false;
      } catch (e) {
        console.log("Torch cleanup error:", e);
      }
    }
    await cleanupScanner();
    setScanReady(false);
    setDomReady(false);
    setIsOpen(false);
  };

  const handleTorchToggle = async () => {
    try {
      const newTorchState = !torchStateRef.current;
      const success = await setTorchState(newTorchState);
      if (success) {
        torchStateRef.current = newTorchState;
        toast.success(newTorchState ? "Torch turned on" : "Torch turned off", { duration: 1000 });
      } else {
        toast.error("Torch not available on this device");
      }
    } catch (error) {
      console.error("Torch toggle error:", error);
      toast.error("Could not toggle torch");
    }
  };

  const handleRetry = async () => {
    if (retryCountRef.current >= 3) {
      toast.error("Too many attempts. Please close and try again.");
      return;
    }
    retryCountRef.current++;
    toast.info("Restarting scanner...");
    await cleanupScanner();
    setDomReady(false);
    
    // Ensure we have a clean start
    if (containerRef.current) {
      const videoContainer = containerRef.current.querySelector('.dce-video-container');
      if (videoContainer) {
        videoContainer.remove();
      }
      
      // Create a fresh container with proper type casting
      const newContainer = document.createElement('div');
      newContainer.className = 'dce-video-container';
      
      const containerElement = newContainer as HTMLElement;
      containerElement.style.position = 'absolute';
      containerElement.style.left = '0';
      containerElement.style.top = '0';
      containerElement.style.width = '100%';
      containerElement.style.height = '100%';
      containerElement.style.backgroundColor = 'black';
      
      containerRef.current.appendChild(newContainer);
      console.log("BarcodeScanner: Recreated dce-video-container element");
    }
    
    // Reset and restart
    const success = await resetScanner();
    if (success) {
      torchStateRef.current = false;
      setTimeout(() => {
        setDomReady(true);
      }, 600);
    } else {
      toast.error("Failed to restart scanner. Please try again.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      handleOpenScanner();
    } else {
      handleStopScanning();
    }
  };

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  return (
    <>
      <Button 
        onClick={handleOpenScanner}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        <ScanBarcode className="w-5 h-5 mr-2" />
        Scan Barcode
      </Button>

      {useSheet ? (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="h-[85vh] sm:max-w-md flex flex-col p-0">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Scan Barcode</h2>
              <p className="text-sm text-gray-500 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              {scanReady && (
                <div ref={containerRef} className="scanner-container w-full relative" style={{ minHeight: '300px' }}>
                  <BarcodeScannerUI 
                    isScanning={isScanning}
                    isTorchOn={torchStateRef.current}
                    isInitialized={isInitialized}
                    isError={isError}
                    cameraPermissions={cameraPermissions}
                    viewRef={viewRef}
                    onToggleTorch={handleTorchToggle}
                    onCancel={handleStopScanning}
                    onRequestPermission={requestCameraPermission}
                    onRetry={handleRetry}
                  />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Position barcode within view for automatic scanning
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center justify-center">
              {scanReady && (
                <div ref={containerRef} className="scanner-container w-full relative" style={{ minHeight: '300px' }}>
                  <BarcodeScannerUI 
                    isScanning={isScanning}
                    isTorchOn={torchStateRef.current}
                    isInitialized={isInitialized}
                    isError={isError}
                    cameraPermissions={cameraPermissions}
                    viewRef={viewRef}
                    onToggleTorch={handleTorchToggle}
                    onCancel={handleStopScanning}
                    onRequestPermission={requestCameraPermission}
                    onRetry={handleRetry}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BarcodeScanner;
