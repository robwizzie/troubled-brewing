// Supabase Edge Function: email the owners when a contact/catering form is
// submitted (build plan §6). Optional for v1 — submissions also appear in the
// admin Inbox. Uses Resend's free tier.
//
// Deploy:   supabase functions deploy notify --no-verify-jwt
// Secrets:  supabase secrets set RESEND_API_KEY=... NOTIFY_TO="tom@…,cat@…,katie@…" NOTIFY_FROM="Trouble Brewing <hello@troublebrewingcoffeehouse.com>"
//
// The site calls this best-effort after a successful submissions insert; failure
// here never blocks the customer's submission (it's already saved).

interface Submission {
  form_type?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  event_type?: string;
  event_date?: string;
  headcount?: number;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const s = (await req.json()) as Submission;
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const to = (Deno.env.get('NOTIFY_TO') || '').split(',').map((x) => x.trim()).filter(Boolean);
    const from = Deno.env.get('NOTIFY_FROM') || 'Trouble Brewing <onboarding@resend.dev>';

    if (!apiKey || to.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'notify not configured' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isCatering = s.form_type === 'catering';
    const subject = `${isCatering ? '🎉 Catering inquiry' : '☕ New message'} from ${s.name || 'a customer'}`;
    const lines = [
      `<strong>From:</strong> ${escape(s.name)} &lt;${escape(s.email)}&gt;`,
      s.phone ? `<strong>Phone:</strong> ${escape(s.phone)}` : '',
      isCatering ? `<strong>Event:</strong> ${escape(s.event_type)} on ${escape(s.event_date)} for ${s.headcount ?? '?'} people` : '',
      s.message ? `<strong>Message:</strong><br>${escape(s.message).replace(/\n/g, '<br>')}` : '',
    ].filter(Boolean);

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        reply_to: s.email,
        subject,
        html: `<div style="font-family:sans-serif;line-height:1.6">${lines.join('<br><br>')}</div>`,
      }),
    });

    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});

function escape(v: unknown): string {
  return String(v ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
}
