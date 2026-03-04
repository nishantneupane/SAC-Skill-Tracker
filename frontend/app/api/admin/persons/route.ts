/**
 * Admin Persons API Route
 * Purpose: Fetch all members with optional linked person records
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getOrgIdByEmail } from '@/lib/adminQueries';

// GET: Fetch all members in an organization, including linked person info when present.
export async function GET(request: NextRequest) {
    try {
        const email = request.nextUrl.searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        const supabase = getSupabaseAdminClient();
        const orgId = await getOrgIdByEmail(supabase, email);

        if (!orgId) return NextResponse.json({ error: 'Failed to find organization' }, { status: 500 });

        // Get all members (swimmers/students) for this org
        const { data: members, error: membersError } = await supabase
            .from('member')
            .select('member_id, first_name, last_name')
            .eq('organization_id', orgId);

        if (membersError) {
            return NextResponse.json({ error: 'Failed to load members: ' + membersError.message }, { status: 500 });
        }

        const memberIds = (members || []).map((m) => m.member_id);
        if (memberIds.length === 0) return NextResponse.json({ persons: [] });

        // Find existing member -> person links.
        const { data: memberLinks, error: linksError } = await supabase
            .from('person_member')
            .select('member_id, person_id')
            .in('member_id', memberIds);

        if (linksError) {
            return NextResponse.json({ error: 'Failed to load member links: ' + linksError.message }, { status: 500 });
        }

        const linkedPersonIds = Array.from(new Set((memberLinks || []).map((l) => l.person_id)));
        const personMap = new Map<string, { person_id: string; first_name: string | null; last_name: string | null; email: string | null }>();

        if (linkedPersonIds.length > 0) {
            const { data: linkedPeople, error: peopleError } = await supabase
                .from('person')
                .select('person_id, first_name, last_name, email')
                .in('person_id', linkedPersonIds);

            if (peopleError) {
                return NextResponse.json({ error: 'Failed to load linked people: ' + peopleError.message }, { status: 500 });
            }

            for (const person of linkedPeople || []) {
                personMap.set(person.person_id, person);
            }
        }

        const linkByMemberId = new Map<string, string>();
        for (const link of memberLinks || []) {
            linkByMemberId.set(link.member_id, link.person_id);
        }

        const persons = [...(members || [])]
            .map((member: any) => {
                const linkedPersonId = linkByMemberId.get(member.member_id) || null;
                const linkedPerson = linkedPersonId ? personMap.get(linkedPersonId) : null;

                return {
                    member_id: member.member_id,
                    person_id: linkedPersonId,
                    first_name: (linkedPerson?.first_name || member.first_name || '').trim(),
                    last_name: (linkedPerson?.last_name || member.last_name || '').trim(),
                    email: linkedPerson?.email || null,
                    has_person_account: Boolean(linkedPersonId),
                };
            })
            .sort((a, b) => `${a.first_name || ''} ${a.last_name || ''}`.trim().localeCompare(`${b.first_name || ''} ${b.last_name || ''}`.trim()));

        return NextResponse.json({ persons });
    } catch (error) {
        console.error('Persons GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
