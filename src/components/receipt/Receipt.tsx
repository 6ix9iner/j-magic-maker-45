import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

interface BusinessInfo {
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website?: string;
  tax_id?: string;
  thank_you_message?: string;
}

interface SaleItemData {
  id: string;
  product_id: string | null;
  barcode_at_sale: string | null;
  name_at_sale: string | null;
  price_at_sale: number;
  quantity: number;
}

interface SaleData {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string | null;
  transaction_id: string | null;
  items?: SaleItemData[];
}

interface ReceiptProps {
  sale: SaleData;
  businessInfo: BusinessInfo;
}

const Receipt = ({ sale, businessInfo }: ReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!receiptRef.current) return null;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 120], // Receipt-like dimensions
      });

      const imgWidth = 80;
      const pageHeight = 120;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  const handlePrint = async () => {
    if (Capacitor.isNativePlatform()) {
      // On mobile, we'll share the PDF instead of printing
      const pdf = await generatePDF();
      if (pdf) {
        try {
          const pdfBlob = pdf.output('blob');
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            
            const fileName = `receipt-${sale.id.substring(0, 8)}.pdf`;
            
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Documents,
            });

            await Share.share({
              title: 'Receipt',
              text: `Receipt for sale ${sale.id.substring(0, 8)}`,
              files: [result.uri],
              dialogTitle: 'Share Receipt'
            });
          };
          reader.readAsDataURL(pdfBlob);
        } catch (error) {
          console.error('Error sharing receipt on mobile:', error);
          toast.error('Failed to share receipt');
        }
      }
    } else {
      // Web version - original print functionality
      const pdf = await generatePDF();
      if (pdf) {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      }
    }
  };

  const handleDownload = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const fileName = `receipt-${sale.id.substring(0, 8)}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          const pdfBlob = pdf.output('blob');
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Documents,
            });

            await Share.share({
              title: 'Download Receipt',
              text: `Receipt for sale ${sale.id.substring(0, 8)}`,
              files: [result.uri],
              dialogTitle: 'Save Receipt'
            });
          };
          reader.readAsDataURL(pdfBlob);
        } catch (error) {
          console.error('Error downloading receipt on mobile:', error);
          toast.error('Failed to download receipt');
        }
      } else {
        // Web version - original download functionality
        pdf.save(fileName);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    // For very large amounts, use compact notation
    if (amount >= 1000000) {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  const formatLargeNumber = (amount: number, isCompact: boolean = false) => {
    const formatted = isCompact ? formatCurrencyCompact(amount) : formatCurrency(amount);
    
    // If the formatted string is longer than 8 characters, split it for mobile
    if (formatted.length > 8) {
      // For very large numbers, use compact format
      if (amount >= 100000) {
        return formatCurrencyCompact(amount);
      }
      
      // Otherwise, split the number for better mobile display
      const parts = formatted.split('.');
      if (parts[0].length > 6) {
        // Split large whole numbers
        const wholeNumber = parts[0];
        const decimal = parts[1] ? `.${parts[1]}` : '';
        
        // Insert line break for mobile display
        return (
          <span className="break-all">
            {wholeNumber}
            {decimal}
          </span>
        );
      }
    }
    
    return formatted;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div 
        ref={receiptRef} 
        className="receipt bg-white p-3 sm:p-4 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto border rounded-lg shadow-sm"
        style={{ fontFamily: 'Arial, system-ui, sans-serif' }}
      >
        <div className="header text-center mb-3">
          <h2 className="text-sm sm:text-base font-bold break-words leading-tight">{businessInfo.business_name}</h2>
          <div className="text-gray-600 text-xs space-y-1 mt-2">
            <p className="break-words">{businessInfo.address}</p>
            <p className="break-words">{businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}</p>
            <p className="break-all">{businessInfo.phone}</p>
            <p className="break-all text-xs">{businessInfo.email}</p>
            {businessInfo.website && <p className="break-all text-xs">{businessInfo.website}</p>}
            {businessInfo.tax_id && <p className="text-xs">Tax ID: {businessInfo.tax_id}</p>}
          </div>
        </div>

        <div className="receipt-details mb-3 space-y-1 border-t border-b border-dashed border-gray-300 py-2">
          <div className="flex justify-between text-xs">
            <span>Receipt #:</span>
            <span className="font-mono text-right break-all">{sale.id.substring(0, 8)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Date:</span>
            <span className="text-right text-xs">{format(new Date(sale.created_at), "MM/dd/yy h:mm a")}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Payment:</span>
            <span className="text-right">{sale.payment_method || 'Cash'}</span>
          </div>
          {sale.transaction_id && (
            <div className="flex justify-between text-xs">
              <span>Transaction:</span>
              <span className="font-mono text-right break-all text-xs">{sale.transaction_id}</span>
            </div>
          )}
        </div>

        <div className="items mb-3">
          {/* Table Header with borders */}
          <div className="border border-gray-300 rounded-t-md bg-gray-50">
            <div className="grid grid-cols-12 gap-0 text-xs font-bold">
              <div className="col-span-4 p-2 border-r border-gray-300 text-left">Item</div>
              <div className="col-span-2 p-2 border-r border-gray-300 text-center">Qty</div>
              <div className="col-span-3 p-2 border-r border-gray-300 text-right">Price</div>
              <div className="col-span-3 p-2 text-right">Total</div>
            </div>
          </div>

          {/* Table Body with borders */}
          <div className="border-l border-r border-b border-gray-300 rounded-b-md">
            {sale.items?.map((item, index) => {
              const itemTotal = item.price_at_sale * item.quantity;
              const isLastItem = index === sale.items!.length - 1;
              
              return (
                <div 
                  key={item.id} 
                  className={`grid grid-cols-12 gap-0 text-xs items-center ${!isLastItem ? 'border-b border-gray-200' : ''}`}
                >
                  <div className="col-span-4 p-2 border-r border-gray-300 text-left">
                    <div className="break-words leading-tight text-xs">
                      {item.name_at_sale || 'Unknown Item'}
                    </div>
                    {item.barcode_at_sale && (
                      <div className="text-xs text-gray-500 break-all mt-1">
                        {item.barcode_at_sale}
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2 p-2 border-r border-gray-300 text-center text-xs font-medium">
                    {item.quantity}
                  </div>
                  
                  <div className="col-span-3 p-2 border-r border-gray-300 text-right text-xs">
                    <div className="break-all">
                      {typeof formatLargeNumber(item.price_at_sale, item.price_at_sale >= 100000) === 'string' 
                        ? formatLargeNumber(item.price_at_sale, item.price_at_sale >= 100000)
                        : formatLargeNumber(item.price_at_sale, item.price_at_sale >= 100000)
                      }
                    </div>
                  </div>
                  
                  <div className="col-span-3 p-2 text-right text-xs font-semibold">
                    <div className="break-all">
                      {typeof formatLargeNumber(itemTotal, itemTotal >= 100000) === 'string' 
                        ? formatLargeNumber(itemTotal, itemTotal >= 100000)
                        : formatLargeNumber(itemTotal, itemTotal >= 100000)
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="total-section border-t-2 border-gray-400 pt-2 mt-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Total:</span>
            <span className="font-bold text-sm break-all text-right">
              <div className="break-all">
                {typeof formatLargeNumber(sale.total_amount, sale.total_amount >= 100000) === 'string' 
                  ? formatLargeNumber(sale.total_amount, sale.total_amount >= 100000)
                  : formatLargeNumber(sale.total_amount, sale.total_amount >= 100000)
                }
              </div>
            </span>
          </div>
        </div>

        <div className="thank-you text-center mt-3 text-xs italic text-gray-600 break-words">
          {businessInfo.thank_you_message || 'Thank you for your business!'}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4 w-full sm:w-auto px-4 sm:px-0">
        <Button onClick={handlePrint} className="flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
          <Printer className="h-4 w-4" />
          {Capacitor.isNativePlatform() ? 'Share Receipt' : 'Print Receipt'}
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
