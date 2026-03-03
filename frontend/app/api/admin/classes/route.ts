/**
 * Admin Classes API Route
 * Purpose: Fetch classes for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getOrgIdByEmail } from '@/lib/adminQueries';

// GET: Fetch all classes for an organization
export async function GET(request: NextRequest) {
    try {
        const email = request.nextUrl.searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, email);

        if (!orgId) {
            return NextResponse.json({ error: 'Failed to find organization' }, { status: 500 });
        }

        const { data: classes, error: classesError } = await supabase
            .from('class_entity')
            .select('class_id, name, schedule, length_minutes, created_at')
            .eq('organization_id', orgId)
            .order('name', { ascending: true });

        if (classesError) {
            return NextResponse.json(
                { error: 'Failed to load classes: ' + classesError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ classes: classes || [] });
    } catch (error) {
        console.error('Classes GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// TODO: Implement class creation flow.
export async function POST() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}

// TODO: Implement class update flow.
export async function PUT() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}

// TODO: Implement class delete flow.
export async function DELETE() {
    return NextResponse.json({ error: 'Not implemented yet' }, { status: 501 });
}
