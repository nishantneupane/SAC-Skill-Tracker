/**
 * Admin Instructors API Route
 * Purpose: CRUD operations for instructors in an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
    getOrgIdByEmail,
    getPersonIdsForRoleInOrg,
    getRoleIdByName,
} from '@/lib/adminQueries';

// GET: Fetch all instructors for an organization
export async function GET(request: NextRequest) {
    try {
        const email = request.nextUrl.searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, email);
        const roleId = await getRoleIdByName(supabase, 'instructor');

        if (!orgId || !roleId) return NextResponse.json({ error: 'Failed to find organization or role' }, { status: 500 });
        const instructorPersonIds = await getPersonIdsForRoleInOrg(supabase, orgId, roleId);

        if (instructorPersonIds.length === 0) return NextResponse.json({ instructors: [] });

        const { data: instructors, error: instructorsError } = await supabase.from('person')
            .select('person_id, first_name, last_name, email, created_at').in('person_id', instructorPersonIds).order('first_name, last_name');

        if (instructorsError) throw new Error('instructors error: ' + instructorsError.message);

        return NextResponse.json({ instructors: instructors || [] });
    } catch (error) {
        console.error('Instructors GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Not implemented yet.
// TODO: either promote an existing member/person to instructor role or implement creating a new instructor flow here.
export async function POST() {
    return NextResponse.json(
        { error: 'Not implemented. Use role promotion flow for instructors.' },
        { status: 501 }
    );
}

// PUT: Update an existing instructor
export async function PUT(request: NextRequest) {
    try {
        const { email: adminEmail, person_id, name, email: newEmail } = await request.json();
        if (!adminEmail || !person_id || !name) {
            return NextResponse.json({ error: 'Admin email, person_id, and name required' }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, adminEmail);
        if (!orgId) return NextResponse.json({ error: 'Failed to find organization' }, { status: 500 });

        // Verify instructor belongs to this org
        const { data: personOrg } = await supabase.from('person_organization')
            .select('person_organization_id').eq('person_id', person_id).eq('organization_id', orgId).eq('status', 'active').single();

        if (!personOrg) return NextResponse.json({ error: 'Instructor not found in this organization' }, { status: 404 });

        // Update person - split name into first and last
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const updateData: any = { first_name: firstName, last_name: lastName };
        if (newEmail) updateData.email = newEmail;

        const { data: instructor } = await supabase.from('person')
            .update(updateData).eq('person_id', person_id).select().single();

        return NextResponse.json({ instructor });
    } catch (error) {
        console.error('Instructors PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Delete an instructor
export async function DELETE(request: NextRequest) {
    try {
        const adminEmail = request.nextUrl.searchParams.get('email');
        const person_id = request.nextUrl.searchParams.get('person_id');
        if (!adminEmail || !person_id) {
            return NextResponse.json({ error: 'Admin email and person_id required' }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, adminEmail);
        const roleId = await getRoleIdByName(supabase, 'instructor');

        if (!orgId || !roleId) return NextResponse.json({ error: 'Failed to find organization or role' }, { status: 500 });

        // Get person_organization record
        const { data: personOrg } = await supabase.from('person_organization')
            .select('person_organization_id').eq('person_id', person_id).eq('organization_id', orgId).eq('status', 'active').single();

        if (!personOrg) return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });

        // Delete role and deactivate
        await supabase.from('person_org_role').delete()
            .eq('person_organization_id', personOrg.person_organization_id).eq('role_id', roleId);

        await supabase.from('person_organization')
            .update({ status: 'inactive' }).eq('person_organization_id', personOrg.person_organization_id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Instructors DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
