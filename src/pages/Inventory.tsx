
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import SearchBox from '@/components/inventory/SearchBox';
import ProductList from '@/components/inventory/ProductList';
import ProductForm from '@/components/inventory/ProductForm';

// Updated interface to match database structure
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
  // Remove user_id as it doesn't exist in the database
}

const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    price: 0,
    purchase_price: 0,
    stock_count: 0,
    category: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) { // Only fetch if user is authenticated
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        // Remove filter by user_id as it doesn't exist
        .order('name');

      if (error) throw error;
      // Type assertion to ensure compatibility
      setProducts(data as Product[] || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Convert numeric fields
    if (name === 'price' || name === 'purchase_price' || name === 'stock_count') {
      parsedValue = parseFloat(value) || 0;
    }
    
    setCurrentProduct({
      ...currentProduct,
      [name]: parsedValue,
    });
  };

  const resetForm = () => {
    setCurrentProduct({
      name: '',
      barcode: '',
      price: 0,
      purchase_price: 0,
      stock_count: 0,
      category: '',
    });
    setIsEditing(false);
  };

  const openNewProductDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditProductDialog = (product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const saveProduct = async () => {
    try {
      if (!currentProduct.name || !currentProduct.barcode) {
        toast.error('Name and barcode are required');
        return;
      }
      
      if (isEditing) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: currentProduct.name,
            barcode: currentProduct.barcode,
            price: currentProduct.price,
            purchase_price: currentProduct.purchase_price,
            stock_count: currentProduct.stock_count,
            category: currentProduct.category,
            updated_at: new Date().toISOString(),
            // Remove user_id as it doesn't exist
          })
          .eq('id', currentProduct.id);
          // Remove user_id filter as it doesn't exist

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // Check if barcode already exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', currentProduct.barcode)
          // Remove user_id filter as it doesn't exist
          .maybeSingle();

        if (existingProduct) {
          toast.error('A product with this barcode already exists');
          return;
        }

        // Create new product
        const { error } = await supabase
          .from('products')
          .insert({
            name: currentProduct.name,
            barcode: currentProduct.barcode,
            price: currentProduct.price,
            purchase_price: currentProduct.purchase_price,
            stock_count: currentProduct.stock_count,
            category: currentProduct.category,
            // Remove user_id as it doesn't exist
          });

        if (error) throw error;
        toast.success('Product added successfully');
      }
      
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600">
              Manage your products and stock levels
            </p>
          </div>
          <Button onClick={openNewProductDialog}>Add New Product</Button>
        </header>

        <SearchBox 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductList
              products={products}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onEditProduct={openEditProductDialog}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <ProductForm
            product={currentProduct}
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onSave={saveProduct}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
