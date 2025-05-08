
import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface BusinessInfo {
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  thankYouMessage?: string;
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

  const handlePrint = () => {
    const printContents = receiptRef.current?.innerHTML || '';
    const originalContents = document.body.innerHTML;

    // Create a new window with just the receipt
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print receipts');
      return;
    }

    // Add print styles
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .receipt {
              width: 100%;
            }
            .header, .footer {
              text-align: center;
              margin-bottom: 10px;
            }
            .items {
              width: 100%;
              border-top: 1px dashed #ccc;
              border-bottom: 1px dashed #ccc;
              padding: 10px 0;
              margin: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .item-name {
              flex: 2;
            }
            .item-price, .item-qty, .item-total {
              flex: 1;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              margin-top: 10px;
            }
            .thank-you {
              text-align: center;
              margin-top: 20px;
              font-style: italic;
            }
            @media print {
              body {
                width: 100%;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    // Print and close
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  const handleDownload = () => {
    if (!receiptRef.current) return;

    // Create a plain text version of the receipt
    const businessHeader = `
${businessInfo.businessName}
${businessInfo.address}
${businessInfo.city}, ${businessInfo.state} ${businessInfo.zipCode}
Phone: ${businessInfo.phone}
Email: ${businessInfo.email}
${businessInfo.website ? `Website: ${businessInfo.website}` : ''}
${businessInfo.taxId ? `Tax ID: ${businessInfo.taxId}` : ''}
`;

    const receiptDate = format(new Date(sale.created_at), "MMM d, yyyy h:mm a");
    const receiptHeader = `
Receipt: #${sale.id.substring(0, 8)}
Date: ${receiptDate}
Payment: ${sale.payment_method || 'Cash'}
${sale.transaction_id ? `Transaction ID: ${sale.transaction_id}` : ''}

ITEMS
------------------------------------------
`;

    const itemLines = sale.items?.map(item => {
      const name = item.name_at_sale || 'Unknown Item';
      const price = `$${item.price_at_sale.toFixed(2)}`;
      const quantity = `${item.quantity}x`;
      const total = `$${(item.price_at_sale * item.quantity).toFixed(2)}`;
      return `${name.padEnd(20)} ${quantity.padEnd(3)} ${price.padEnd(8)} ${total}`;
    }).join('\n') || '';

    const totalSection = `
------------------------------------------
TOTAL: $${sale.total_amount.toFixed(2)}
`;

    const thankYou = `
${businessInfo.thankYouMessage || 'Thank you for your business!'}
`;

    const receiptText = `${businessHeader}${receiptHeader}${itemLines}${totalSection}${thankYou}`;

    // Create and download the file
    const element = document.createElement('a');
    const file = new Blob([receiptText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${sale.id.substring(0, 8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={receiptRef} 
        className="receipt bg-white p-6 w-full max-w-md mx-auto border rounded-lg shadow-sm"
      >
        <div className="header text-center mb-4">
          <h2 className="text-xl font-bold">{businessInfo.businessName}</h2>
          <div className="text-gray-600 text-sm">
            <p>{businessInfo.address}</p>
            <p>{businessInfo.city}, {businessInfo.state} {businessInfo.zipCode}</p>
            <p>{businessInfo.phone}</p>
            <p>{businessInfo.email}</p>
            {businessInfo.website && <p>{businessInfo.website}</p>}
            {businessInfo.taxId && <p>Tax ID: {businessInfo.taxId}</p>}
          </div>
        </div>

        <div className="receipt-details mb-4">
          <div className="flex justify-between text-sm">
            <span>Receipt #:</span>
            <span>{sale.id.substring(0, 8)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Date:</span>
            <span>{format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Payment Method:</span>
            <span>{sale.payment_method || 'Cash'}</span>
          </div>
          {sale.transaction_id && (
            <div className="flex justify-between text-sm">
              <span>Transaction ID:</span>
              <span>{sale.transaction_id}</span>
            </div>
          )}
        </div>

        <div className="items border-t border-b border-dashed border-gray-300 py-4 my-4">
          <div className="grid grid-cols-12 font-bold text-sm mb-2">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          {sale.items?.map((item) => (
            <div key={item.id} className="grid grid-cols-12 text-sm mb-1">
              <div className="col-span-6">{item.name_at_sale || 'Unknown Item'}</div>
              <div className="col-span-2 text-right">${item.price_at_sale.toFixed(2)}</div>
              <div className="col-span-1 text-center">{item.quantity}</div>
              <div className="col-span-3 text-right">
                ${(item.price_at_sale * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="total-section">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${sale.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="thank-you text-center mt-6 italic text-gray-600">
          {businessInfo.thankYouMessage || 'Thank you for your business!'}
        </div>
      </div>
      
      <div className="flex gap-4 mt-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button onClick={handleDownload} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
