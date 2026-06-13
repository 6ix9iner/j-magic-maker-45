import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import SearchBox from '@/components/inventory/SearchBox';
import ProductList from '@/components/inventory/ProductList';
import ProductForm from '@/components/inventory/ProductForm';
import InventoryPasswordPrompt from '@/components/inventory/InventoryPasswordPrompt';

// Updated interface to include user_id
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
  user_id: string;
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState<boolean>(false);
  const [isInventoryUnlocked, setIsInventoryUnlocked] = useState<boolean>(false);
  const [inventoryPasswordHash, setInventoryPasswordHash] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Always reset unlock status when component mounts to force password prompt each time
    setIsInventoryUnlocked(false);
    
    if (user) {
      checkInventoryPassword();
    }
  }, [user]);

  // Reset inventory unlock status when component unmounts to ensure fresh state
  useEffect(() => {
    return () => {
      setIsInventoryUnlocked(false);
      setIsPasswordPromptOpen(false);
    };
  }, []);

  // Simple hash function for password verification
  const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  const checkInventoryPassword = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_info')
        .select('inventory_password_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const hasPassword = data?.inventory_password_hash;
      setInventoryPasswordHash(hasPassword);

      if (hasPassword) {
        setIsPasswordPromptOpen(true);
        setIsLoading(false);
      } else {
        setIsInventoryUnlocked(true);
        await fetchProducts();
      }
    } catch (error: any) {
      console.error('Error checking password:', error);
      toast.error('Failed to verify access');
      navigate('/dashboard');
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!inventoryPasswordHash) return false;
    
    const hashedInput = hashPassword(password);
    return hashedInput === inventoryPasswordHash;
  };

  const handlePasswordSuccess = () => {
    setIsInventoryUnlocked(true);
    setIsPasswordPromptOpen(false);
    fetchProducts();
  };

  const handlePasswordCancel = () => {
    setIsPasswordPromptOpen(false);
    navigate('/dashboard'); // Redirect to dashboard if they cancel
  };

  const fetchProducts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
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
    if (!user) {
      toast.error('You must be logged in');
      return;
    }
    
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
          })
          .eq('id', currentProduct.id)
          .eq('user_id', user.id); // Ensure we're only updating the user's own products

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // Check if barcode already exists for THIS USER'S products only
        const { data: existingProduct, error: checkError } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', currentProduct.barcode)
          .eq('user_id', user.id)  // Filter by user_id to ensure we only check current user's products
          .maybeSingle();

        if (checkError) throw checkError;
          
        if (existingProduct) {
          toast.error('A product with this barcode already exists in your inventory');
          return;
        }

        // Create new product with user_id explicitly set
        const { error } = await supabase
          .from('products')
          .insert({
            name: currentProduct.name,
            barcode: currentProduct.barcode,
            price: currentProduct.price,
            purchase_price: currentProduct.purchase_price,
            stock_count: currentProduct.stock_count,
            category: currentProduct.category,
            user_id: user.id // Explicitly set user_id
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

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !user) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('user_id', user.id); // Ensure we're only deleting the user's own products

      if (error) throw error;

      toast.success('Product deleted successfully');
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    }
  };

  // Don't render inventory content until password is verified
  if (!isInventoryUnlocked) {
    return (
      <>
        <InventoryPasswordPrompt
          isOpen={isPasswordPromptOpen}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
          onVerifyPassword={verifyPassword}
        />
        {isLoading && (
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Checking access permissions...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="py-2 px-1 sm:py-4 sm:px-2">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
              Inventory Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
              Manage your products and stock levels
            </p>
          </div>
          <Button onClick={openNewProductDialog} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all">Add New Product</Button>
        </header>

        <SearchBox 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden mt-6 bg-white dark:bg-slate-900">
          <CardHeader className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <ProductList
              products={products}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onEditProduct={openEditProductDialog}
              onDeleteProduct={handleDeleteProduct}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{productToDelete?.name}" from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <InventoryPasswordPrompt
        isOpen={isPasswordPromptOpen}
        onSuccess={handlePasswordSuccess}
        onCancel={handlePasswordCancel}
        onVerifyPassword={verifyPassword}
      />
    </div>
  );
};

export default Inventory;

