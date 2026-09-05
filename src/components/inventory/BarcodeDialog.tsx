
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { BarcodeReader, BarcodeScanner as DynamsoftScanner } from 'dynamsoft-javascript-barcode';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import MlKitScanner from '@/components/barcode/MlKitScanner';

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

// Native (Android/iOS) always uses ML Kit, web always uses Dynamsoft - no
// runtime switching. See BarcodeScanner.tsx for the same split.
const useMlKit = Capacitor.isNativePlatform();

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Track whether to render the scanner to ensure clean mounting/unmounting
  const [shouldRenderScanner, setShouldRenderScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const dialogOpenRef = useRef(false);
  const videoContainerCreated = useRef<boolean>(false);
  const isDestroyingRef = useRef<boolean>(false);

  // Native: the ML Kit camera Activity is a real full-screen Android
  // Activity - it IS the UI while scanning. So there's no dialog of our
  // own to show; we just start it and wait for a result.
  useEffect(() => {
    if (!useMlKit || !isOpen) return;
    let isMounted = true;
    let mlkitListener: PluginListenerHandle | null = null;
    let resumeListener: PluginListenerHandle | null = null;

    (async () => {
      try {
        mlkitListener = await MlKitScanner.addListener('mlkitBarcodeDetected', (d: { code?: string; value?: string }) => {
          const code = (d && (d.code || d.value)) || null;
          if (code && isMounted) {
            onDetected(code);
            onClose();
          }
        });
        // Safety net: the native camera Activity finishes silently (no
        // event at all) if the user cancels it or it errors out - only a
        // successful detection was ever calling onClose(), so cancelling
        // left isOpen stuck true and the scan button unresponsive.
        // Returning to the app always fires a resume event regardless of
        // how the scan ended, so use that to close the dialog either way.
        resumeListener = await CapacitorApp.addListener('resume', () => {
          if (isMounted) {
            onClose();
          }
        });
        await MlKitScanner.startScan();
      } catch (e) {
        console.error('Error starting ML Kit scanner', e);
        if (isMounted) {
          setError('Failed to start the camera');
        }
      }
    })();

    return () => {
      isMounted = false;
      mlkitListener?.remove?.();
      resumeListener?.remove?.();
      MlKitScanner.stopScan().catch(() => {});
    };
  }, [isOpen, onDetected, onClose]);

  // Web-only Dynamsoft dialog scanner setup.
  useEffect(() => {
    dialogOpenRef.current = isOpen;
    if (useMlKit) return; // native never renders/needs the dialog scanner

    if (isOpen) {
      setShouldRenderScanner(true);
    } else {
      cleanupScanner();
      setShouldRenderScanner(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (useMlKit || !shouldRenderScanner || !dialogOpenRef.current) return;

    let isMounted = true;
    let scannerInstance: DynamsoftScanner | null = null;

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
        scannerInstance = await DynamsoftScanner.createInstance();
        console.log("Dialog scanner instance created");

        // Update settings for better performance
        const settings = await scannerInstance.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;
        await scannerInstance.updateRuntimeSettings(settings);

        if (isMounted && dialogOpenRef.current && !isDestroyingRef.current) {
          // Set up callback for barcode detection
          scannerInstance.onUnduplicatedRead = (txt) => {
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

    setupDynamsoft();

    return () => {
      isMounted = false;
      cleanupScanner(scannerInstance);
    };
  }, [shouldRenderScanner, onDetected, onClose]);

  // Clean up scanner resources
  const cleanupScanner = async (instance?: DynamsoftScanner | null) => {
    if (instance) {
      try {
        console.log("Cleaning up dialog scanner");
        try {
          await instance.hide();
          console.log("Dialog scanner hidden");
        } catch (e) {
          console.error("Error hiding dialog scanner:", e);
        }

        try {
          await instance.destroyContext();
          console.log("Dialog scanner destroyed");
        } catch (e) {
          console.error("Error destroying dialog scanner:", e);
        }
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

  // Native never renders a dialog of its own - the camera Activity is
  // native full-screen UI.
  if (useMlKit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-32px)] p-0 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl">
        <DialogHeader className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-100 dark:border-slate-850">
          <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Scan Barcode</DialogTitle>
          <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            Position the barcode in view of your camera
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-white dark:bg-slate-900 flex flex-col gap-3">
          {shouldRenderScanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="barcode-container relative overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-slate-950/90 shadow-inner"
              style={{ height: "350px" }}
            >
              <div className="absolute inset-0 bg-black/5 pointer-events-none z-10 rounded-2xl"></div>

              {/* Animated scanning laser guide */}
              <motion.div
                className="absolute inset-x-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] z-20"
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
                  className="w-64 h-64 border-2 border-white/40 rounded-xl"
                  animate={{
                    boxShadow: ["0 0 0 0 rgba(99,102,241,0)", "0 0 0 10px rgba(99,102,241,0.15)"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-indigo-400"></div>
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-indigo-400"></div>
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-indigo-400"></div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-indigo-400"></div>
                </motion.div>
              </div>

              <div
                ref={scannerContainerRef}
                className="absolute inset-0"
              >
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-40">
                    <div className="text-center p-4">
                      <p className="text-red-500 font-medium mb-2">{error}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
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
