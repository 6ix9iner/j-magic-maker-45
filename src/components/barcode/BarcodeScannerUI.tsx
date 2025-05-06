
import React from 'react';
import { Loader, Camera, CameraOff, Flashlight, FlashlightOff } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarcodeScannerUIProps {
  isScanning: boolean;
  isTorchOn: boolean;
  isInitialized: boolean;
  isError: boolean;
  cameraPermissions?: boolean | null;
  viewRef: React.RefObject<HTMLDivElement>;
  onToggleTorch: () => void;
  onCancel: () => void;
  onRequestPermission?: () => Promise<boolean>;
}

const BarcodeScannerUI: React.FC<BarcodeScannerUIProps> = ({
  isScanning,
  isTorchOn,
  isInitialized,
  isError,
  cameraPermissions,
  viewRef,
  onToggleTorch,
  onCancel,
  onRequestPermission
}) => {
  const [isRequestingPermission, setIsRequestingPermission] = React.useState(false);
  
  // Function to handle requesting camera permissions
  const requestCameraPermission = async () => {
    if (!onRequestPermission) return;
    
    try {
      setIsRequestingPermission(true);
      const granted = await onRequestPermission();
      
      if (!granted) {
        // If permission denied after request
        console.error('Camera permission request was denied');
      }
    } catch (err) {
      console.error('Failed to request camera permission:', err);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {isError || cameraPermissions === false ? (
        <div className="text-destructive text-center">
          <div className="flex flex-col items-center justify-center p-4">
            <CameraOff className="w-12 h-12 text-destructive mb-4" />
            <p className="font-medium">Camera access is required</p>
            <p className="text-sm mt-2 mb-4">Please allow camera access to use the barcode scanner.</p>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                If the camera permission dialog didn't appear, please check your browser settings and ensure camera access is allowed for this site.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={requestCameraPermission} 
              disabled={isRequestingPermission}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRequestingPermission ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Requesting Access...
                </>
              ) : (
                'Grant Camera Permission'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden">
          {!isInitialized && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <Loader className="w-8 h-8 text-blue-500 animate-spin mb-2" />
              <p className="text-white text-sm">Initializing camera...</p>
            </div>
          )}
          
          {/* Scanner View Container with special classes for the Dynamsoft scanner */}
          <div 
            ref={viewRef} 
            className="w-full h-full"
            style={{ position: 'relative', width: '100%', height: '100%' }}
          >
            {/* This div is important for the Dynamsoft scanner to identify the container */}
            <div className="dce-video-container" style={{ position: 'relative', width: '100%', height: '100%' }}></div>
          </div>
          
          {/* Scanning animation with prominent colors */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
              
              {/* Target area border with enhanced visibility */}
              <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-90">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
              </div>
              
              {/* Status indicator */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-4 py-1 rounded-full text-white text-xs">
                Scanning for barcodes...
              </div>
            </div>
          )}
          
          {/* Torch control */}
          {isInitialized && isScanning && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-4 z-10">
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
                    <p>{isTorchOn ? 'Turn Off Torch' : 'Turn On Torch'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}
      
      {!isError && cameraPermissions !== false && (
        <p className="text-sm text-center text-gray-600">
          Position barcode within the frame for automatic scanning.
        </p>
      )}
      
      <Button variant="outline" onClick={onCancel} className="mt-4">
        Cancel
      </Button>
    </div>
  );
};

export default BarcodeScannerUI;
