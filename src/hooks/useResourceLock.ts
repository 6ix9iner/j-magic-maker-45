import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessInfo, saveBusinessInfo } from '@/lib/offline/repository';
import { hashResourcePassword, verifyResourcePassword, ResourceLock } from '@/utils/resourcePassword';

interface UseResourceLockOptions {
  resource: ResourceLock;
  /** Called once access is confirmed - either there was no password set at
   * all, or the user just entered the correct one. Typically the page's
   * own data fetch (fetchProducts, fetchSales, ...). */
  onUnlocked: () => void | Promise<void>;
}

interface UseResourceLockResult {
  isUnlocked: boolean;
  isPasswordPromptOpen: boolean;
  /** True while the initial "does this screen have a password at all"
   * check is in flight - distinct from whatever loading state the page
   * uses for its own data, so a slow product/sales fetch never gets
   * mistaken for a still-pending access check or vice versa. */
  isCheckingAccess: boolean;
  verifyPassword: (password: string) => Promise<boolean>;
  handlePasswordSuccess: () => void;
  handlePasswordCancel: () => void;
}

/**
 * Drives the optional password gate shared by Inventory and Sales (see
 * InventoryPasswordSettings.tsx / SalesPasswordSettings.tsx for where the
 * password itself gets set). Both screens had this exact logic duplicated
 * - same mount/unmount effects, same verify-then-transparently-upgrade-the-
 * legacy-hash flow, same cancel-goes-to-dashboard behavior - differing only
 * in which business_info column holds the hash.
 */
export function useResourceLock({ resource, onUnlocked }: UseResourceLockOptions): UseResourceLockResult {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const hashField = resource === 'inventory' ? 'inventory_password_hash' : 'sales_password_hash';

  const checkPassword = async () => {
    if (!user) return;
    setIsCheckingAccess(true);
    try {
      const data = await getBusinessInfo(user.id);
      const hash = data?.[hashField] ?? null;
      setPasswordHash(hash);
      if (hash) {
        setIsPasswordPromptOpen(true);
        setIsCheckingAccess(false);
      } else {
        setIsUnlocked(true);
        setIsCheckingAccess(false);
        await onUnlocked();
      }
    } catch (error) {
      console.error(`Error checking ${resource} password:`, error);
      toast.error('Failed to verify access');
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    // Always reset unlock status when the screen mounts, so the prompt
    // shows again every time - it's not meant to stay unlocked forever
    // just because it was unlocked once earlier in the session.
    setIsUnlocked(false);
    if (user) checkPassword();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    return () => {
      setIsUnlocked(false);
      setIsPasswordPromptOpen(false);
    };
  }, []);

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!passwordHash) return false;

    const isCorrect = await verifyResourcePassword(password, passwordHash);

    // Transparently upgrade old, non-cryptographic hashes to the new
    // PBKDF2 format now that we know the password is correct - the user
    // never notices, but their stored hash gets meaningfully stronger.
    if (isCorrect && !passwordHash.startsWith('pbkdf2$') && user) {
      try {
        const info = await getBusinessInfo(user.id);
        if (info) {
          const upgradedHash = await hashResourcePassword(password);
          await saveBusinessInfo(user.id, { ...info, [hashField]: upgradedHash });
          setPasswordHash(upgradedHash);
        }
      } catch (error) {
        console.error(`Failed to upgrade ${resource} password hash:`, error);
        // Non-fatal - the legacy hash still verifies correctly next time.
      }
    }

    return isCorrect;
  };

  const handlePasswordSuccess = () => {
    setIsUnlocked(true);
    setIsPasswordPromptOpen(false);
    onUnlocked();
  };

  const handlePasswordCancel = () => {
    setIsPasswordPromptOpen(false);
    navigate('/dashboard'); // Redirect to dashboard if they cancel
  };

  return { isUnlocked, isPasswordPromptOpen, isCheckingAccess, verifyPassword, handlePasswordSuccess, handlePasswordCancel };
}
