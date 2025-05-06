/**
 * Dynamsoft Barcode Reader configuration
 */
import { BarcodeReader, BarcodeScanner, EnumBarcodeFormat } from "dynamsoft-javascript-barcode";

// License key for Dynamsoft Barcode Reader
export const DYNAMSOFT_LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzOTU3ODgwLVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAzOTU3ODgwIiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjotMTgyODIwMDQwNH0=";

// Beep sound for successful scan - using a smaller MP3 file for better compatibility
export const BEEP_SOUND_URL = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAyMjIyMjIyMjIyMjIyMjIyMjI8PDw8PDw8PDw8PDw8PDw8PDw8P////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAeAAAAAAAAAAbAyfj2eAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MoxAAUw2KeVEsQAkIkDmTkUGOgBbOuTDLgeBB4PDgwI/CE4OHQcBAMYE/B/4P+QfgQdCDoQd/oEPKv/rSrkPvt4uJLjzYcgLJkBLhsz8QHLHONELRyivykv2s/2+K4mb6HsbiiuOy8aVbk6sQE1ZhjqbMRdQAjgh1A+hQJHLMAQ6ipxEcSDJEqAT5QSCwGUCVDECOXKRQYQ0Q7vQxA5dVMAQQoWysxCZgp2NE0GG0F+WqUylUUGIaRky1A4FAMYUA5VAhwzRAEsFzORgViVByk4Syr/czU0kmlcr9ec08nVXNz/+MoxA8ZKyq0AGsQvDU3O9KmZffHp7TW73LnZplsyttZ59+/HvvFet22dtZ2y7LWtrrW7vSt1tc7Nd3Z613ed6960r8fus61L9estmvXdnbtlta3ve7TTibmeWvVzbmcl7R5Wa1dy53Z13qs6mZ3Jbl1y23ttZltv9a2+cZ+7acltnWdJJDctu7usDvaV2WtZ29ttrNNNt/bOt6mcYf9Xm1O9La2m7bskziRNiZHuXNvOS3d2W7u2dpzNsXNaZr73/vZX/G1Ju93O//f+7la2yNNexFU7yADsU7/+MoxAYRsXbVvsGHBCNYkVkpBYryXCU6KJdCGzWS0snWlaVq0VZbR9nWTPOlrO1LW5Wa35Zm3TMv3da1fX/Za1Kel//+t//fTZ/t5r7f/erzXbf//733W3//Vo9q618fn1uzPivf07d+a1+TVPU2qdEjQ0likVNPGoquaqvmohxB6aoMXnEHVOVIm5oyLryZGUXUFTMy/NLTtO131///8wf////9L+vNXf////+3/+73//u5H28UJgpa1YkokGUWSSDJgzaZnJqr/+MoxBQSU0L4AMJSkMqt8lqla1NXlq03MjShS1TVZRRRSKkkiqEyKORuZDeZLJZFaG9NTdlaVr///+1////uZf////////9////ef///////vmUiQRDJVokIEkTImExI0kUjQmRpLZLSdJSdaVdVXZTUtNU1TNJVdcy6UUVJoZC1KVNDOojEVTM5/1Zn/////9sv////tf///////7lf////////FVrJdKJNEOhAikEinkZRI0iyLREkskojbrbrWq/qkaUiVVVMmaRQkBm2USSK/+MoxBsSYyMAAMJSfKwVVMXoTHmoiQZdmYiQRdWMhqpDKZFa0uXTO40kSpLZm2qqppKQwgUVSrA0esBFAszWqaa1Uqmt1NJUv/loqmRNFIqqJkS1qVCYTEx0KIiZipClFVE6hpFxNNBP7+mkIqUVVaKrmVKmTJCFAJiYoLhoiKtQpf3pEwwCAchQgUxYY1AoLFhIUI7GiFBlPCYzLTXZk+lV1TUfsVWqaW6St//////////////8zUtSFKBFEUioTBAYR11IZjaUcxQmDxEPOCgH/+MoxBgRsvFHhSiAA5MCRYFCQwJDQBD+CB/4JP/ggf8CQ/LlxVNiiI0H0DSCvDQ0LlzGxE6JBESPieGJlbNMk1v////9JKv/////6qmVQyNqlJlUTKoyVKUpUqVRsqjZJSSVRskqqNkmSqSRlZVIzJWyyVqlmSSGwcmVbFAUDBKArEVCSIYNa10hCqxT5RkrcwKmeEohAkslkkk0lkkkrqvqTf/+pKv///////9SSSaJJJdI1I0jXSNdIwNPRRREREVUVUtlQXUL/+MoxBwS0dLtXT2AA1ME5Kkk1YqRUioFQKgVZ6RUCpFQKoVIqBVipFSKgVQqRUY4qRUCpKoVIqBVipJNSKgVIqBVFUVRVFUVRVFUVRVFUkmpFSKkqiVJVFUVRVFUVRVFUVRVFUVRU9NX0XpoWBITxXlk0V8CRtCgUip9JH+j/R/o/0FfN/qS+CQtiuK60f6P9H+lfSfkLb6JoKi2Ymhkzk0kf/0f6P9JSRzJP0pvUvEcaONHGjjRxo40cBIYCQwEhgJDAKICQwEhgJDASOBYuEnBJJP/+MoxB4RyMGkBUlAAbipLSqKkiclElgVF0mmVWVTLJKqJP6qSKCSRUVAKi4clHxDQKBJEkTcdR8Q0KDYZxPlDQcHJbf///9ezdqUQpjNOdV/lPWd//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+MoxB8QEKkUA0tAAA==";

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
  // Scanning settings - improved for faster scanning
  scanSettings: {
    intervalTime: 10, // Even faster scanning interval (was 20ms)
    maxNumberOfResults: 1
  },
  // Performance settings - optimized for speed
  timeout: 3000, // Further reduced timeout for faster startup (was 6000ms)
  deblurLevel: 1, // Lowest deblur level for maximum speed (was 2)
  maxAlgorithmThreadCount: 1, // Single thread for faster startup
  // Video settings - improved for performance
  videoSettings: {
    video: {
      facingMode: 'environment',
      width: { ideal: 480 }, // Lower resolution for faster loading (was 640)
      height: { ideal: 360 }, // Lower resolution for faster loading (was 480)
      fill: true,
      objectFit: 'cover' 
    }
  }
};

// Flag to track SDK initialization
let isDynamsoftInitialized = false;
let initializationInProgress = false;

// Global instance reference to improve reuse
let globalReaderInstance: BarcodeReader | null = null;
let globalScannerInstance: BarcodeScanner | null = null;

/**
 * Initialize the Dynamsoft BarcodeReader SDK with optimized performance
 * This function now tracks initialization state to prevent multiple license settings
 */
export const initializeDynamsoft = async () => {
  // If initialization is already in progress, wait for it
  if (initializationInProgress) {
    console.log("SDK initialization already in progress, waiting...");
    // Wait for initialization to complete
    while (initializationInProgress) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return isDynamsoftInitialized;
  }

  // If already initialized, return immediately
  if (isDynamsoftInitialized) {
    console.log("Dynamsoft SDK already initialized");
    return true;
  }

  try {
    initializationInProgress = true;
    console.log("Initializing Dynamsoft SDK...");
    
    // Only set license if not initialized yet
    if (!isDynamsoftInitialized) {
      // Set license key ONLY ONCE
      BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
      
      // Disable debug log to improve performance
      try {
        // @ts-ignore
        BarcodeReader.isDebugMode = false;
      } catch (e) {
        console.warn("Could not disable debug mode:", e);
      }
      
      // Set resource path - optimize for faster loading
      BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@latest/dist/";
      
      // Enhanced browser compatibility settings
      try {
        // @ts-ignore - may not exist in type definition but useful for compatibility
        BarcodeReader.browserFriendly = true;
        // @ts-ignore
        BarcodeReader.loadWasmPriority = "speed"; // Prioritize speed over accuracy
      } catch (e) {
        console.warn("Could not set some browser compatibility options:", e);
      }
    }
    
    // Load WASM resources early
    try {
      await BarcodeReader.loadWasm();
    } catch (e) {
      console.warn("Early WASM loading failed, will retry:", e);
    }
    
    // Mark as initialized to prevent multiple license settings
    isDynamsoftInitialized = true;
    console.log("Dynamsoft SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Dynamsoft SDK:", error);
    return false;
  } finally {
    initializationInProgress = false;
  }
};

/**
 * Get the global reader instance or create one if it doesn't exist
 */
export const getReaderInstance = async (): Promise<BarcodeReader> => {
  // Make sure SDK is initialized first
  if (!isDynamsoftInitialized) {
    await initializeDynamsoft();
  }
  
  try {
    // Create a new reader instance if needed
    if (!globalReaderInstance) {
      console.log("Creating new BarcodeReader instance");
      globalReaderInstance = await BarcodeReader.createInstance();
      console.log("Successfully created reader instance");
    }
    
    return globalReaderInstance;
  } catch (error) {
    console.error("Error creating reader instance:", error);
    throw error;
  }
};

/**
 * Get the global scanner instance or create one if it doesn't exist
 */
export const getScannerInstance = async (): Promise<BarcodeScanner> => {
  // Make sure SDK is initialized first
  if (!isDynamsoftInitialized) {
    await initializeDynamsoft();
  }
  
  try {
    // Create a new scanner instance if needed
    if (!globalScannerInstance) {
      console.log("Creating new BarcodeScanner instance");
      globalScannerInstance = await BarcodeScanner.createInstance();
      console.log("Successfully created scanner instance");
    }
    
    return globalScannerInstance;
  } catch (error) {
    console.error("Error creating scanner instance:", error);
    
    // If we failed, try once more after a brief delay
    await new Promise(resolve => setTimeout(resolve, 100));
    globalScannerInstance = await BarcodeScanner.createInstance();
    return globalScannerInstance;
  }
};

/**
 * Clean up Dynamsoft resources
 */
export const cleanupDynamsoft = async () => {
  // Clean up scanner instance
  if (globalScannerInstance) {
    try {
      if (globalScannerInstance.isOpen) {
        await globalScannerInstance.stop();
      }
      await globalScannerInstance.destroyContext();
      globalScannerInstance = null;
      console.log("Cleaned up scanner resources");
    } catch (error) {
      console.error("Error cleaning up scanner resources:", error);
    }
  }
  
  // Clean up reader instance
  if (globalReaderInstance) {
    try {
      await globalReaderInstance.destroyContext();
      globalReaderInstance = null;
      console.log("Cleaned up reader resources");
    } catch (error) {
      console.error("Error cleaning up reader resources:", error);
    }
  }
  
  // Don't reset initialization flag - we want to keep the license
};
