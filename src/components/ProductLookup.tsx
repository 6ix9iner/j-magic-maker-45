
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

// Define a minimal product interface to avoid deep type instantiation issues
interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_count: number;
  category: string | null;
}

interface ProductLookupProps {
  barcodeValue: string | null;
  onAddToSale?: (product: Product, quantity: number) => void;
}

const ProductLookup = ({ barcodeValue, onAddToSale }: ProductLookupProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!barcodeValue || !user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use a raw query approach to avoid type inference issues
        const { data: rawData, error } = await supabase
          .rpc('get_product_by_barcode', { 
            barcode_param: barcodeValue,
            user_id_param: user.id
          });
        
        if (error) throw error;
        
        if (rawData) {
          // Create a new product object with only the fields we need
          setProduct({
            id: rawData.id,
            barcode: rawData.barcode,
            name: rawData.name,
            price: rawData.price,
            stock_count: rawData.stock_count,
            category: rawData.category
          });
        } else {
          // If RPC doesn't exist or returns no results, fall back to a safer query
          const { data, error: queryError } = await supabase
            .from('products')
            .select('id, barcode, name, price, stock_count, category')
            .eq('barcode', barcodeValue)
            .eq('user_id', user.id)
            .limit(1);
            
          if (queryError) throw queryError;
          
          if (data && data.length > 0) {
            const productData = data[0];
            setProduct({
              id: productData.id,
              barcode: productData.barcode,
              name: productData.name,
              price: productData.price,
              stock_count: productData.stock_count,
              category: productData.category
            });
          } else {
            setError(`No product found with barcode: ${barcodeValue}`);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error looking up product');
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
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-lg font-medium">${product.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Stock</p>
              <p className="text-lg font-medium">{product.stock_count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="text-lg font-medium">{product.category || 'N/A'}</p>
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
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        setQuantity(value);
                      }
                    }}
                    className="w-24"
                  />
                </div>
                <Button 
                  onClick={() => {
                    if (product && onAddToSale) {
                      if (quantity > product.stock_count) {
                        toast.error(`Only ${product.stock_count} items in stock`);
                        return;
                      }
                      onAddToSale(product, quantity);
                      toast.success(`Added ${quantity} x ${product.name} to sale`);
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
