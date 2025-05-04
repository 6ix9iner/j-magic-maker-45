
import React from 'react';
import { Loader, ZoomIn, ZoomOut, Focus } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface BarcodeScannerUIProps {
  isScanning: boolean;
  hasVideoFeed: boolean;
  zoom: number;
  focusMode: string;
  error: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFocus: () => void;
  onCancel: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const BarcodeScannerUI: React.FC<BarcodeScannerUIProps> = ({
  isScanning,
  hasVideoFeed,
  zoom,
  focusMode,
  error,
  onZoomIn,
  onZoomOut,
  onToggleFocus,
  onCancel,
  videoRef,
  canvasRef
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {error ? (
        <div className="text-destructive text-center">
          <p>{error}</p>
          <p className="text-sm mt-2">Please ensure you've granted camera permissions.</p>
        </div>
      ) : (
        <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-lg overflow-hidden">
          {isScanning && !hasVideoFeed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          ></video>
          <canvas 
            ref={canvasRef} 
            className="hidden" 
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Scanning animation with prominent Samsung-friendly colors */}
            <div className="w-full h-1.5 bg-blue-600 opacity-80 animate-bounce"></div>
            
            {/* Target area border with enhanced visibility for Samsung screens */}
            <div className="absolute top-1/4 bottom-1/4 left-1/6 right-1/6 border-2 border-blue-500 opacity-90">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
            </div>
            
            {/* Status indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 px-4 py-1 rounded-full text-white text-xs">
              {focusMode === 'continuous' ? 'Auto Focus' : 'Manual Focus'} | Zoom: {zoom}x
            </div>
          </div>
          
          {/* Camera controls - optimized for Samsung */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-4 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={onZoomOut}
                    className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                  >
                    <ZoomOut className="w-5 h-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={onToggleFocus}
                    className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                  >
                    <Focus className="w-5 h-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle Focus Mode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={onZoomIn}
                    className="bg-black bg-opacity-60 border border-white/20 rounded-full"
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      
      <p className="text-sm text-center text-gray-600">
        Position barcode within the frame. Adjust zoom for blurry codes.
      </p>
      
      <Button variant="outline" onClick={onCancel} className="mt-4">
        Cancel
      </Button>
    </div>
  );
};

export default BarcodeScannerUI;
