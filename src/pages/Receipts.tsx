
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BusinessInfoForm from "@/components/receipt/BusinessInfoForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Receipt from "@/components/receipt/Receipt";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface SaleItemData {
  id: string;
  product_id: string | null;
  barcode_at_sale: string | null;
  name_at_sale: string | null;
  price_at_sale: number;
  quantity: number;
}

interface SaleData {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string | null;
  transaction_id: string | null;
  items?: SaleItemData[];
}

const Receipts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [recentSale, setRecentSale] = useState<SaleData | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Fetch business info and check if setup is needed
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("business_info")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setBusinessInfo(data);
        } else {
          // No business info found, show setup modal
          setShowSetupModal(true);
        }
      } catch (error: any) {
        console.error("Error fetching business info:", error);
        toast.error("Failed to load business information");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessInfo();
  }, [user]);

  // Fetch most recent sale
  useEffect(() => {
    const fetchRecentSale = async () => {
      if (!user) return;

      try {
        // Fetch the most recent sale
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (salesError) throw salesError;
        
        if (!salesData) return;

        // Fetch items for this sale
        const { data: items, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", salesData.id);

        if (itemsError) throw itemsError;

        setRecentSale({
          ...salesData,
          items: items || []
        });

      } catch (error: any) {
        console.error("Error fetching recent sale:", error);
      }
    };

    fetchRecentSale();
  }, [user]);

  const handleBusinessInfoSaved = async () => {
    // Refresh business info data
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("business_info")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBusinessInfo(data);
        setShowSetupModal(false);
        setEditMode(false);
      }
    } catch (error: any) {
      console.error("Error refreshing business info:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="py-2 px-1 sm:py-4 sm:px-2">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/settings")}
          className="h-9 w-9 p-0 rounded-xl border-slate-200 hover:bg-slate-100/50 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
          Receipt Generator
        </h1>
      </div>

      <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900 mb-6">
        <CardHeader className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {businessInfo ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Business Details</h3>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{businessInfo.business_name}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{businessInfo.address}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contact Information</h3>
                  <p className="text-slate-700 dark:text-slate-300 text-sm"><span className="font-medium text-slate-400">Phone:</span> {businessInfo.phone}</p>
                  <p className="text-slate-700 dark:text-slate-300 text-sm"><span className="font-medium text-slate-400">Email:</span> {businessInfo.email}</p>
                  {businessInfo.website && <p className="text-slate-700 dark:text-slate-300 text-sm"><span className="font-medium text-slate-400">Website:</span> {businessInfo.website}</p>}
                </div>
              </div>
              <Button onClick={() => setEditMode(true)} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all">Edit Business Information</Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium">
                You need to set up your business information first to generate receipts.
              </p>
              <Button onClick={() => setShowSetupModal(true)} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all">Set Up Business Information</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {businessInfo && recentSale && (
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Latest Receipt Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-slate-50/30 dark:bg-slate-950/20">
            <Receipt 
              sale={recentSale} 
              businessInfo={businessInfo} 
            />
          </CardContent>
        </Card>
      )}

      {/* Business Information Setup/Edit Modal */}
      <Dialog open={showSetupModal || editMode} onOpenChange={(open) => {
        if (!open) {
          setShowSetupModal(false);
          setEditMode(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {businessInfo ? "Edit Business Information" : "Set Up Business Information"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[70vh] overflow-y-auto pr-3">
            <div className="p-1">
              <BusinessInfoForm
                initialData={businessInfo ? {
                  businessName: businessInfo.business_name,
                  address: businessInfo.address,
                  city: businessInfo.city,
                  state: businessInfo.state,
                  zipCode: businessInfo.zip_code,
                  phone: businessInfo.phone,
                  email: businessInfo.email,
                  website: businessInfo.website || '',
                  taxId: businessInfo.tax_id || '',
                  thankYouMessage: businessInfo.thank_you_message || ''
                } : undefined}
                onSaved={handleBusinessInfoSaved}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receipts;
