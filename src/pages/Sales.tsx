import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronUp, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Receipt from "@/components/receipt/Receipt";
import { exportSalesToCSV } from "@/utils/salesExport";
import { getSales, getBusinessInfo, saveBusinessInfo, deleteSale } from "@/lib/offline/repository";
import { pickFitClass, MONEY_FIT_STEPS_SM } from "@/utils/fitText";
import { hashResourcePassword, verifyResourcePassword } from "@/utils/resourcePassword";
import SalesPasswordPrompt from "@/components/sales/SalesPasswordPrompt";
import { getErrorMessage } from "@/utils/errors";

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

  // Sales history is optionally password-protected, same pattern as
  // Inventory (see Inventory.tsx / SalesPasswordSettings.tsx).
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isSalesUnlocked, setIsSalesUnlocked] = useState(false);
  const [salesPasswordHash, setSalesPasswordHash] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const [saleToDelete, setSaleToDelete] = useState<SaleData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsSalesUnlocked(false);
    if (user) checkSalesPassword();
  }, [user]);

  useEffect(() => {
    return () => {
      setIsSalesUnlocked(false);
      setIsPasswordPromptOpen(false);
    };
  }, []);

  const checkSalesPassword = async () => {
    if (!user) return;
    setIsCheckingAccess(true);
    try {
      const data = await getBusinessInfo(user.id);
      const hasPassword = data?.sales_password_hash;
      setSalesPasswordHash(hasPassword || null);
      if (hasPassword) {
        setIsPasswordPromptOpen(true);
        setIsCheckingAccess(false);
      } else {
        setIsSalesUnlocked(true);
        setIsCheckingAccess(false);
        fetchSales();
      }
    } catch (error) {
      console.error('Error checking sales password:', error);
      toast.error('Failed to verify access');
      navigate('/dashboard');
    }
  };

  const verifySalesPassword = async (password: string): Promise<boolean> => {
    if (!salesPasswordHash) return false;

    const isCorrect = await verifyResourcePassword(password, salesPasswordHash);

    // Transparently upgrade old, non-cryptographic hashes to the new
    // PBKDF2 format now that we know the password is correct.
    if (isCorrect && !salesPasswordHash.startsWith('pbkdf2$') && user) {
      try {
        const info = await getBusinessInfo(user.id);
        if (info) {
          const upgradedHash = await hashResourcePassword(password);
          await saveBusinessInfo(user.id, { ...info, sales_password_hash: upgradedHash });
          setSalesPasswordHash(upgradedHash);
        }
      } catch (error) {
        console.error('Failed to upgrade sales password hash:', error);
        // Non-fatal - the legacy hash still verifies correctly next time.
      }
    }

    return isCorrect;
  };

  const handlePasswordSuccess = () => {
    setIsSalesUnlocked(true);
    setIsPasswordPromptOpen(false);
    fetchSales();
  };

  const handlePasswordCancel = () => {
    setIsPasswordPromptOpen(false);
    navigate('/dashboard');
  };

  const fetchSales = async () => {
    try {
      if (!user) {
        setSales([]);
        setLoading(false);
        return;
      }

      // Local-first on native (works offline, includes anything sold
      // offline that hasn't synced yet), direct Supabase on web.
      const salesData = await getSales(user.id);
      setSales(salesData.map((s) => ({ ...s, isExpanded: false })));
    } catch (error) {
      console.error("Error fetching sales data:", error);
      toast.error("Failed to fetch sales data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch business info when needed
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!user) return;

      try {
        const data = await getBusinessInfo(user.id);
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
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
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

  const confirmDeleteSale = async () => {
    if (!saleToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteSale(user.id, saleToDelete.id);
      setSales((prev) => prev.filter((s) => s.id !== saleToDelete.id));
      toast.success("Sale deleted - stock has been restored.");
      setSaleToDelete(null);
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error(getErrorMessage(error, "Failed to delete sale"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Don't render sales content until password is verified (if one is set).
  if (!isSalesUnlocked) {
    return (
      <>
        <SalesPasswordPrompt
          isOpen={isPasswordPromptOpen}
          onSuccess={handlePasswordSuccess}
          onCancel={handlePasswordCancel}
          onVerifyPassword={verifySalesPassword}
        />
        {isCheckingAccess && (
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
      <div className="flex-shrink-0 flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-9 w-9 p-0 rounded-xl border-slate-200 hover:bg-slate-100/50 shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
          Sales History
        </h1>
      </div>

      <div className="flex-grow overflow-y-auto min-h-0 pb-24 pr-1">
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">My Sales</CardTitle>
              <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Your personal sales transaction history</CardDescription>
            </div>
            {sales.length > 0 && (
              <Button
                onClick={handleDownloadSales}
                className="h-9 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 px-3"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3.5 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : sales.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map((sale, index) => (
                <div key={sale.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSaleDetails(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSaleDetails(index);
                      }
                    }}
                    className="w-full flex flex-col gap-2 py-3.5 text-left cursor-pointer sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {sale.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{formatDate(sale.created_at)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {sale.payment_method || "Cash"}{sale.transaction_id ? ` · ${sale.transaction_id}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2 pl-12 sm:pl-0 sm:justify-end sm:shrink-0 min-w-0">
                      <span className={`min-w-0 break-words text-right leading-tight font-bold text-slate-800 dark:text-slate-100 tabular-nums ${pickFitClass(formatCurrency(sale.total_amount), MONEY_FIT_STEPS_SM)}`}>
                        {formatCurrency(sale.total_amount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipt(sale);
                        }}
                      >
                        Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaleToDelete(sale);
                        }}
                        aria-label="Delete sale"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {sale.isExpanded && (
                    <div className="mb-3 -mt-1 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                      <h4 className="font-semibold text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Items</h4>
                      {sale.items && sale.items.length > 0 ? (
                        <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                          {sale.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                  {item.name_at_sale || "Unknown Item"}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                  {item.quantity} × {formatCurrency(item.price_at_sale)}
                                </p>
                              </div>
                              <span className={`min-w-0 max-w-[45%] break-words text-right leading-tight font-semibold text-slate-700 dark:text-slate-200 tabular-nums ${pickFitClass(formatCurrency(item.price_at_sale * item.quantity), MONEY_FIT_STEPS_SM)}`}>
                                {formatCurrency(item.price_at_sale * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No item details available</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {user ? "No sales records found for your account" : "Please sign in to view your sales records"}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

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

      {/* Delete confirmation */}
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              {saleToDelete && (
                <>
                  This will permanently remove the {formatCurrency(saleToDelete.total_amount)} sale from{" "}
                  {formatDate(saleToDelete.created_at)} and restore the items it contained back to your inventory
                  stock. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSale}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;
