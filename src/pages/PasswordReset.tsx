
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) throw error;
      
      setIsSent(true);
      toast.success('Password reset instructions sent to your email');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(error.message || 'Failed to send reset email');
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
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reset Your Password</CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-500 font-medium text-sm px-2">
              {!isSent 
                ? 'Enter your email and we will send you a password reset link' 
                : 'Please check your email for the password reset link'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 bg-transparent text-slate-800 dark:text-slate-200">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 sm:h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50"
                />
              </div>
              
              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs sm:text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold text-xs sm:text-sm"
                  onClick={() => navigate('/auth')}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                If an account exists with this email address, you will receive a password reset link.
                The link will expire after 24 hours.
              </p>
              
              <Button 
                className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100/50 font-semibold text-xs sm:text-sm"
                variant="outline" 
                onClick={() => navigate('/auth')}
              >
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PasswordReset;
