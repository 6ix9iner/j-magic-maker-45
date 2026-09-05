import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

// Where the "Confirm your signup" email's link points (see the
// mailer_templates_confirmation_content Auth config and Auth.tsx's
// handleSendOtp, which sets emailRedirectTo to here). Deliberately not
// wrapped in ProtectedRoute/PublicRoute: whoever opens this link may or
// may not have an active session in this browser, and either way there's
// nothing for this page to check - it just confirms what already happened
// server-side (Supabase verifies the token before ever redirecting here)
// and sends them back to sign in normally, instead of silently landing
// them somewhere deeper in the app under a session tied to this browser
// tab rather than the device they're actually trying to use.
const EmailConfirmed = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="w-full h-full flex flex-col items-center justify-center overflow-y-auto py-8 px-4 min-h-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(99,102,241,0.06)] rounded-3xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-4 pt-8 border-b border-slate-50 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Logo size={42} className="mb-1" />
            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">Email confirmed</CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-500 font-medium text-sm px-2">
              Your email address is verified. Head back to MySkrib and sign in to get started.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-6 bg-transparent">
          <Button
            className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm"
            onClick={() => navigate('/')}
          >
            Return to MySkrib
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EmailConfirmed;
