import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';
import { completeResourcePasswordReset, ResourceLock } from '@/utils/resourcePassword';
import { getErrorMessage } from '@/utils/errors';

const RESOURCE_LABEL: Record<ResourceLock, string> = {
  inventory: 'Inventory',
  sales: 'Sales',
};

// Reached only via the link emailed by request-resource-password-reset -
// this is for the Inventory/Sales screen locks, not the account login
// password (see PasswordReset.tsx for that). Deliberately not wrapped in
// ProtectedRoute/PublicRoute (App.tsx): the person opening this link may
// still be signed into the app in this same browser, or may not be signed
// in at all - either way the token itself, not a session, is the
// credential here.
const ResetResourcePassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const resourceParam = searchParams.get('resource');
  const resource: ResourceLock = resourceParam === 'sales' ? 'sales' : 'inventory';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const label = RESOURCE_LABEL[resource];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('This reset link is missing its token.');
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

    setIsSubmitting(true);
    try {
      await completeResourcePasswordReset(token, newPassword);
      setIsDone(true);
      toast.success(`Your ${label} password has been reset.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reset password. The link may have expired.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-start sm:justify-center overflow-y-auto pt-6 pb-24 sm:py-8 px-4 min-h-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(99,102,241,0.06)] rounded-3xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-4 pt-6 sm:pb-6 sm:pt-8 border-b border-slate-50 dark:border-slate-800">
          <div className="flex flex-col items-center gap-2">
            <Logo size={42} className="mb-1" />
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reset {label} Password</CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-500 font-medium text-sm px-2">
              {!isDone
                ? `Set a new password for your ${label} screen. This is separate from your account login password.`
                : `Your ${label} password has been updated.`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 bg-transparent text-slate-800 dark:text-slate-200">
          {!token ? (
            <p className="text-sm text-red-500 text-center">
              This link is missing its reset token. Please use the link from your email, or request a new one from the app.
            </p>
          ) : !isDone ? (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={4}
                  className="h-10 sm:h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10 sm:h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 sm:h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs sm:text-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting...' : `Set New ${label} Password`}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                You can now go back to the app and unlock {label} with your new password.
              </p>
              <Button
                className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold text-xs sm:text-sm"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Return to MySkrib
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ResetResourcePassword;
