
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/barcode/BarcodeScanner";

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  // Create a handler that adapts onDetected to the expected onScan interface
  const handleScan = (code: string, symbology: string) => {
    onDetected(code);
    onClose();
  };

  // Only render the BarcodeScanner when dialog is open to avoid camera issues
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Position the barcode in view of your camera
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isOpen && (
            <BarcodeScanner onScan={handleScan} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
