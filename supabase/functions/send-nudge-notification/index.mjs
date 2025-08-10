import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  // 1. Check for correct method and authorization
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
    
  // 2. Create Supabase client with the user's token
  const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } }
  );
  
  // 3. Get the logged-in user to know who is sending the nudge
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response('Forbidden', { status: 403 });
  }
  
  const { data: senderProfile, error: senderError } = await supabaseClient
    .from('profiles')
    .select('display_name, username')
    .eq('user_id', user.id)
    .single();

  if (senderError) {
      console.error('Error fetching sender profile:', senderError.message);
      return new Response('Could not find sender profile.', { status: 500 });
  }

  // 4. Get the recipient's ID from the request body
  const { recipient_id } = await req.json();
  if (!recipient_id) {
    return new Response('Missing recipient_id', { status: 400 });
  }

  // 5. Create a service role client to bypass RLS and fetch recipient's subscription
  const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 6. Fetch all subscriptions for the recipient
  const { data: subscriptions, error } = await serviceClient
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', recipient_id);

  if (error || !subscriptions || subscriptions.length === 0) {
    console.error('Error fetching subscriptions or no subscriptions found:', error?.message);
    return new Response('Subscriptions not found for user.', { status: 404 });
  }

  // 7. Prepare the notification payload
  const senderName = senderProfile?.display_name || 'Alguém';
  const payload = JSON.stringify({
    title: 'Você recebeu um cutucão! 👋',
    body: `${senderName} está pensando em você e na sua próxima leitura!`,
    icon: '/favicon.ico', // Optional: icon to display
    data: {
      url: `/perfil/${senderProfile?.username || ''}`
    }
  });

  // 8. Send a notification to each subscription
  try {
    const promises = subscriptions.map(sub => 
      webpush.sendNotification(sub.subscription, payload)
    );
    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, message: 'Nudge sent!' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error sending push notification:', err);
    // Handle specific errors, e.g., unsubscribed
    if (err.statusCode === 410) {
        // You could add logic here to delete the expired subscription from your DB
    }
    return new Response(JSON.stringify({ success: false, message: 'Failed to send notification.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
