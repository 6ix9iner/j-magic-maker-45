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
    intervalTime: 50, // Reduced from 100ms for faster scanning
    maxNumberOfResults: 1
  },
  // Enhanced performance settings
  timeout: 15000, // Increased from 10000ms for better reliability
  deblurLevel: 3,
  maxAlgorithmThreadCount: 2,
  // Video settings
  videoSettings: {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      fill: true,
      objectFit: 'cover' // Explicitly set for consistent behavior
    }
  }
};

/**
 * Initialize the Dynamsoft BarcodeReader SDK
 * This function now includes better error handling and retry logic
 */
export const initializeDynamsoft = async () => {
  // Track initialization attempts
  let attempts = 0;
  const maxAttempts = 2;
  
  const tryInitialize = async () => {
    try {
      console.log(`Initializing Dynamsoft SDK (attempt ${attempts + 1}/${maxAttempts})...`);
      
      // Set license key
      BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
      
      // Set up the engine and resource paths with more reliable CDN
      BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/";
      
      // Force clean resources by destroying any existing instances
      // Instead of using releaseAllInstances (which doesn't exist), we'll get
      // existing instances and destroy them individually
      try {
        const instances = await BarcodeReader.getInstancesCount();
        if (instances > 0) {
          console.log(`Found ${instances} existing reader instances, cleaning up...`);
          const allReaders = await BarcodeReader.getInstanceIds();
          for (const id of allReaders) {
            try {
              const reader = await BarcodeReader.getInstance(id);
              await reader.destroy();
              console.log(`Destroyed reader instance ${id}`);
            } catch (err) {
              console.warn(`Failed to destroy reader ${id}:`, err);
            }
          }
        }
      } catch (releaseError) {
        console.warn("Error accessing reader instances:", releaseError);
      }
      
      // Configure resource path to ensure worker scripts are loaded correctly
      await BarcodeReader.loadWasm();
      
      console.log("Dynamsoft SDK initialized successfully");
      return true;
    } catch (error) {
      console.error(`Failed to initialize Dynamsoft SDK (attempt ${attempts + 1}/${maxAttempts}):`, error);
      
      // Increment attempts counter
      attempts++;
      
      // If we haven't reached max attempts, try again after a delay
      if (attempts < maxAttempts) {
        console.log("Retrying initialization after delay...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return tryInitialize();
      }
      
      throw error;
    }
  };
  
  return tryInitialize();
};
