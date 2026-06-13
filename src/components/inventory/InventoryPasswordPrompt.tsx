import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface InventoryPasswordPromptProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

const InventoryPasswordPrompt = ({ isOpen, onSuccess, onCancel, onVerifyPassword }: InventoryPasswordPromptProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Please enter your inventory password');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await onVerifyPassword(password);
      
      if (isValid) {
        toast.success('Access granted');
        setPassword('');
        onSuccess();
      } else {
        toast.error('Invalid password. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg p-6 bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            Inventory Access Required
          </DialogTitle>
          <DialogDescription className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm mt-1.5">
            Enter your inventory password to access the inventory management system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="inventory-password" className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Input
                id="inventory-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter inventory password"
                className="h-11 pl-4 pr-11 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50"
                autoComplete="off"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3.5 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isVerifying}
              className="h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all"
            >
              {isVerifying ? 'Verifying...' : 'Access Inventory'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryPasswordPrompt;