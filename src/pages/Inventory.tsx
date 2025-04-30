
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Barcode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  user_id?: string; // Make user_id optional to accommodate data from Supabase
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
  const { user } = useAuth(); // Get the current authenticated user

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
        .eq('user_id', user?.id)  // Filter by current user
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

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.barcode.toLowerCase().includes(searchLower) ||
      (product.category && product.category.toLowerCase().includes(searchLower))
    );
  });

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
            // No need to update user_id as it should remain the same
          })
          .eq('id', currentProduct.id)
          .eq('user_id', user?.id); // Ensure we only update the user's own products

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // Check if barcode already exists for this user
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', currentProduct.barcode)
          .eq('user_id', user?.id)
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
            user_id: user?.id, // Set the user_id to the current user
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

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search by name, barcode, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button 
                variant="outline"
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No products match your search' : 'No products found'}
              </div>
            ) : (
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
                            onClick={() => openEditProductDialog(product)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                value={currentProduct.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="barcode" className="text-right font-medium">
                Barcode
              </label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="barcode"
                  name="barcode"
                  value={currentProduct.barcode}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Barcode className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="price" className="text-right font-medium">
                Price
              </label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={currentProduct.price}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="purchase_price" className="text-right font-medium">
                Cost
              </label>
              <Input
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                min="0"
                value={currentProduct.purchase_price}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="stock_count" className="text-right font-medium">
                Stock
              </label>
              <Input
                id="stock_count"
                name="stock_count"
                type="number"
                min="0"
                value={currentProduct.stock_count}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right font-medium">
                Category
              </label>
              <Input
                id="category"
                name="category"
                value={currentProduct.category || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProduct}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
