import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';

type LoginFormValues = {
  email: string;
  password: string;
};
type SignupFormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};
const Auth = () => {
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [emailConfirmationError, setEmailConfirmationError] = useState(false);
  const [emailForConfirmation, setEmailForConfirmation] = useState('');

  // Check if this is a password reset flow
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const isReset = query.get('reset') === 'true';
    setIsResetMode(isReset);
  }, [location]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !isResetMode) {
      navigate('/');
    }
  }, [user, navigate, isResetMode]);
  const loginForm = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const signupForm = useForm<SignupFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });
  const handleLogin = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('Email not confirmed')) {
        setEmailConfirmationError(true);
        setEmailForConfirmation(data.email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSignup = async (data: SignupFormValues) => {
    if (data.password !== data.confirmPassword) {
      signupForm.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password, data.fullName);
      setEmailForConfirmation(data.email);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleResendConfirmation = async () => {
    if (!emailForConfirmation) {
      toast.error('Email address is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email: emailForConfirmation
      });
      if (error) throw error;
      toast.success('Confirmation email resent successfully');
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      toast.error(error.message || 'Failed to resend confirmation email');
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
      const {
        error
      } = await supabase.auth.updateUser({
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

  // Animation variants
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };
  if (isResetMode) {
    return <motion.div className="flex min-h-[80vh] items-center justify-center p-4" initial="hidden" animate="visible" variants={containerVariants}>
        <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(99,102,241,0.06)] rounded-3xl overflow-hidden">
          <CardHeader className="space-y-2 text-center pb-6 pt-8 border-b border-slate-50 dark:border-slate-800">
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
              <Logo iconOnly size={40} />
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Set New Password</CardTitle>
              <CardDescription className="text-slate-400 dark:text-slate-500 font-medium">Enter your new password below</CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <motion.div className="space-y-2" variants={itemVariants}>
                <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300 font-medium">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Password must be at least 6 characters
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>;
  }
  return <motion.div className="flex min-h-[80vh] items-center justify-center p-4" initial="hidden" animate="visible" variants={containerVariants}>
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(99,102,241,0.06)] rounded-3xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-6 pt-8 border-b border-slate-50 dark:border-slate-800">
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
            <Logo size={42} className="mb-1" />
            <CardDescription className="text-slate-400 dark:text-slate-500 font-medium text-sm sm:text-base">Enterprise inventory management</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="p-6 bg-transparent text-slate-800 dark:text-slate-200">
          {emailConfirmationError && <motion.div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl p-4 mb-6" variants={itemVariants}>
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email not confirmed</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Please check your email and click the confirmation link.
                  </p>
                  <Button variant="outline" className="mt-3 text-xs text-slate-600 hover:text-slate-800 border-slate-200 hover:bg-slate-100/50 h-8 rounded-lg" onClick={handleResendConfirmation} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Resend confirmation email'}
                  </Button>
                </div>
              </div>
            </motion.div>}
          
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-50 dark:bg-slate-800 border-0 p-1 h-11 rounded-xl">
              <TabsTrigger value="login" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-semibold rounded-lg transition-all">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400 font-semibold rounded-lg transition-all">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" {...loginForm.register('email', {
                  required: true
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">Password</Label>
                    <Link to="/reset-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" type="password" {...loginForm.register('password', {
                  required: true
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2">
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300 font-medium">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" {...signupForm.register('fullName', {
                  required: true
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="signupEmail" className="text-slate-700 dark:text-slate-300 font-medium">Email</Label>
                  <Input id="signupEmail" type="email" placeholder="your@email.com" {...signupForm.register('email', {
                  required: true
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="signupPassword" className="text-slate-700 dark:text-slate-300 font-medium">Password</Label>
                  <Input id="signupPassword" type="password" {...signupForm.register('password', {
                  required: true,
                  minLength: 6
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                  {signupForm.formState.errors.password?.type === 'minLength' && <p className="text-xs text-red-500 font-medium mt-1">Password must be at least 6 characters</p>}
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-medium">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" {...signupForm.register('confirmPassword', {
                  required: true
                })} className="h-11 px-4 rounded-xl border border-slate-200 focus-visible:ring-indigo-600 focus-visible:ring-1 focus-visible:ring-offset-0 bg-slate-50/50" />
                  {signupForm.formState.errors.confirmPassword?.message && <p className="text-xs text-red-500 font-medium mt-1">
                      {signupForm.formState.errors.confirmPassword?.message}
                    </p>}
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2">
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing up...' : 'Create Account'}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>;
};
export default Auth;
