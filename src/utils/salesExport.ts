
interface SaleExportData {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string | null;
  transaction_id: string | null;
  items?: {
    id: string;
    product_id: string | null;
    barcode_at_sale: string | null;
    name_at_sale: string | null;
    price_at_sale: number;
    quantity: number;
  }[];
}

export const exportSalesToCSV = (sales: SaleExportData[], businessName: string = 'My Business') => {
  // Create CSV headers
  const headers = [
    'Sale ID',
    'Date',
    'Total Amount',
    'Payment Method',
    'Transaction ID',
    'Item Name',
    'Item Barcode',
    'Item Price',
    'Item Quantity',
    'Item Subtotal'
  ];

  // Create CSV rows
  const rows: string[][] = [];
  
  sales.forEach(sale => {
    const saleBasicInfo = [
      sale.id,
      new Date(sale.created_at).toLocaleDateString(),
      `$${sale.total_amount.toFixed(2)}`,
      sale.payment_method || 'Cash',
      sale.transaction_id || 'N/A'
    ];

    if (sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
        const itemInfo = [
          item.name_at_sale || 'Unknown Item',
          item.barcode_at_sale || 'N/A',
          `$${item.price_at_sale.toFixed(2)}`,
          item.quantity.toString(),
          `$${(item.price_at_sale * item.quantity).toFixed(2)}`
        ];
        rows.push([...saleBasicInfo, ...itemInfo]);
      });
    } else {
      // If no items, still add the sale with empty item fields
      rows.push([...saleBasicInfo, '', '', '', '', '']);
    }
  });

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
