
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import SaleTable from './sale/SaleTable';
import SaleSummary from './sale/SaleSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Receipt from './receipt/Receipt';

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

interface BusinessInfo {
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website?: string;
  tax_id?: string;
  thank_you_message?: string;
}

interface CompletedSale {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string | null;
  transaction_id: string | null;
  items?: {
    id: string;
    product_id: string | null;
    barcode_at_sale: string | null;
    name_at_sale: string | null;
    price_at_sale: number;
    quantity: number;
  }[];
}

// Use forwardRef to expose functions to parent
const SaleManager = forwardRef((props, ref) => {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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

  const fetchBusinessInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("business_info")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching business info:", error);
      return null;
    }
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
          user_id: user.id, // Set user_id to current authenticated user
          cashier_id: user.id
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
          .eq('user_id', user.id); // Ensure we're only updating the user's own products

        if (stockError) {
          console.error("Stock update error:", stockError);
          throw new Error(`Failed to update stock: ${stockError.message}`);
        }
      }

      // Get the completed sale data with items
      const { data: completedSaleData, error: completedSaleError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleData.id)
        .single();

      if (completedSaleError) {
        throw completedSaleError;
      }

      const { data: saleItemsData, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleData.id);

      if (saleItemsError) {
        throw saleItemsError;
      }

      // Fetch business info for the receipt
      const businessInfoData = await fetchBusinessInfo(user.id);
      
      // If we have business info, show the receipt
      if (businessInfoData) {
        setBusinessInfo(businessInfoData);
        setCompletedSale({
          ...completedSaleData,
          items: saleItemsData || []
        });
        setShowReceiptModal(true);
      } else {
        // No business info found, show a message
        toast.info("Sale completed! Set up your business information to generate receipts.");
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

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setCompletedSale(null);
  };

  return (
    <>
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

      {/* Receipt Modal */}
      {showReceiptModal && completedSale && businessInfo && (
        <Dialog open={showReceiptModal} onOpenChange={closeReceiptModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receipt</DialogTitle>
            </DialogHeader>
            <Receipt sale={completedSale} businessInfo={businessInfo} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});

SaleManager.displayName = "SaleManager";

export default SaleManager;
