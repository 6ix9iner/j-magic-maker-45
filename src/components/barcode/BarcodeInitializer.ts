
import { BarcodeReader } from 'dynamsoft-javascript-barcode';
import { DYNAMSOFT_LICENSE_KEY } from './BarcodeConfigUtils';

// Flag to track if the reader has been initialized
let isInitialized = false;

/**
 * Initialize the Dynamsoft Barcode Reader library.
 * This should be called once at application startup.
 */
export const initializeBarcodeReader = async (): Promise<void> => {
  if (isInitialized) {
    console.log("Barcode reader already initialized, skipping");
    return;
  }
  
  try {
    console.log("Initializing Dynamsoft Barcode Reader...");
    // Set license key
    BarcodeReader.license = DYNAMSOFT_LICENSE_KEY;
    
    // Set engine resource path
    BarcodeReader.engineResourcePath = 'https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.42/dist/';
    
    // Mark as initialized
    isInitialized = true;
    console.log("Barcode reader initialized successfully");
  } catch (error) {
    console.error("Failed to initialize barcode reader:", error);
    throw error;
  }
};

/**
 * Check if the barcode reader has been initialized
 */
export const isBarcodeReaderInitialized = (): boolean => {
  return isInitialized;
};
