import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
}

interface SaleItem {
  product: Product;
  quantity: number;
}

// Use forwardRef to expose functions to parent
const SaleManager = forwardRef((props, ref) => {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addItem = (product: Product, quantity: number) => {
    // Check if item already exists in sale
    const existingItemIndex = items.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
      
      // Check if we have enough stock
      if (newQuantity > product.stock_count) {
        toast.error(`Cannot add more than ${product.stock_count} items`);
        return;
      }
      
      updatedItems[existingItemIndex].quantity = newQuantity;
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([...items, { product, quantity }]);
    }
  };

  // Expose the addItem function to parent components
  useImperativeHandle(ref, () => ({
    addItem
  }));

  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }
    
    const product = items[index].product;
    if (newQuantity > product.stock_count) {
      toast.error(`Cannot add more than ${product.stock_count} items`);
      return;
    }
    
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const completeSale = async () => {
    if (items.length === 0) {
      toast.error("No items in sale");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create the sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: calculateTotal(),
          payment_method: 'cash', // Default payment method
        })
        .select('id')
        .single();

      if (saleError) throw saleError;
      
      // Add sale items
      const saleItems = items.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.product.price,
        barcode_at_sale: item.product.barcode,
        name_at_sale: item.product.name
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;
      
      // Update product stock counts
      for (const item of items) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_count: item.product.stock_count - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id);

        if (stockError) throw stockError;
      }

      toast.success("Sale completed successfully!");
      setItems([]);
    } catch (error: any) {
      console.error("Error completing sale:", error);
      toast.error(`Error: ${error.message || "Could not complete sale"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelSale = () => {
    if (items.length > 0) {
      if (confirm('Are you sure you want to cancel this sale?')) {
        setItems([]);
        toast("Sale canceled");
      }
    } else {
      toast("No items in sale");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Current Sale</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items in current sale. Scan products to add them.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.product.id}>
                  <TableCell>
                    <div>
                      <div>{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">{item.product.barcode}</div>
                    </div>
                  </TableCell>
                  <TableCell>${item.product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span>{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-6 w-6" 
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>${(item.product.price * item.quantity).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive"
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="w-full flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>${calculateTotal().toFixed(2)}</span>
        </div>
        <div className="w-full flex space-x-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={cancelSale}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1"
            onClick={completeSale}
            disabled={items.length === 0 || isProcessing}
          >
            {isProcessing ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

SaleManager.displayName = "SaleManager";

export default SaleManager;
