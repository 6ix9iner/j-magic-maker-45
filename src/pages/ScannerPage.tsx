import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ScanBarcode, Camera, Trash2, BarChart3, ClipboardList, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BarcodeScanner } from 'dynamsoft-javascript-barcode';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import ProductLookup from '@/components/ProductLookup';
import SaleManager from '@/components/SaleManager';
import { initializeBarcodeReader, isBarcodeReaderInitialized } from '@/components/barcode/BarcodeInitializer';
import { Capacitor } from '@capacitor/core';
import MlKitScanner from '@/components/barcode/MlKitScanner';

// Type definition for a scanned item
export interface ScannedItem {
  id: string;
  code: string;
  symbology: string;
  timestamp: Date;
}

const ScannerPage = () => {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeScannedBarcode, setActiveScannedBarcode] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const dialogOpenRef = useRef(false);
  const saleManagerRef = useRef<any>(null);

  // Initialize barcode reader
  useEffect(() => {
    let isInitStarted = false;
    
    const initBarcodeReader = async () => {
      if (isInitStarted || isBarcodeReaderInitialized()) return;
      isInitStarted = true;
      
      setIsInitializing(true);
      try {
        await initializeBarcodeReader();
        console.log("Barcode scanner initialized in ScannerPage");
        setIsScannerReady(true);
      } catch (e) {
        console.error("Failed to initialize barcode scanner:", e);
        toast.error("Failed to initialize scanner. Please try again.");
      } finally {
        setIsInitializing(false);
      }
    };
    
    initBarcodeReader();
    
    return () => {
      isInitStarted = false;
    };
  }, []);

  // Track dialog open state
  useEffect(() => {
    dialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

  const openScanner = () => {
    setIsDialogOpen(true);
  };

  const closeScanner = () => {
    setIsDialogOpen(false);
  };

  const handleScan = (code: string, symbology: string = "Unknown") => {
    const newItem: ScannedItem = {
      id: uuidv4(),
      code,
      symbology,
      timestamp: new Date(),
    };
    
    setScannedItems((prevItems) => [newItem, ...prevItems]);
    setActiveScannedBarcode(code);
    toast.success(`Barcode Scanned: ${code}`, {
      description: symbology,
      icon: <ScanBarcode className="h-4 w-4" />,
    });
    closeScanner();
  };

  const clearScannedItems = () => {
    setScannedItems([]);
    toast.info("Scan history cleared");
  };

  const deleteScannedItem = (id: string) => {
    setScannedItems((prevItems) => prevItems.filter(item => item.id !== id));
    toast.info("Item removed from history");
  };

  const handleAddToSale = (product: any, quantity: number) => {
    if (saleManagerRef.current) {
      saleManagerRef.current.addItem(product, quantity);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900">
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
        <header className="px-4 py-3">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Barcode Scanner
            </h1>
          </div>
        </header>
      </div>
      
      <main className="flex-1 container mx-auto p-4 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scanner and Product Lookup */}
          <div className="flex flex-col gap-6">
            {/* Scanner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-slate-900">
                <CardContent className="p-0">
                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <motion.div 
                      className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ScanBarcode className="h-12 w-12 text-white" />
                    </motion.div>
                    
                    <div>
                      <h2 className="text-xl font-bold mb-2">Premium Barcode Scanner</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Scan barcodes with high accuracy and speed
                      </p>
                      
                      <Button 
                        onClick={openScanner}
                        className="w-full sm:w-auto text-base font-medium px-8 py-6 h-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all"
                        disabled={isInitializing}
                      >
                        <ScanBarcode className="w-5 h-5 mr-2" />
                        {isInitializing ? "Initializing Scanner..." : "Scan Barcode"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white text-center">
                    <p className="text-sm font-medium">
                      {scannedItems.length === 0 
                        ? "No items scanned yet" 
                        : `${scannedItems.length} item${scannedItems.length !== 1 ? 's' : ''} in scan history`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Product Lookup */}
            {activeScannedBarcode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle>Product Lookup</CardTitle>
                    <CardDescription>Barcode: {activeScannedBarcode}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductLookup
                      barcodeValue={activeScannedBarcode}
                      onAddToSale={handleAddToSale}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {/* Recent Scans */}
            {scannedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-slate-900">
                  <CardHeader className="bg-white dark:bg-slate-900 border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold">Recent Scans</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearScannedItems}
                        className="h-8 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="divide-y">
                        {scannedItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex justify-between"
                          >
                            <div className="cursor-pointer" onClick={() => setActiveScannedBarcode(item.code)}>
                              <p className="font-mono text-sm font-medium">{item.code}</p>
                              <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full mr-2">{item.symbology}</span>
                                <span>{format(item.timestamp, 'HH:mm:ss')}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteScannedItem(item.id)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
          
          {/* Right Column - Current Sale */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <SaleManager ref={saleManagerRef} />
            </motion.div>
          </div>
        </div>
        
        {/* Stats - Moved to bottom section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
            <CardHeader className="border-b bg-white dark:bg-slate-800">
              <CardTitle>Scan Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold opacity-80">Total Scans</p>
                  <p className="text-3xl font-bold mt-1">{scannedItems.length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold opacity-80">Unique Codes</p>
                  <p className="text-3xl font-bold mt-1">
                    {new Set(scannedItems.map(item => item.code)).size}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold opacity-80">Code Types</p>
                  <p className="text-3xl font-bold mt-1">
                    {new Set(scannedItems.map(item => item.symbology)).size}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl text-center">
                  <p className="text-xs uppercase font-semibold opacity-80">Today's Scans</p>
                  <p className="text-3xl font-bold mt-1">
                    {scannedItems.filter(item => {
                      const today = new Date();
                      return item.timestamp.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
              </div>
              
              {/* Most common barcode types */}
              {scannedItems.length > 0 && (
                <div className="mt-6 bg-white dark:bg-slate-800/50 p-4 rounded-xl">
                  <h3 className="text-sm font-medium mb-3">Most Common Barcode Types</h3>
                  {Array.from(
                    scannedItems.reduce((acc, item) => {
                      acc.set(item.symbology, (acc.get(item.symbology) || 0) + 1);
                      return acc;
                    }, new Map<string, number>())
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([symbology, count], index) => (
                      <div key={symbology} className="mb-2 last:mb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{symbology}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${(count / scannedItems.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      
      <footer className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <motion.div 
          className="container mx-auto flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all w-full max-w-xs h-12"
            onClick={openScanner}
          >
            <ScanBarcode className="mr-2 h-5 w-5" />
            Scan New Barcode
          </Button>
        </motion.div>
      </footer>

      {/* Scanner Dialog/Sheet for Mobile or Desktop */}
      {isMobile ? (
        <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0 bg-white border-t-2 border-blue-500">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold text-blue-700">Scan Barcode</h2>
              <p className="text-sm text-slate-600 mt-1">
                Position barcode within view for automatic scanning
              </p>
            </div>

            {isDialogOpen && (
              <SimpleBarcodeScanner onDetected={handleScan} onClose={closeScanner} />
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-700">Scan Barcode</DialogTitle>
            </DialogHeader>
            
            {isDialogOpen && (
              <SimpleBarcodeScanner onDetected={handleScan} onClose={closeScanner} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface SimpleBarcodeScannerProps {
  onDetected: (code: string, symbology: string) => void;
  onClose: () => void;
}

const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({ onDetected, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = React.useState<BarcodeScanner | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mlKitAvailable, setMlKitAvailable] = React.useState(false);
  const [selectedScanner, setSelectedScanner] = React.useState<'dynamsoft' | 'mlkit'>('dynamsoft');
  const videoContainerCreated = React.useRef<boolean>(false);
  const scannerInstanceRef = React.useRef<BarcodeScanner | null>(null);
  const isDestroyingRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setMlKitAvailable(true);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    let mlkitListener: any = null;
    
    // Reset the destroying flag when mounting
    isDestroyingRef.current = false;
    
    const setupScanner = async () => {
      try {
        console.log("Setting up SimpleBarcodeScanner (Dynamsoft)");
        
        // Create video container element required by Dynamsoft scanner
        if (containerRef.current && !videoContainerCreated.current) {
          const videoContainer = document.createElement('div');
          videoContainer.className = 'dce-video-container';
          videoContainer.id = 'dce-video-container-simple';
          videoContainer.style.position = 'absolute';
          videoContainer.style.left = '0';
          videoContainer.style.top = '0';
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          containerRef.current.appendChild(videoContainer);
          videoContainerCreated.current = true;
          console.log("Simple scanner video container created");
        }
        
        // Create scanner instance
        const scannerInstance = await BarcodeScanner.createInstance();
        console.log("Simple scanner instance created");
        scannerInstanceRef.current = scannerInstance;
        
        // Update settings for better performance
        const settings = await scannerInstance.getRuntimeSettings();
        settings.barcodeFormatIds = 0x3FF | 0x1000000 | 0x2000000; // Common 1D, QR, DataMatrix
        settings.deblurLevel = 2;
        await scannerInstance.updateRuntimeSettings(settings);
        
        if (isMounted && !isDestroyingRef.current) {
          setScanner(scannerInstance);
          
          // Set up callback for barcode detection
          scannerInstance.onUnduplicatedRead = (txt, result) => {
            console.log("Simple scanner barcode detected (Dynamsoft):", txt, result);
            onDetected(txt, result.barcodeFormatString);
          };
          
          // Start scanning if container is ready
          if (containerRef.current) {
            try {
              await scannerInstance.setUIElement(containerRef.current);
              await scannerInstance.show();
              console.log("Simple scanner started");
            } catch (err) {
              console.error("Failed to start simple scanner:", err);
              if (isMounted && !isDestroyingRef.current) {
                setError("Camera access required");
              }
            }
          }
        } else {
          console.log("Component unmounted during setup, cleaning up scanner");
          if (scannerInstance) {
            try {
              await scannerInstance.destroyContext();
            } catch (e) {
              console.error("Error destroying scanner during setup cleanup:", e);
            }
          }
        }
      } catch (err) {
        console.error("Simple scanner setup error:", err);
        if (isMounted && !isDestroyingRef.current) {
          setError("Please allow camera access");
        }
      }
    };

    const startMlKit = async () => {
      try {
        await MlKitScanner.startScan();

        // Capacitor style listener
        try {
          mlkitListener = await MlKitScanner.addListener('mlkitBarcodeDetected', (d: any) => {
            const code = (d && (d.code || d.value)) || null;
            if (code && isMounted) {
              onDetected(code, "ML Kit");
            }
          });
        } catch (e) {
          console.warn('Failed to attach mlkit listener', e);
        }
      } catch (e) {
        console.error('Error starting MlKit plugin', e);
        setError('Failed to start ML Kit scanner');
      }
    };
    
    if (selectedScanner === 'mlkit') {
      startMlKit();
    } else {
      setupScanner();
    }
    
    // Cleanup function with proper Promise handling
    return () => {
      console.log("SimpleBarcodeScanner cleaning up, selected:", selectedScanner);
      isMounted = false;
      isDestroyingRef.current = true;
      videoContainerCreated.current = false;
      
      // Clean up the video container
      if (containerRef.current) {
        const videoContainer = document.getElementById('dce-video-container-simple');
        if (videoContainer && videoContainer.parentNode === containerRef.current) {
          containerRef.current.removeChild(videoContainer);
          console.log("Simple scanner video container removed");
        }
      }
      
      const scannerInstance = scannerInstanceRef.current;
      if (scannerInstance) {
        // Use an IIFE async function for cleanup
        (async () => {
          try {
            console.log("Cleaning up simple scanner");
            try {
              await scannerInstance.hide();
              console.log("Simple scanner hidden");
            } catch (e) {
              console.error("Error hiding simple scanner:", e);
            }
            
            try {
              await scannerInstance.destroyContext();
              console.log("Simple scanner destroyed");
            } catch (e) {
              console.error("Error destroying simple scanner:", e);
            }
          } catch (e) {
            console.error("Error in simple scanner cleanup:", e);
          }
        })();
        scannerInstanceRef.current = null;
      }

      try {
        if (mlkitListener && mlkitListener.remove) {
          mlkitListener.remove();
        }
      } catch (e) {}
      
      try {
        MlKitScanner.stopScan();
      } catch (e) {}
    };
  }, [selectedScanner, onDetected]);
  
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 w-full">
      {mlKitAvailable && (
        <div className="flex items-center gap-2 mb-4 w-full justify-center">
          <Button 
            variant={selectedScanner === 'dynamsoft' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedScanner('dynamsoft')}
            className="rounded-full px-4"
          >
            Dynamsoft
          </Button>
          <Button 
            variant={selectedScanner === 'mlkit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedScanner('mlkit')}
            className="rounded-full px-4"
          >
            ML Kit (Native)
          </Button>
        </div>
      )}

      {error ? (
        <div className="text-center py-8">
          <div className="bg-amber-100 p-3 rounded-full mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Camera className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-amber-500 font-medium">{error}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Please allow camera access to scan barcodes
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button 
              onClick={onClose} 
              variant="outline"
              className="border-slate-300 hover:bg-slate-100"
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <motion.div 
            ref={containerRef} 
            className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden"
            style={{ minHeight: '300px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {selectedScanner === 'mlkit' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-600 animate-pulse mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="font-semibold text-lg">Native Scanner Active</p>
                <p className="text-sm text-slate-400 text-center mt-2 max-w-xs">
                  A native camera window has opened to scan your barcode.
                </p>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 pointer-events-none z-10"></div>
                <motion.div 
                  className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-blue-400 to-purple-500 z-20"
                  animate={{ 
                    y: [-10, 10, -10], 
                    opacity: [0.8, 1, 0.8] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                ></motion.div>
                
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <motion.div 
                    className="w-64 h-64 border-2 border-blue-400 rounded-lg"
                    animate={{
                      boxShadow: ["0 0 0 0 rgba(59, 130, 246, 0)", "0 0 0 10px rgba(59, 130, 246, 0.3)"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400"></div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </motion.div>
          
          <motion.p 
            className="text-sm text-center my-4 text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {selectedScanner === 'mlkit' 
              ? "Close the native camera when done scanning" 
              : "Position barcode within the frame for automatic scanning"
            }
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="mt-2 border-slate-300 hover:bg-slate-100"
            >
              Cancel
            </Button>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default ScannerPage;
