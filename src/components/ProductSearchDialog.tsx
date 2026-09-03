import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, X, PackageSearch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProducts } from '@/lib/offline/repository';
import { pickFitClass, MONEY_FIT_STEPS_SM } from '@/utils/fitText';

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id: string;
}

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the barcode of the product the user picked - the caller
   * feeds this into the same lookup/add-to-sale flow a real scan uses. */
  onSelectBarcode: (barcode: string) => void;
}

// Alternative to scanning: search your own inventory by name/barcode and
// pick a product to add to the current sale. Picking a result just hands
// its barcode back to the caller, which runs it through the exact same
// lookup + "add to sale" sheet a real scan would - no separate code path
// to keep in sync.
const ProductSearchDialog = ({ open, onOpenChange, onSelectBarcode }: ProductSearchDialogProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setQuery('');
    setLoading(true);
    getProducts(user.id)
      .then((data) => setProducts(data as Product[]))
      .catch((err) => console.error('Error loading products for search:', err))
      .finally(() => setLoading(false));
  }, [open, user]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    );
  }, [products, query]);

  const formatCurrency = (amount: number) => `₦${amount.toFixed(2)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-slate-100 dark:border-slate-800 p-0 bg-white dark:bg-slate-900 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Find a Product</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or barcode..."
              className="h-11 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500">
              <PackageSearch className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">
                {products.length === 0 ? 'No products in inventory yet' : 'No matching products'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((p) => {
                const priceText = formatCurrency(p.price);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectBarcode(p.barcode)}
                    disabled={p.stock_count < 1}
                    className="w-full flex items-center gap-3 py-3 text-left disabled:opacity-40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {p.stock_count < 1 ? 'Out of stock' : `${p.stock_count} in stock`}
                        {p.category ? ` · ${p.category}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 font-bold text-slate-800 dark:text-slate-100 tabular-nums ${pickFitClass(priceText, MONEY_FIT_STEPS_SM)}`}>
                      {priceText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSearchDialog;
