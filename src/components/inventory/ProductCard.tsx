
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-gray-900 truncate flex-1 mr-2">
            {product.name}
          </h3>
          <Badge 
            variant={product.stock_count < 5 ? "destructive" : "secondary"}
            className="text-xs"
          >
            Stock: {product.stock_count}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          <p className="font-medium">Barcode: {product.barcode}</p>
          {product.category && (
            <p className="text-gray-500">Category: {product.category}</p>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <span className="text-sm">
              <span className="font-medium text-gray-700">Price:</span> 
              <span className="text-green-600 font-semibold"> ${parseFloat(product.price.toString()).toFixed(2)}</span>
            </span>
            <span className="text-sm">
              <span className="font-medium text-gray-700">Cost:</span> 
              <span className="text-gray-600"> ${parseFloat(product.purchase_price.toString()).toFixed(2)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
