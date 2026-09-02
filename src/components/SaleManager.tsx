import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ShoppingCart } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import SaleTable from './sale/SaleTable';
import SaleSummary from './sale/SaleSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Receipt from './receipt/Receipt';
import { sendPushNotification } from '@/utils/pushNotificationUtils';
import { completeSale as completeSaleInStore, getBusinessInfo } from '@/lib/offline/repository';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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
  const { online } = useOfflineSync();

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
      return await getBusinessInfo(userId);
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
    const isNative = Capacitor.isNativePlatform();

    try {
      // Local-first on native: this writes the sale/items/stock change to
      // the on-device database immediately and (if offline) queues it for
      // sync - the sale and its receipt are available right away either
      // way. On web this is a thin passthrough to Supabase, same as before.
      const completedSaleData = await completeSaleInStore(user.id, user.id, items);

      // 🔔 Send sale completion notification (best-effort - silently
      // no-ops if there's no connectivity right now).
      try {
        await sendPushNotification({
          user_id: user.id,
          title: '💰 Sale Completed!',
          body: `Sale of $${calculateTotal().toFixed(2)} completed successfully with ${items.length} items`,
          notification_type: 'sale_completed',
          data: {
            sale_id: completedSaleData.id,
            total_amount: calculateTotal(),
            items_count: items.length,
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ Sale completion notification sent');
      } catch (notifError) {
        console.error('❌ Failed to send sale completion notification:', notifError);
      }

      // Fetch business info for the receipt
      const businessInfoData = await fetchBusinessInfo(user.id);

      // If we have business info, show the receipt and send receipt notification
      if (businessInfoData) {
        setBusinessInfo(businessInfoData);
        setCompletedSale(completedSaleData);
        setShowReceiptModal(true);

        // 🧾 Send receipt generated notification (best-effort)
        try {
          await sendPushNotification({
            user_id: user.id,
            title: '🧾 Receipt Generated!',
            body: `Receipt for sale of $${calculateTotal().toFixed(2)} has been generated and is ready to view`,
            notification_type: 'receipt_generated',
            data: {
              sale_id: completedSaleData.id,
              total_amount: calculateTotal(),
              business_name: businessInfoData.business_name,
              timestamp: new Date().toISOString()
            }
          });
          console.log('✅ Receipt generated notification sent');
        } catch (notifError) {
          console.error('❌ Failed to send receipt notification:', notifError);
        }
      } else {
        // No business info found, show a message
        toast.info("Sale completed! Set up your business information to generate receipts.");
      }

      toast.success(
        isNative && !online
          ? "Sale completed offline! It will sync automatically once you're back online."
          : "Sale completed successfully!"
      );
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
      <div className="w-full rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4 text-indigo-600" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Current Sale</h3>
        </div>
        <div className="h-[220px] overflow-y-auto -mx-1 px-1">
          <SaleTable
            items={items}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
          />
        </div>
        <SaleSummary
          total={calculateTotal()}
          itemCount={items.length}
          isProcessing={isProcessing}
          onCompleteSale={completeSale}
          onCancelSale={cancelSale}
        />
      </div>

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
