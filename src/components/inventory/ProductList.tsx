
import React from 'react';
import ProductCard from './ProductCard';

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
  onDeleteProduct: (product: Product) => void;
}

const ProductList = ({
  products,
  isLoading,
  searchTerm,
  onEditProduct,
  onDeleteProduct,
}: ProductListProps) => {
  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.barcode.toLowerCase().includes(searchLower) ||
      (product.category && product.category.toLowerCase().includes(searchLower))
    );
  });

  // Sort products by name
  const sortedProducts = filteredProducts.sort((a, b) => 
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading products...</div>
    );
  }

  if (sortedProducts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchTerm ? 'No products match your search' : 'No products found'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onEditProduct(product)}
          onDelete={onDeleteProduct}
        />
      ))}
    </div>
  );
};

export default ProductList;
