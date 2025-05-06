/**
 * Dynamsoft Barcode Reader configuration
 */
import { BarcodeReader, EnumBarcodeFormat } from "dynamsoft-javascript-barcode";

// License key for Dynamsoft Barcode Reader
export const DYNAMSOFT_LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTU3ODgwLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzOTU3ODgwIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjotMTgyODIwMDQwNH0=";

// Beep sound for successful scan (base64 encoded)
export const BEEP_SOUND_URL = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAKAAAJTAAXFxcXJCQkJCQwMDAwPT09PT1JSUlJVlZWVlZiYmJib29vb295eXl5hoaGhoaTk5OToKCgoKCsrKystbW1tbXBwcHBzs7Ozs7a2tra5ubm5ub09PT0/v7+/v8AAAAAUE1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMuJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7kMQAAAiNHWG1iYAI447zTqTQARbSfG5WJgAnBF+nDRJgBOx3J8KxGFTru0KhQKhwMBgMDx8fH8fBwH/4OA+D/8H/wfB//8Hwf//B8H//B8H//wH/4EA//xAP/8QD//EA//xAP/8QD//EA//wF2xBUHZH6kR9SEkj6R/iNH3d3d0REd3d3d0REX//////////////////+qqq7u7uqqqqqqu7u7qqqqqqu7u7qqqqqqqIiIiO7u7oiIiIju7u6IiIiI7u7uiIiIiHREX/////////////////////////////////////////////////////////////////////////8AAgIJiBBQGJYF4X+AQcZEfH5YFwX//B8H//B///////8QD//iAf/4CAf/4CJAOHj4/jwOAgGAwKhQKHcnBZx9CzuQoFAoHB6qqrUIddVVVVbh2191VVVVdw7fh2qqqqrhLexwl1VVVXVVlC3ucJdVVVVVVTtcOsO7h1VVVVVVWpVV3d3VEREREVVVVXV1dERERFVVVVdXV0REREVVVVXd3dERERE=";

// Configure barcode formats
export const BARCODE_READER_CONFIG = {
  // Set formats to scan for using EnumBarcodeFormat
  barcodeFormats: [
    EnumBarcodeFormat.BF_QR_CODE,
    EnumBarcodeFormat.BF_EAN_13,
    EnumBarcodeFormat.BF_EAN_8,
    EnumBarcodeFormat.BF_UPC_A,
    EnumBarcodeFormat.BF_UPC_E,
    EnumBarcodeFormat.BF_CODE_128,
    EnumBarcodeFormat.BF_CODE_39,
    EnumBarcodeFormat.BF_CODE_93,
    EnumBarcodeFormat.BF_DATAMATRIX,
    EnumBarcodeFormat.BF_PDF417,
    EnumBarcodeFormat.BF_AZTEC
  ],
  // Scanning settings
  scanSettings: {
    intervalTime: 40, // Even faster scanning (was 50ms)
    maxNumberOfResults: 1
  },
  // Enhanced performance settings
  timeout: 12000, // Balanced timeout
  deblurLevel: 3,
  maxAlgorithmThreadCount: 3, // Increased from 2 for better performance
  // Video settings
  videoSettings: {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Global instance reference to improve reuse
let globalReaderInstance: BarcodeReader | null = null;

/**
 * Initialize the Dynamsoft BarcodeReader SDK
 * This function now includes better initialization with global instance management
 */
export const initializeDynamsoft = async () => {
  try {
    console.log("Initializing Dynamsoft SDK...");
    
    // Set license key
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Set resource path
    BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
    
    // Check if there's already a global instance we can reuse
    if (globalReaderInstance) {
      console.log("Reusing existing reader instance");
      return true;
    }
    
    // Instead of trying to use methods that don't exist in the SDK
    // Create a new reader instance that we'll keep globally
    try {
      console.log("Creating new BarcodeReader instance");
      globalReaderInstance = await BarcodeReader.createInstance();
      console.log("Successfully created reader instance");
    } catch (error) {
      console.error("Error creating reader instance:", error);
      // If we failed, try to reset everything and try again
      try {
        console.log("Attempting to reset SDK state");
        // Create a temporary reader to reset the SDK state
        const tempReader = await BarcodeReader.createInstance();
        if (tempReader) {
          await tempReader.destroyContext();
          console.log("Reset SDK state successfully");
        }
        // Try again after reset
        globalReaderInstance = await BarcodeReader.createInstance();
      } catch (resetError) {
        console.error("Failed to reset SDK state:", resetError);
        throw resetError;
      }
    }
    
    // Load WASM resources
    await BarcodeReader.loadWasm();
    console.log("Dynamsoft SDK initialized successfully");
    
    return true;
  } catch (error) {
    console.error("Failed to initialize Dynamsoft SDK:", error);
    throw error;
  }
};

/**
 * Get the global reader instance or create one if it doesn't exist
 */
export const getReaderInstance = async (): Promise<BarcodeReader> => {
  if (!globalReaderInstance) {
    await initializeDynamsoft();
  }
  
  if (!globalReaderInstance) {
    throw new Error("Failed to get reader instance");
  }
  
  return globalReaderInstance;
};

/**
 * Clean up Dynamsoft resources
 */
export const cleanupDynamsoft = async () => {
  if (globalReaderInstance) {
    try {
      await globalReaderInstance.destroyContext();
      globalReaderInstance = null;
      console.log("Cleaned up Dynamsoft resources");
    } catch (error) {
      console.error("Error cleaning up Dynamsoft resources:", error);
    }
  }
};
