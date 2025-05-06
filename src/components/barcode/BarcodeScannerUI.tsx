
import React from 'react';
import { Loader, Flashlight, FlashlightOff } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface BarcodeScannerUIProps {
  isScanning: boolean;
  isTorchOn: boolean;
  isInitialized: boolean;
  isError: boolean;
  viewRef: React.RefObject<HTMLDivElement>;
  onToggleTorch: () => void;
  onCancel: () => void;
}

const BarcodeScannerUI: React.FC<BarcodeScannerUIProps> = ({
  isScanning,
  isTorchOn,
  isInitialized,
  isError,
  viewRef,
  onToggleTorch,
  onCancel
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {isError ? (
        <div className="text-destructive text-center">
          <p>Failed to initialize barcode scanner.</p>
          <p className="text-sm mt-2">Please ensure you've granted camera permissions.</p>
        </div>
      ) : (
        <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden">
          {!isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}
          
          {/* Scanner View Container */}
          <div 
            ref={viewRef} 
            className="w-full h-full"
          ></div>
          
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
                Dynamsoft Scanner
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
      
      <p className="text-sm text-center text-gray-600">
        Position barcode within the frame for automatic scanning.
      </p>
      
      <Button variant="outline" onClick={onCancel} className="mt-4">
        Cancel
      </Button>
    </div>
  );
};

export default BarcodeScannerUI;
