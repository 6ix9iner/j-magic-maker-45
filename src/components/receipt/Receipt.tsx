
import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    const pdf = await generatePDF();
    if (pdf) {
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    }
  };

  const handleDownload = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`receipt-${sale.id.substring(0, 8)}.pdf`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    // For very large amounts, use compact notation
    if (amount >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div 
        ref={receiptRef} 
        className="receipt bg-white p-4 sm:p-6 w-full max-w-sm mx-auto border rounded-lg shadow-sm"
        style={{ fontFamily: 'monospace' }}
      >
        <div className="header text-center mb-4">
          <h2 className="text-base sm:text-lg font-bold break-words leading-tight">{businessInfo.business_name}</h2>
          <div className="text-gray-600 text-xs space-y-1 mt-2">
            <p className="break-words">{businessInfo.address}</p>
            <p className="break-words">{businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}</p>
            <p className="break-all">{businessInfo.phone}</p>
            <p className="break-all text-xs">{businessInfo.email}</p>
            {businessInfo.website && <p className="break-all text-xs">{businessInfo.website}</p>}
            {businessInfo.tax_id && <p className="text-xs">Tax ID: {businessInfo.tax_id}</p>}
          </div>
        </div>

        <div className="receipt-details mb-4 space-y-1 border-t border-b border-dashed border-gray-300 py-2">
          <div className="flex justify-between text-xs">
            <span>Receipt #:</span>
            <span className="font-mono text-right">{sale.id.substring(0, 8)}</span>
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

        <div className="items mb-4">
          <div className="grid grid-cols-12 gap-1 font-bold text-xs mb-2 border-b pb-1">
            <div className="col-span-5 text-left">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          <div className="space-y-1">
            {sale.items?.map((item) => {
              const itemTotal = item.price_at_sale * item.quantity;
              return (
                <div key={item.id} className="grid grid-cols-12 gap-1 text-xs items-start">
                  <div className="col-span-5 text-left pr-1">
                    <div className="break-words leading-tight text-xs">
                      {item.name_at_sale || 'Unknown Item'}
                    </div>
                    {item.barcode_at_sale && (
                      <div className="text-xs text-gray-500 break-all">
                        {item.barcode_at_sale}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-xs">{item.quantity}</div>
                  <div className="col-span-2 text-right text-xs">
                    {item.price_at_sale >= 1000000 ? 
                      formatCurrencyCompact(item.price_at_sale) : 
                      formatCurrency(item.price_at_sale)
                    }
                  </div>
                  <div className="col-span-3 text-right font-medium text-xs">
                    {itemTotal >= 1000000 ? 
                      formatCurrencyCompact(itemTotal) : 
                      formatCurrency(itemTotal)
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="total-section border-t border-dashed border-gray-300 pt-2">
          <div className="flex justify-between font-bold text-sm">
            <span>Total:</span>
            <span className="text-right">
              {sale.total_amount >= 1000000 ? 
                formatCurrencyCompact(sale.total_amount) : 
                formatCurrency(sale.total_amount)
              }
            </span>
          </div>
        </div>

        <div className="thank-you text-center mt-4 text-xs italic text-gray-600 break-words">
          {businessInfo.thank_you_message || 'Thank you for your business!'}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4 w-full sm:w-auto">
        <Button onClick={handlePrint} className="flex items-center justify-center gap-2 text-sm">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex items-center justify-center gap-2 text-sm">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
