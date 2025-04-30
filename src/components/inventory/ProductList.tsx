
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  searchTerm: string;
  onEditProduct: (product: Product) => void;
}

const ProductList = ({
  products,
  isLoading,
  searchTerm,
  onEditProduct,
}: ProductListProps) => {
  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.barcode.toLowerCase().includes(searchLower) ||
      (product.category && product.category.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading products...</div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchTerm ? 'No products match your search' : 'No products found'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.barcode}</TableCell>
              <TableCell>${parseFloat(product.price.toString()).toFixed(2)}</TableCell>
              <TableCell>${parseFloat(product.purchase_price.toString()).toFixed(2)}</TableCell>
              <TableCell className={product.stock_count < 5 ? "text-red-500 font-medium" : ""}>
                {product.stock_count}
              </TableCell>
              <TableCell>{product.category || '-'}</TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEditProduct(product)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductList;
