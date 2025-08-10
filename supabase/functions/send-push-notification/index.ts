import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VAPID_PUBLIC_KEY = "BPQgv9sXBsmA0r6uR__4CZhAJL22o37CXBC2EeOrNQAjAg21VysA8Vikf9LRHqp8hWRmpcIenPGuHVKkeNpGUNg";
const VAPID_PRIVATE_KEY = "0w9y2i_vxd-WDrzNadA_yXrfPnGc-RcMIEVpspnq0t8";

webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { targetUserId, title, body, tag } = await req.json();

    if (!targetUserId || !title || !body) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Create a Supabase client with the appropriate permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch subscriptions for the target user
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions') // Make sure this table name is correct
      .select('subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response('No subscriptions found for user', { status: 404 });
    }

    const notificationPayload = JSON.stringify({ title, body, tag });

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(({ subscription }) =>
      webpush.sendNotification(subscription, notificationPayload)
        .catch(err => {
          console.error(`Failed to send notification to ${subscription.endpoint}. Error: ${err.message}`);
          // Here you might want to handle expired subscriptions by deleting them
        })
    );

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Internal server error:', err);
    return new Response(err.message, { status: 500 });
  }
});
