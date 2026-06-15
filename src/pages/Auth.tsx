import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Check if this is a password reset flow
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const isReset = query.get('reset') === 'true';
    setIsResetMode(isReset);
  }, [location]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isResetMode) {
      navigate('/scanner');
    }
  }, [user, navigate, isResetMode]);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/scanner`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to start Google sign-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/scanner`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Apple login error:', error);
      toast.error(error.message || 'Failed to start Apple sign-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/scanner`
        }
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success('Verification code sent! Please check your inbox.');
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });
      if (error) throw error;
      toast.success('Successfully authenticated!');
      navigate('/scanner');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      navigate('/auth');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.15,
        duration: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  if (isResetMode) {
    return (
      <motion.div 
        className="w-full min-h-screen flex flex-col justify-center items-center px-6 py-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200"
        initial="hidden" 
        animate="visible" 
        variants={containerVariants}
      >
        <div className="w-full max-w-[360px] flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Logo size={48} iconOnly />
            <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Enter your new password below</p>
          </div>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                minLength={6} 
                required 
                className="h-12 px-5 rounded-full border border-slate-200 dark:border-slate-800 bg-transparent focus-visible:ring-indigo-500 focus-visible:ring-2 focus-visible:ring-offset-0 focus:border-indigo-500 focus:outline-none" 
              />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Password must be at least 6 characters
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full active:scale-[0.98] transition-all" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="w-full min-h-[100dvh] flex flex-col justify-center items-center px-6 py-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="w-full max-w-[360px] flex flex-col gap-6 justify-center">
        <AnimatePresence mode="wait">
          {!otpSent ? (
            <motion.div
              key="email-stage"
              className="flex flex-col gap-5 w-full"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo & Headline */}
              <div className="flex flex-col items-center gap-3 text-center">
                <Logo size={42} textClassName="text-2xl font-bold" />
                <h1 className="text-3xl font-semibold tracking-tight leading-tight mt-2 text-slate-800 dark:text-slate-200">
                  Simplify your inventory with Insight
                </h1>
              </div>

              {/* Social Login Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 flex items-center justify-center gap-3 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={handleAppleLogin}
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 flex items-center justify-center gap-3 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="shrink-0 text-slate-900 dark:text-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.1.08.2.12.3.12.87 0 1.96-.59 2.52-1.45z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-0.5">
                <div className="h-[1.5px] flex-grow bg-slate-200 dark:bg-slate-800"></div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">or</span>
                <div className="h-[1.5px] flex-grow bg-slate-200 dark:bg-slate-800"></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendOtp} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Personal or work email"
                  required
                  disabled={isSubmitting}
                  className="w-full h-11 px-5 text-center sm:text-left text-sm rounded-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150"
                />

                <AnimatePresence>
                  {email.trim().length > 0 && (
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || !validateEmail(email)}
                      className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 44, y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isSubmitting ? 'Sending code...' : 'Continue with Email'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp-stage"
              className="flex flex-col gap-5 w-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Logo & Headline */}
              <div className="flex flex-col items-center gap-3 text-center">
                <Logo size={42} iconOnly />
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mt-2">
                  Check your email
                </h1>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium px-4">
                  We sent a temporary verification code to <span className="font-semibold text-slate-700 dark:text-slate-350">{email}</span>.
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                  disabled={isSubmitting}
                  className="w-full h-11 text-center text-2xl font-bold tracking-[0.4em] px-5 rounded-full border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-150"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify Code'}
                </Button>
              </form>

              {/* Navigation Options */}
              <div className="flex justify-between items-center w-full px-2 mt-1">
                <button
                  onClick={handleSendOtp}
                  disabled={isSubmitting}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold bg-transparent border-0 cursor-pointer disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                  disabled={isSubmitting}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:underline font-medium bg-transparent border-0 cursor-pointer disabled:opacity-50"
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info inside the same vertical flex group */}
        <div className="w-full text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-normal mt-2">
          By continuing, you agree to Insight Inventory's{' '}
          <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-350">
            Consumer Terms
          </a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-350">
            Usage Policy
          </a>
          , and acknowledge their{' '}
          <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-350">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;

