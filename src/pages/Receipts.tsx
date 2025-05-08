
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/settings")}
          className="mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Receipt Generator</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          {businessInfo ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium">Business Details</h3>
                  <p>{businessInfo.business_name}</p>
                  <p>{businessInfo.address}</p>
                  <p>{businessInfo.city}, {businessInfo.state} {businessInfo.zip_code}</p>
                </div>
                <div>
                  <h3 className="font-medium">Contact Information</h3>
                  <p>Phone: {businessInfo.phone}</p>
                  <p>Email: {businessInfo.email}</p>
                  {businessInfo.website && <p>Website: {businessInfo.website}</p>}
                </div>
              </div>
              <Button onClick={() => setEditMode(true)}>Edit Business Information</Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">
                You need to set up your business information first to generate receipts.
              </p>
              <Button onClick={() => setShowSetupModal(true)}>Set Up Business Information</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {businessInfo && recentSale && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Receipt Preview</CardTitle>
          </CardHeader>
          <CardContent>
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
