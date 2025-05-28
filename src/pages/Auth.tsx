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
        <Card className="w-full max-w-md premium-card shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center bg-gradient-to-r from-blue-800 to-indigo-900 text-white pb-6 pt-8">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription className="text-blue-200">Enter your new password below</CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-br from-blue-950/90 to-indigo-950/90 backdrop-blur-lg text-white">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <motion.div className="space-y-2" variants={itemVariants}>
                <Label htmlFor="newPassword" className="text-white">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required className="premium-input" />
                <p className="text-xs text-blue-200/70">
                  Password must be at least 6 characters
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button type="submit" className="w-full premium-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>;
  }
  return <motion.div className="flex min-h-[80vh] items-center justify-center p-4" initial="hidden" animate="visible" variants={containerVariants}>
      <Card className="w-full max-w-md shadow-2xl overflow-hidden border-0 rounded-xl">
        <CardHeader className="space-y-1 text-center bg-gradient-to-r from-blue-800 to-indigo-900 text-white pb-6 pt-8 bg-gray-950">
          <motion.div variants={itemVariants}>
            <CardTitle className="text-3xl font-bold tracking-tight">Insight Inventory</CardTitle>
            <CardDescription className="text-blue-200 text-lg">Enterprise inventory management</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="p-6 bg-gradient-to-br from-blue-950/90 to-indigo-950/90 backdrop-blur-lg text-white">
          {emailConfirmationError && <motion.div className="bg-amber-900/30 border border-amber-500/30 rounded-md p-4 mb-6" variants={itemVariants}>
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-amber-400">Email not confirmed</h3>
                  <p className="text-sm text-amber-300/80 mt-1">
                    Please check your email and click the confirmation link.
                  </p>
                  <Button variant="outline" className="mt-2 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-900/30" onClick={handleResendConfirmation} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Resend confirmation email'}
                  </Button>
                </div>
              </div>
            </motion.div>}
          
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/10 border-0">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600/80 data-[state=active]:text-white text-white">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-blue-600/80 data-[state=active]:text-white text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" {...loginForm.register('email', {
                  required: true
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <Link to="/reset-password" className="text-xs text-blue-300 hover:text-blue-200 animated-underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" type="password" {...loginForm.register('password', {
                  required: true
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all duration-200 ease-out hover:shadow-xl transform hover:-translate-y-0.5" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="fullName" className="text-white">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" {...signupForm.register('fullName', {
                  required: true
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="signupEmail" className="text-white">Email</Label>
                  <Input id="signupEmail" type="email" placeholder="your@email.com" {...signupForm.register('email', {
                  required: true
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="signupPassword" className="text-white">Password</Label>
                  <Input id="signupPassword" type="password" {...signupForm.register('password', {
                  required: true,
                  minLength: 6
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                  {signupForm.formState.errors.password?.type === 'minLength' && <p className="text-sm text-red-400">Password must be at least 6 characters</p>}
                </motion.div>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" {...signupForm.register('confirmPassword', {
                  required: true
                })} className="bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-400/50 focus:border-transparent" />
                  {signupForm.formState.errors.confirmPassword?.message && <p className="text-sm text-red-400">
                      {signupForm.formState.errors.confirmPassword?.message}
                    </p>}
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all duration-200 ease-out hover:shadow-xl transform hover:-translate-y-0.5" disabled={isSubmitting}>
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