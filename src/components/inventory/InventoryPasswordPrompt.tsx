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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Inventory Access Required
          </DialogTitle>
          <DialogDescription>
            Enter your inventory password to access the inventory management system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-password">Password</Label>
            <div className="relative">
              <Input
                id="inventory-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter inventory password"
                className="pr-10"
                autoComplete="off"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying || !password.trim()}
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