
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

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={receiptRef} 
        className="receipt bg-white p-6 w-full max-w-sm mx-auto border rounded-lg shadow-sm"
      >
        <div className="header text-center mb-4">
          <h2 className="text-lg font-bold break-words">{businessInfo.business_name}</h2>
          <div className="text-gray-600 text-xs space-y-1">
            <p className="break-words">{businessInfo.address}</p>
            <p>{businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}</p>
            <p className="break-all">{businessInfo.phone}</p>
            <p className="break-all">{businessInfo.email}</p>
            {businessInfo.website && <p className="break-all">{businessInfo.website}</p>}
            {businessInfo.tax_id && <p>Tax ID: {businessInfo.tax_id}</p>}
          </div>
        </div>

        <div className="receipt-details mb-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span>Receipt #:</span>
            <span className="font-mono">{sale.id.substring(0, 8)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Date:</span>
            <span className="text-right">{format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Payment:</span>
            <span>{sale.payment_method || 'Cash'}</span>
          </div>
          {sale.transaction_id && (
            <div className="flex justify-between text-xs">
              <span>Transaction ID:</span>
              <span className="font-mono text-right break-all">{sale.transaction_id}</span>
            </div>
          )}
        </div>

        <div className="items border-t border-b border-dashed border-gray-300 py-3 my-4">
          <div className="flex justify-between font-bold text-xs mb-2 border-b pb-1">
            <div className="w-1/2">Item</div>
            <div className="w-1/6 text-center">Qty</div>
            <div className="w-1/6 text-right">Price</div>
            <div className="w-1/6 text-right">Total</div>
          </div>

          <div className="space-y-2">
            {sale.items?.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between items-start text-xs">
                  <div className="w-1/2 pr-2">
                    <div className="break-words leading-tight">
                      {item.name_at_sale || 'Unknown Item'}
                    </div>
                  </div>
                  <div className="w-1/6 text-center">{item.quantity}</div>
                  <div className="w-1/6 text-right">${item.price_at_sale.toFixed(2)}</div>
                  <div className="w-1/6 text-right font-medium">
                    ${(item.price_at_sale * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="total-section">
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total:</span>
            <span>${sale.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="thank-you text-center mt-6 text-xs italic text-gray-600 break-words">
          {businessInfo.thank_you_message || 'Thank you for your business!'}
        </div>
      </div>
      
      <div className="flex gap-4 mt-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
