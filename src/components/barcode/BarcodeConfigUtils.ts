
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

/**
 * Creates hints for the ZXing barcode reader with optimized settings
 */
export const createBarcodeReaderHints = (): Map<DecodeHintType, any> => {
  const hints = new Map();
  
  // Set hints to focus on common formats
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, 
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.PDF_417,
    BarcodeFormat.AZTEC,
    BarcodeFormat.ITF,  // Added for industrial barcodes
    BarcodeFormat.CODABAR, // Added for legacy systems
    BarcodeFormat.MAXICODE // Added for shipping labels
  ]);

  // Additional hints for better performance
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.ASSUME_GS1, true);
  // Allow pure barcode scanning (no background)
  hints.set(DecodeHintType.PURE_BARCODE, true);
  // Character set
  hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
  
  return hints;
};

/**
 * Get camera constraints optimized for Samsung S10
 */
export const getCameraConstraints = (zoom: number, focusMode: string): MediaTrackConstraints => {
  return {
    facingMode: { exact: 'environment' }, // Force back camera only for better results
    width: { ideal: 3840 }, // Request 4K resolution
    height: { ideal: 2160 },
    frameRate: { ideal: 30, min: 15 } // Balanced framerate for processing
    // Note: focusMode and zoom are applied separately via applyConstraints
  };
};

/**
 * Apply camera focus and zoom settings
 */
export const applyCameraSettings = async (
  track: MediaStreamTrack, 
  zoom: number, 
  focusMode: string
): Promise<void> => {
  try {
    const capabilities = track.getCapabilities();
    console.log("Camera capabilities:", capabilities);
    
    // Apply focus mode if supported - Fixed TypeScript errors with proper type checking
    if ('focusMode' in capabilities && capabilities.focusMode) {
      try {
        // Different browsers/devices support different focus mode strings
        const focusModeArray = capabilities.focusMode as string[];
        const desiredFocusMode = focusMode === 'continuous' ? 'continuous' : 'manual';
        
        if (focusModeArray.includes(desiredFocusMode)) {
          // Apply the constraint using advanced property with proper type assertion
          await track.applyConstraints({
            advanced: [{ focusMode: desiredFocusMode } as MediaTrackConstraintSet]
          });
          console.log(`Focus set to ${desiredFocusMode} mode`);
        }
      } catch (e) {
        console.error("Focus mode not supported:", e);
      }
    }
    
    // Apply zoom if supported - Fixed TypeScript errors with proper type checking
    if ('zoom' in capabilities && capabilities.zoom) {
      try {
        // Get zoom capabilities
        const zoomCapability = capabilities.zoom as {min: number, max: number, step: number};
        
        // Ensure zoom is within valid range
        const validZoom = Math.min(
          Math.max(zoom, zoomCapability.min || 1),
          zoomCapability.max || 10
        );
        
        // Apply the constraint using proper type assertion
        await track.applyConstraints({
          advanced: [{ zoom: validZoom } as MediaTrackConstraintSet]
        });
        console.log(`Zoom set to ${validZoom}x`);
      } catch (e) {
        console.error("Zoom not supported:", e);
      }
    }
  } catch (err) {
    console.error("Error setting camera parameters:", err);
  }
};

// Beep sound for successful scan (base64 encoded)
export const BEEP_SOUND_URL = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAJTAAXFxcXJCQkJCQwMDAwPT09PT1JSUlJVlZWVlZiYmJib29vb295eXl5hoaGhoaTk5OToKCgoKCsrKystbW1tbXBwcHBzs7Ozs7a2tra5ubm5ub09PT0/v7+/v8AAAAAUE1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMuJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kMQAAAiNHWG1iYAI447zTqTQARbSfG5WJgAnBF+nDRJgBOx3J8KxGFTru0KhQKhwMBgMDx8fH8fBwH/4OA+D/8H/wfB//8Hwf//B8H//B8H//wH/4EA//xAP/8QD//EA//xAP/8QD//EA//wF2xBUHZH6kR9SEkj6R/iNH3d3d0REd3d3d0REX//////////////////+qqq7u7uqqqqqqu7u7qqqqqqu7u7qqqqqqqIiIiO7u7oiIiIju7u6IiIiI7u7uiIiIiHREX/////////////////////////////////////////////////////////////////////////8AAgIJiBBQGJYF4X+AQcZEfH5YFwX//B8H//B///////8QD//iAf/4CAf/4CJAOHj4/jwOAgGAwKhQKHcnBZx9CzuQoFAoHB6qqrUIddVVVVbh2191VVVVdw7fh2qqqqrhLexwl1VVVXVVlC3ucJdVVVVVVTtcOsO7h1VVVVVVWpVV3d3VEREREVVVVXV1dERERFVVVVdXV0REREVVVVXd3dERERE=";
