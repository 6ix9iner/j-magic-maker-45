
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import SaleTable from './sale/SaleTable';
import SaleSummary from './sale/SaleSummary';

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id?: string;
}

interface SaleItem {
  product: Product;
  quantity: number;
}

// Use forwardRef to expose functions to parent
const SaleManager = forwardRef((props, ref) => {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

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

    if (!user) {
      toast.error("You must be logged in to complete a sale");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create the sale record with user_id
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: calculateTotal(),
          payment_method: 'cash', // Default payment method
          user_id: user.id, // Add the user_id from the authenticated user
          cashier_id: user.id // Set cashier_id as the current user
        })
        .select('id')
        .single();

      if (saleError) {
        console.error("Sale error:", saleError);
        throw new Error(`Failed to create sale: ${saleError.message}`);
      }
      
      if (!saleData || !saleData.id) {
        throw new Error("No sale ID returned");
      }
      
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

      if (itemsError) {
        console.error("Sale items error:", itemsError);
        throw new Error(`Failed to add sale items: ${itemsError.message}`);
      }
      
      // Update product stock counts
      for (const item of items) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_count: item.product.stock_count - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id)
          .eq('user_id', user.id); // Ensure we only update the user's own products

        if (stockError) {
          console.error("Stock update error:", stockError);
          throw new Error(`Failed to update stock: ${stockError.message}`);
        }
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
        <SaleTable 
          items={items}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
        />
      </CardContent>
      <SaleSummary
        total={calculateTotal()}
        isProcessing={isProcessing}
        onCompleteSale={completeSale}
        onCancelSale={cancelSale}
      />
    </Card>
  );
});

SaleManager.displayName = "SaleManager";

export default SaleManager;
