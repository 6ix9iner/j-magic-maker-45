
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { getProductByBarcode } from '@/lib/offline/repository';
import { pickFitClass, MONEY_FIT_STEPS_BASE } from '@/utils/fitText';
import { getErrorMessage } from '@/utils/errors';

// Define a minimal product interface with only the fields we need
interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
  user_id: string; // Added user_id as a required field
}

interface ProductLookupProps {
  barcodeValue: string | null;
  onAddToSale?: (product: Product, quantity: number) => void;
}

const ProductLookup = ({ barcodeValue, onAddToSale }: ProductLookupProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept as a string so the field can be fully cleared while typing (e.g.
  // to overwrite the default "1") instead of snapping back to the last
  // valid number on every keystroke. Parsed to a number only when needed.
  const [quantity, setQuantity] = useState('1');
  const { user } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!barcodeValue || !user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Local-first on native (works offline), direct Supabase on web -
        // see lib/offline/repository.ts.
        const data = await getProductByBarcode(user.id, barcodeValue);

        if (data) {
          const productData: Product = {
            id: data.id,
            barcode: data.barcode,
            name: data.name,
            price: data.price,
            stock_count: data.stock_count,
            category: data.category,
            user_id: data.user_id
          };

          setProduct(productData);
        } else {
          setError(`No product found with barcode: ${barcodeValue}`);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Error looking up product'));
        console.error('Product lookup error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [barcodeValue, user]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center p-8">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-destructive text-center p-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold">{product.name}</h3>
            <p className="text-muted-foreground">Barcode: {product.barcode}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Price</p>
              <p className={`min-w-0 break-words leading-tight font-medium tabular-nums ${pickFitClass(`₦${product.price.toFixed(2)}`, MONEY_FIT_STEPS_BASE)}`}>
                ₦{product.price.toFixed(2)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">In Stock</p>
              <p className="text-lg font-medium truncate">{product.stock_count}</p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="text-lg font-medium truncate">{product.category || 'N/A'}</p>
            </div>
          </div>

          {onAddToSale && (
            <div className="pt-4">
              <div className="flex items-center gap-4">
                <div>
                  <label htmlFor="quantity" className="text-sm text-muted-foreground">Quantity</label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={product.stock_count}
                    value={quantity}
                    onChange={(e) => {
                      const raw = e.target.value;
                      // Allow the field to sit empty while the user is
                      // typing/deleting - don't force it back to a number
                      // on every keystroke, only digits are accepted.
                      if (raw === '' || /^\d+$/.test(raw)) {
                        setQuantity(raw);
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      // Once they're done editing, fall back to a valid
                      // minimum instead of leaving it blank.
                      if (quantity === '' || parseInt(quantity, 10) < 1) {
                        setQuantity('1');
                      }
                    }}
                    className="w-24"
                  />
                </div>
                <Button
                  onClick={() => {
                    const qty = parseInt(quantity, 10);
                    if (!qty || qty < 1) {
                      toast.error('Enter a valid quantity');
                      return;
                    }
                    if (product && onAddToSale) {
                      if (qty > product.stock_count) {
                        toast.error(`Only ${product.stock_count} items in stock`);
                        return;
                      }
                      onAddToSale(product, qty);
                      toast.success(`Added ${qty} x ${product.name} to sale`);
                    }
                  }}
                  className="flex-1"
                  disabled={product.stock_count < 1}
                >
                  {product.stock_count < 1 ? "Out of Stock" : "Add to Sale"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductLookup;
