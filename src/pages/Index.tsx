import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import BarcodeScannerCompat from '@/components/BarcodeScanner';
import BarcodeScannerInline from '@/components/barcode/BarcodeScanner';
import ProductLookup from '@/components/ProductLookup';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import SaleManager, { Product, SaleManagerHandle } from '@/components/SaleManager';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const Index = () => {
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [saleManagerRef, setSaleManagerRef] = useState<React.RefObject<SaleManagerHandle> | null>(null);
  const isMobile = useIsMobile();

  // Create ref for SaleManager
  React.useEffect(() => {
    setSaleManagerRef(React.createRef());
  }, []);

  // Use useCallback for stable reference to avoid recreation on re-renders
  const handleBarcodeDetected = useCallback((code: string) => {
    // Ensure we have a valid barcode result
    if (!code || code.trim() === '') {
      toast.error("Invalid barcode detected");
      return;
    }

    // Set the barcode value and show success toast
    setBarcodeValue(code);
    toast.success("Barcode detected: " + code);
  }, []);

  const clearResult = useCallback(() => {
    setBarcodeValue(null);
  }, []);

  // Alternative to scanning: picking a product from the search sheet feeds
  // its barcode into the exact same lookup + "add to sale" flow a real
  // scan would use, just skipping the "Barcode detected" toast since
  // nothing was actually scanned.
  const handleSearchSelect = useCallback((barcode: string) => {
    setIsSearchOpen(false);
    setBarcodeValue(barcode);
  }, []);

  const handleAddToSale = useCallback((product: Product, quantity: number) => {
    if (saleManagerRef?.current?.addItem) {
      saleManagerRef.current.addItem(product, quantity);
      toast.success(`Added ${quantity} ${product.name} to sale`);
    }
    // Dismiss the result so the user is immediately ready to scan the
    // next item, instead of having to manually clear it every time.
    clearResult();
  }, [saleManagerRef, clearResult]);

  if (isMobile) {
    // Mobile: the page itself never scrolls - the scan bar and the
    // Current Sale card both stay fixed in place on screen. Only the
    // item list *inside* the card scrolls as products are added (see
    // SaleManager). Scan results appear in a bottom sheet overlaying
    // the page rather than pushing anything around.
    return (
      <div className="w-full h-full flex flex-col overflow-hidden min-h-0 pt-2 pb-4 px-1">
        <div className="max-w-lg w-full mx-auto flex flex-col flex-1 overflow-hidden min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 flex items-center gap-3 rounded-2xl bg-slate-950/90 dark:bg-slate-950 border border-slate-250/30 dark:border-slate-800 px-4 py-3"
          >
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
              aria-label="Search for a product to add to sale"
            >
              <Search className="h-4.5 w-4.5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <BarcodeScannerCompat onDetected={handleBarcodeDetected} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 min-h-0 mt-3 pb-20"
          >
            <SaleManager ref={saleManagerRef} />
          </motion.div>
        </div>

        <Sheet open={!!barcodeValue} onOpenChange={(open) => !open && clearResult()}>
          <SheetContent side="bottom" className="rounded-t-3xl border-t border-slate-100 dark:border-slate-800 p-0 bg-white dark:bg-slate-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Scanned Product</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{barcodeValue}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearResult} className="rounded-full flex-shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {barcodeValue && (
                <ProductLookup barcodeValue={barcodeValue} onAddToSale={handleAddToSale} />
              )}
            </div>
          </SheetContent>
        </Sheet>

        <ProductSearchDialog
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          onSelectBarcode={handleSearchSelect}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 pt-2 pb-4 px-1 max-w-7xl mx-auto">
      {/* 2-column layout on Desktop */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">

        {/* Left Column - Scanner and Product Info */}
        <div className="lg:col-span-5 flex flex-col overflow-hidden min-h-0 h-full">
          <div className="mb-4 mt-2 flex-shrink-0 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              Scan & Lookup
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="h-8 rounded-lg text-xs gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              Search Product
            </Button>
          </div>

          <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
            {barcodeValue ? (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                <ProductLookup
                  barcodeValue={barcodeValue}
                  onAddToSale={handleAddToSale}
                />
              </div>
            ) : (
              <div className="flex-grow flex flex-col min-h-0 relative rounded-3xl overflow-hidden bg-slate-950/90 dark:bg-slate-950 border border-slate-250/30 dark:border-slate-800 flex-1">
                <div className="w-full h-full flex-grow min-h-0 flex flex-col relative">
                  <BarcodeScannerInline onDetected={handleBarcodeDetected} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Current Sale */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden min-h-0 h-full">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 mt-2 flex items-center gap-2 flex-shrink-0">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
            Current Sale
          </h2>

          <div className="flex-grow overflow-y-auto min-h-0 pb-24 pr-1">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SaleManager ref={saleManagerRef} />
            </motion.div>
          </div>
        </div>

      </div>

      <ProductSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelectBarcode={handleSearchSelect}
      />
    </div>
  );
};

export default Index;
