import React, { useState, useEffect } from 'react';
import {
  getProducts as getProductsFromStore,
  createProduct as createProductInStore,
  updateProduct as updateProductInStore,
  deleteProduct as deleteProductInStore,
  barcodeExists,
  getBusinessInfo,
  saveBusinessInfo,
} from '@/lib/offline/repository';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { hashResourcePassword, verifyResourcePassword } from '@/utils/resourcePassword';
import { getErrorMessage } from '@/utils/errors';
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

  const checkInventoryPassword = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await getBusinessInfo(user.id);

      const hasPassword = data?.inventory_password_hash;
      setInventoryPasswordHash(hasPassword);

      if (hasPassword) {
        setIsPasswordPromptOpen(true);
        setIsLoading(false);
      } else {
        setIsInventoryUnlocked(true);
        await fetchProducts();
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast.error('Failed to verify access');
      navigate('/dashboard');
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!inventoryPasswordHash) return false;

    const isCorrect = await verifyResourcePassword(password, inventoryPasswordHash);

    // Transparently upgrade old, non-cryptographic hashes to the new
    // PBKDF2 format now that we know the password is correct - the user
    // never notices, but their stored hash gets meaningfully stronger.
    if (isCorrect && !inventoryPasswordHash.startsWith('pbkdf2$') && user) {
      try {
        const info = await getBusinessInfo(user.id);
        if (info) {
          const upgradedHash = await hashResourcePassword(password);
          await saveBusinessInfo(user.id, { ...info, inventory_password_hash: upgradedHash });
          setInventoryPasswordHash(upgradedHash);
        }
      } catch (error) {
        console.error('Failed to upgrade inventory password hash:', error);
        // Non-fatal - the legacy hash still verifies correctly next time.
      }
    }

    return isCorrect;
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
      const data = await getProductsFromStore(user.id);
      setProducts(data as Product[] || []);
    } catch (error) {
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
      
      if (isEditing && currentProduct.id) {
        // Update existing product - local-first on native (works offline
        // and queues the sync), direct Supabase on web.
        await updateProductInStore(user.id, currentProduct.id, {
          name: currentProduct.name!,
          barcode: currentProduct.barcode!,
          price: currentProduct.price!,
          purchase_price: currentProduct.purchase_price!,
          stock_count: currentProduct.stock_count!,
          category: currentProduct.category ?? null,
        });
        toast.success('Product updated successfully');
      } else {
        // Check if barcode already exists for THIS USER'S products only
        if (await barcodeExists(user.id, currentProduct.barcode!)) {
          toast.error('A product with this barcode already exists in your inventory');
          return;
        }

        await createProductInStore(user.id, {
          name: currentProduct.name!,
          barcode: currentProduct.barcode!,
          price: currentProduct.price!,
          purchase_price: currentProduct.purchase_price!,
          stock_count: currentProduct.stock_count!,
          category: currentProduct.category ?? null,
        });
        toast.success('Product added successfully');
      }

      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(getErrorMessage(error, 'Failed to save product'));
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !user) return;

    try {
      await deleteProductInStore(user.id, productToDelete.id);

      toast.success('Product deleted successfully');
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(getErrorMessage(error, 'Failed to delete product'));
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
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 pt-2 pb-4 px-1">
      <div className="max-w-7xl w-full mx-auto flex flex-col flex-1 overflow-hidden min-h-0">
        <header className="flex-shrink-0 mb-2 sm:mb-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2 truncate">
              <span className="w-1.5 h-4 sm:h-6 bg-indigo-600 rounded-full shrink-0"></span>
              <span className="truncate">Inventory Management</span>
            </h1>
            <p className="hidden sm:block mt-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
              Manage your products and stock levels
            </p>
          </div>
          <Button
            onClick={openNewProductDialog}
            size="sm"
            className="h-9 sm:h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all shrink-0 px-3 sm:px-4"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Add New Product</span>
          </Button>
        </header>

        <div className="flex-shrink-0">
          <SearchBox
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pb-20 sm:pb-24 mt-2 sm:mt-6">
          <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="px-4 py-2 sm:px-5 sm:py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm sm:text-lg font-bold text-slate-800 dark:text-slate-100">Products</CardTitle>
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

