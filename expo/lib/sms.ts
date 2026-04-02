import { supabase } from '@/lib/supabase';

interface SendSMSParams {
  to: string;
  body: string;
  ownerId: string;
}

export async function sendSMS({ to, body, ownerId }: SendSMSParams): Promise<void> {
  try {
    if (!to || !body) {
      console.log('[SMS] Missing to or body, skipping');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', ownerId)
      .single();

    const plan = (profile as Record<string, unknown> | null)?.plan as string | undefined;
    if (plan === 'starter') {
      console.log('[SMS] Starter plan, skipping SMS');
      return;
    }

    console.log('[SMS] Sending SMS to:', to.substring(0, 4) + '***');

    const response = await fetch('https://app.proptrack.app/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body, ownerId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      console.log('[SMS] Send failed:', err?.message ?? response.status);
    } else {
      console.log('[SMS] Sent successfully');
    }
  } catch (err) {
    console.log('[SMS] Error (fire-and-forget):', err);
  }
}
