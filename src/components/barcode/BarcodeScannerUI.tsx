
import React, { useState } from 'react';
import { Loader, CameraOff, Flashlight, FlashlightOff, RefreshCw, Camera } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface BarcodeScannerUIProps {
  isScanning: boolean;
  isInitialized: boolean;
  isError: boolean;
  isTorchOn?: boolean;
  viewRef: React.RefObject<HTMLDivElement>;
  cameraPermissions?: boolean | null;
  onToggleTorch: () => void;
  onCancel: () => void;
  onRequestPermission?: () => Promise<boolean>;
  onRetry?: () => void;
}

const BarcodeScannerUI: React.FC<BarcodeScannerUIProps> = ({
  isScanning,
  isInitialized,
  isError,
  isTorchOn = false,
  viewRef,
  cameraPermissions,
  onToggleTorch,
  onCancel,
  onRequestPermission,
  onRetry
}) => {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Function to handle requesting camera permissions
  const requestCameraPermission = async () => {
    if (!onRequestPermission) return;
    
    try {
      setIsRequestingPermission(true);
      await onRequestPermission();
      // If we got this far without an error, permissions should be granted
      // Let's attempt to retry the scanner
      if (onRetry) {
        setTimeout(() => {
          onRetry();
        }, 100); // Reduced from 200ms to 100ms for faster retry
      }
    } catch (error) {
      console.error("Permission request failed:", error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Show permission error or camera issues
  if (isError || cameraPermissions === false) {
    return (
      <div className="w-full flex flex-col items-center justify-center space-y-4">
        <div className="text-center p-4">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <CameraOff className="w-10 h-10 text-red-500" />
            </div>
            <p className="font-medium text-lg">Camera access required</p>
            <Alert variant="destructive" className="my-4 max-w-xs">
              <AlertDescription>
                Please allow camera access to scan barcodes. Check your browser settings if no permission prompt appears.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button 
                onClick={requestCameraPermission} 
                disabled={isRequestingPermission}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Allow Camera Access
                  </>
                )}
              </Button>
              
              {onRetry && (
                <Button 
                  onClick={onRetry}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Scanner
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4 max-w-xs">
              Tip: If the permission prompt doesn't appear, check your browser settings and make sure camera access is allowed for this site.
            </p>
          </div>
        </div>
        
        <Button variant="outline" onClick={onCancel} className="mt-2">
          Close
        </Button>
      </div>
    );
  }

  // Show scanner UI
  return (
    <div className="w-full flex flex-col items-center space-y-4" data-scanner-container>
      {/* Scanner view container */}
      <div className="w-full max-w-sm">
        <AspectRatio ratio={4/3} className="overflow-hidden rounded-lg">
          {/* Loading state */}
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="flex flex-col items-center">
                <Loader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-white">Initializing camera...</p>
              </div>
            </div>
          )}
          
          {/* Scanner container */}
          <div 
            className="scanner-container relative bg-black w-full h-full"
            data-scanner-container
          >
            {/* Video container for Dynamsoft */}
            <div 
              ref={viewRef} 
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              data-scanner-view
              id="dynamsoft-scanner-container"
              style={{ backgroundColor: 'black' }}
            />
            
            {/* Scanner overlay */}
            {isScanning && isInitialized && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                {/* Scan line animation */}
                <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
                
                {/* Target area */}
                <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-90">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                </div>
                
                {/* Status indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-4 py-1 rounded-full">
                  <p className="text-white text-xs">Scanning...</p>
                </div>
              </div>
            )}
            
            {/* Torch control */}
            {isScanning && isInitialized && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center z-20">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        onClick={onToggleTorch}
                        className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                      >
                        {isTorchOn ? (
                          <FlashlightOff className="w-5 h-5 text-white" />
                        ) : (
                          <Flashlight className="w-5 h-5 text-white" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isTorchOn ? 'Turn Off Flash' : 'Turn On Flash'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </AspectRatio>
      </div>
      
      <p className="text-sm text-center text-gray-600">
        Position barcode within the frame for automatic scanning
      </p>
      
      <div className="flex gap-3 w-full justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        
        {isInitialized && onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerUI;
