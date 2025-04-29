
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface BarcodeResultProps {
  barcodeValue: string;
  onClear: () => void;
}

const BarcodeResult = ({ barcodeValue, onClear }: BarcodeResultProps) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(barcodeValue);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Detected Barcode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="p-3 bg-muted rounded-md flex items-center justify-between break-all">
            <span className="font-mono">{barcodeValue}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyToClipboard}
              className="h-8 w-8"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button onClick={onClear} variant="outline" className="w-full">
              Clear
            </Button>
            <Button onClick={copyToClipboard} className="w-full">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarcodeResult;
