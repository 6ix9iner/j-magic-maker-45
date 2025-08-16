
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id?: string;
}

interface SaleItemProps {
  product: Product;
  quantity: number;
  index: number;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onRemoveItem: (index: number) => void;
}

const SaleItem = ({
  product,
  quantity,
  index,
  onUpdateQuantity,
  onRemoveItem
}: SaleItemProps) => {
  return (
    <TableRow>
      <TableCell>
        <div>
          <div>{product.name}</div>
          <div className="text-xs text-muted-foreground">{product.barcode}</div>
        </div>
      </TableCell>
      <TableCell>${product.price.toFixed(2)}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-6 w-6" 
            onClick={() => onUpdateQuantity(index, quantity - 1)}
          >
            -
          </Button>
          <span>{quantity}</span>
          <Button 
            variant="outline" 
            size="icon"
            className="h-6 w-6" 
            onClick={() => onUpdateQuantity(index, quantity + 1)}
          >
            +
          </Button>
        </div>
      </TableCell>
      <TableCell>₦{(product.price * quantity).toFixed(2)}</TableCell>
      <TableCell>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onRemoveItem(index)}
          className="text-destructive"
        >
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default SaleItem;
