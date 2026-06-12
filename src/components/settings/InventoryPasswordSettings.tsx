import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InventoryPasswordSettingsProps {
  hasPassword: boolean;
  onPasswordChange: () => void;
}

const InventoryPasswordSettings = ({ hasPassword, onPasswordChange }: InventoryPasswordSettingsProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Simple hash function for password storage (in production, use proper bcrypt)
  const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('business_info')
        .select('inventory_password_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      const hashedInput = hashPassword(password);
      return data?.inventory_password_hash === hashedInput;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Validate inputs
    if (hasPassword && !currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Verify current password if one exists
      if (hasPassword) {
        const isCurrentValid = await verifyCurrentPassword(currentPassword);
        if (!isCurrentValid) {
          toast.error('Current password is incorrect');
          setIsLoading(false);
          return;
        }
      }

      // Hash the new password
      const hashedNewPassword = hashPassword(newPassword);

      // Update or create business info with new password
      const { error } = await supabase
        .from('business_info')
        .upsert({
          user_id: user.id,
          inventory_password_hash: hashedNewPassword,
          // Include required fields with defaults if they don't exist
          business_name: 'My Business',
          address: 'Business Address',
          city: 'City',
          state: 'State',
          zip_code: '00000',
          phone: '000-000-0000',
          email: user.email || 'business@example.com'
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success(hasPassword ? 'Inventory password updated successfully' : 'Inventory password set successfully');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      onPasswordChange();
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!currentPassword) {
      toast.error('Please enter your current password to remove protection');
      return;
    }

    setIsLoading(true);

    try {
      // Verify current password
      const isCurrentValid = await verifyCurrentPassword(currentPassword);
      if (!isCurrentValid) {
        toast.error('Current password is incorrect');
        setIsLoading(false);
        return;
      }

      // Remove password by setting it to null
      const { error } = await supabase
        .from('business_info')
        .update({ inventory_password_hash: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Inventory password protection removed');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      onPasswordChange();
    } catch (error) {
      console.error('Error removing password:', error);
      toast.error('Failed to remove password protection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Inventory Security
        </CardTitle>
        <CardDescription>
          {hasPassword 
            ? 'Manage your inventory password protection settings'
            : 'Set up password protection for your inventory'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">
              {hasPassword ? 'New Password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 4 characters)"
                className="pr-10"
                minLength={4}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Lock className="h-4 w-4" />
              {isLoading 
                ? 'Updating...' 
                : hasPassword ? 'Update Password' : 'Set Password'
              }
            </Button>
            
            {hasPassword && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemovePassword}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Remove Protection
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default InventoryPasswordSettings;