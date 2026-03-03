/**
 * Admin Parents API Route
 * Purpose: Fetch parents/guardians for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
    getOrgIdByEmail,
    getPersonIdsForRoleInOrg,
    getRoleIdByName,
} from '@/lib/adminQueries';

// GET: Fetch all parents (guardians) for an organization
export async function GET(request: NextRequest) {
    try {
        const email = request.nextUrl.searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, email);
        const guardianRoleId = await getRoleIdByName(supabase, 'guardian');

        if (!orgId || !guardianRoleId) {
            return NextResponse.json({ error: 'Failed to find organization or guardian role' }, { status: 500 });
        }

        const guardianPersonIds = await getPersonIdsForRoleInOrg(supabase, orgId, guardianRoleId);

        if (guardianPersonIds.length === 0) {
            return NextResponse.json({ parents: [] });
        }

        const { data: parents, error: parentsError } = await supabase
            .from('person')
            .select('person_id, first_name, last_name, email, created_at')
            .in('person_id', guardianPersonIds)
            .order('first_name', { ascending: true })
            .order('last_name', { ascending: true });

        if (parentsError) {
            return NextResponse.json(
                { error: 'Failed to load parents: ' + parentsError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ parents: parents || [] });
    } catch (error) {
        console.error('Parents GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// TODO: Implement parent creation flow.
export async function POST() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}

// TODO: Implement parent update flow.
export async function PUT() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}

// TODO: Implement parent delete flow.
export async function DELETE() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}
