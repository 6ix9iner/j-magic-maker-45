
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/BarcodeScanner";

interface BarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (result: string) => void;
}

const BarcodeDialog = ({ isOpen, onClose, onDetected }: BarcodeDialogProps) => {
  const handleBarcodeDetected = (result: string) => {
    onDetected(result);
    onClose();
  };

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
          <BarcodeScanner onDetected={handleBarcodeDetected} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeDialog;
