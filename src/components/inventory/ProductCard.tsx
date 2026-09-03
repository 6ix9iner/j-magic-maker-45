
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  purchase_price: number;
  stock_count: number;
  category: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onDelete: (product: Product) => void;
}

const ProductCard = ({ product, onClick, onDelete }: ProductCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    onDelete(product);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate flex-1 mr-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge
              variant={product.stock_count < 5 ? "destructive" : "secondary"}
              className="text-xs"
            >
              Stock: {product.stock_count}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-3">
          <p className="font-medium">Barcode: {product.barcode}</p>
          {product.category && (
            <p className="text-gray-500">Category: {product.category}</p>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-x-4 gap-y-1 min-w-0">
            <span className="text-sm break-all">
              <span className="font-medium text-gray-700">Price:</span>
              <span className="text-green-600 font-semibold"> ₦{parseFloat(product.price.toString()).toFixed(2)}</span>
            </span>
            <span className="text-sm break-all">
              <span className="font-medium text-gray-700">Cost:</span>
              <span className="text-gray-600"> ₦{parseFloat(product.purchase_price.toString()).toFixed(2)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
