/**
 * Account dashboard data endpoint.
 * Returns all parent-dashboard data from a single database RPC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

interface DashboardPayload {
  userName: string;
  organizationName?: string;
  swimmers: Array<{
    id: string;
    name: string;
    level: string;
    nextSession: string;
  }>;
  skillsBySwimmer: Record<
    string,
    Array<{
      id: string;
      name: string;
      mastered: boolean;
      dateAcquired?: string | null;
    }>
  >;
  notes: Array<{
    id: string;
    swimmerName: string;
    note: string;
    date: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required query param: email' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc('get_parent_dashboard', {
      p_email: email,
    });

    if (error) {
      return NextResponse.json(
        { error: `Failed to load dashboard: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          userName: '',
          swimmers: [],
          skillsBySwimmer: {},
          notes: [],
          error: `No person found for email ${email}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(data as DashboardPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
