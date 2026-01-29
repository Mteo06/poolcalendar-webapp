/// <reference types="https://deno.land/x/types/index.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user')
    const token = url.searchParams.get('token')

    if (!userId || !token) {
      return new Response('Missing user or token', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    // Usa SERVICE_ROLE_KEY per bypassare RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verifica token
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('ical_token')
      .eq('id', userId)
      .single()

    if (profileError || !profile || profile.ical_token !== token) {
      return new Response('Invalid token', { 
        status: 403,
        headers: corsHeaders 
      })
    }

    // Prendi turni
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })

    if (shiftsError || !shifts || shifts.length === 0) {
      return new Response('No shifts found', { 
        status: 404,
        headers: corsHeaders 
      })
    }

    // Genera iCal
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PoolCalendar//Turni Piscina//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Turni Piscina
X-WR-TIMEZONE:Europe/Rome
X-WR-CALDESC:I miei turni in piscina\n`

    shifts.forEach(shift => {
      const start = new Date(shift.start_time)
      const end = new Date(shift.end_time)
      
      const formatDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      icalContent += `BEGIN:VEVENT
UID:${shift.id}@poolcalendar.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${shift.role} - ${shift.facility}
LOCATION:${shift.facility}
DESCRIPTION:Società: ${shift.company_id}\\nPausa: ${shift.break_duration} min
STATUS:CONFIRMED
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:-PT1H
DESCRIPTION:Turno tra 1 ora
END:VALARM
END:VEVENT\n`
    })

    icalContent += 'END:VCALENDAR'

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="turni.ics"',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
