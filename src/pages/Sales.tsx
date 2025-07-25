import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Receipt from "@/components/receipt/Receipt";
import { exportSalesToCSV } from "@/utils/salesExport";

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
  isExpanded?: boolean;
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

const Sales = () => {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSale, setSelectedSale] = useState<SaleData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        if (!user) {
          setSales([]);
          setLoading(false);
          return;
        }

        // First fetch the sales data
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (salesError) {
          throw salesError;
        }

        if (!salesData || salesData.length === 0) {
          setSales([]);
          setLoading(false);
          return;
        }

        // For each sale, fetch its items
        const salesWithItems = await Promise.all(
          salesData.map(async (sale) => {
            const { data: saleItems, error: itemsError } = await supabase
              .from("sale_items")
              .select("*")
              .eq("sale_id", sale.id);

            if (itemsError) {
              console.error("Error fetching sale items:", itemsError);
              return { ...sale, items: [] };
            }

            return { 
              ...sale, 
              items: saleItems || [],
              isExpanded: false 
            };
          })
        );

        setSales(salesWithItems);
        console.log("Sales data with items:", salesWithItems);
      } catch (error) {
        console.error("Error fetching sales:", error);
        toast.error("Failed to fetch sales data");
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [user]);

  // Fetch business info when needed
  useEffect(() => {
    const fetchBusinessInfo = async () => {
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
        }
      } catch (error) {
        console.error("Error fetching business info:", error);
      }
    };

    if (showReceiptModal && !businessInfo) {
      fetchBusinessInfo();
    }
  }, [showReceiptModal, user, businessInfo]);

  const toggleSaleDetails = (index: number) => {
    setSales(prevSales => {
      const updatedSales = [...prevSales];
      updatedSales[index] = { 
        ...updatedSales[index], 
        isExpanded: !updatedSales[index].isExpanded 
      };
      return updatedSales;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewReceipt = (sale: SaleData) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedSale(null);
  };

  const handleDownloadSales = async () => {
    if (!user) {
      toast.error("Please sign in to download sales data");
      return;
    }

    if (sales.length === 0) {
      toast.error("No sales data to download");
      return;
    }

    try {
      // Get business name for the export
      let businessName = "My Business";
      if (businessInfo) {
        businessName = businessInfo.business_name;
      }

      // Export sales data
      exportSalesToCSV(sales, businessName);
      toast.success("Sales data downloaded successfully!");
    } catch (error) {
      console.error("Error downloading sales data:", error);
      toast.error("Failed to download sales data");
    }
  };

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
        <h1 className="text-3xl font-bold">Sales History</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Sales</CardTitle>
              <CardDescription>Your personal sales transaction history</CardDescription>
            </div>
            {sales.length > 0 && (
              <Button 
                onClick={handleDownloadSales}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : sales.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale, index) => (
                    <React.Fragment key={sale.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleSaleDetails(index)}>
                        <TableCell>
                          {sale.isExpanded ? 
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                          }
                        </TableCell>
                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                        <TableCell>{sale.transaction_id || "N/A"}</TableCell>
                        <TableCell>{sale.payment_method || "Cash"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReceipt(sale);
                            }}
                          >
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                      {sale.isExpanded && (
                        <TableRow key={`${sale.id}-details`}>
                          <TableCell colSpan={6}>
                            <div className="bg-gray-50 p-4 rounded-md">
                              <h4 className="font-medium mb-2">Sale Items:</h4>
                              {sale.items && sale.items.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Item</TableHead>
                                      <TableHead>Price</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          {item.name_at_sale || "Unknown Item"}
                                          {item.barcode_at_sale && (
                                            <div className="text-xs text-muted-foreground">
                                              {item.barcode_at_sale}
                                            </div>
                                          )}
                                        </TableCell>
                                        <TableCell>{formatCurrency(item.price_at_sale)}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                          {formatCurrency(item.price_at_sale * item.quantity)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-sm text-gray-500">No item details available</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {user ? "No sales records found for your account" : "Please sign in to view your sales records"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && businessInfo && (
        <Dialog open={showReceiptModal} onOpenChange={closeReceiptModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sale Receipt</DialogTitle>
            </DialogHeader>
            <Receipt sale={selectedSale} businessInfo={businessInfo} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Sales;
