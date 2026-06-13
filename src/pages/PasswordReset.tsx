
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

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
    <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto py-8 px-4 min-h-0">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            {!isSent 
              ? 'Enter your email and we will send you a password reset link' 
              : 'Please check your email for the password reset link'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">Email</label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate('/auth')}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If an account exists with this email address, you will receive a password reset link.
                The link will expire after 24 hours.
              </p>
              
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => navigate('/auth')}
              >
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
