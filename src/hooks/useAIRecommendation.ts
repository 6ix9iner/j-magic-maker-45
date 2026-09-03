import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AIRecommendation {
  title: string;
  body: string;
  type: string;
}

/**
 * Drives the "AI growth tip" feature: the same recommendation the daily
 * pg_cron job (see supabase/functions/generate-ai-recommendation) pushes as
 * a notification, mirrored in-app so it's visible on web too (no push
 * there) and so a returning user sees the latest tip immediately without
 * waiting on a fresh AI call.
 */
export function useAIRecommendation() {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // On mount, show whatever the most recent AI recommendation notification
  // was (whether it came from the cron job or a previous on-demand tap).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('notification_logs')
      .select('title, body, data, sent_at')
      .eq('user_id', user.id)
      .eq('notification_type', 'ai_recommendation')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setRecommendation({
          title: String(data.title || '').replace(/^💡\s*/, ''),
          body: data.body || '',
          type: (data.data as any)?.rec_type || 'general',
        });
        setGeneratedAt(data.sent_at);
      });
    return () => { cancelled = true; };
  }, [user]);

  const generate = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-recommendation', { body: {} });
      if (error) throw error;

      if (data?.skipped) {
        toast.info('Not enough sales history yet — make a few more sales and try again.');
        return;
      }
      if (data?.recommendation) {
        setRecommendation(data.recommendation);
        setGeneratedAt(new Date().toISOString());
        toast.success('New growth tip ready!');
      }
    } catch (err: any) {
      console.error('Failed to generate AI recommendation:', err);
      toast.error(err.message || 'Failed to generate a growth tip');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { recommendation, generatedAt, isLoading, generate };
}
