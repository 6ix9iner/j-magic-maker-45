
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

const Sales = () => {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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
          <CardTitle>My Sales</CardTitle>
          <CardDescription>Your personal sales transaction history</CardDescription>
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
                      </TableRow>
                      {sale.isExpanded && (
                        <TableRow key={`${sale.id}-details`}>
                          <TableCell colSpan={5}>
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
    </div>
  );
};

export default Sales;
