import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getOrgIdByEmail, getPersonIdByEmail, getRoleIdByName } from '@/lib/adminQueries';

async function validateInstructorInOrg(
  supabase: any,
  instructorPersonId: string,
  organizationId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: instructorOrg, error: instructorOrgError } = await supabase
    .from('person_organization')
    .select('person_organization_id')
    .eq('person_id', instructorPersonId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (instructorOrgError) {
    return { ok: false, error: `Failed to validate instructor org membership: ${instructorOrgError.message}` };
  }

  if (!instructorOrg) {
    return { ok: false, error: 'Instructor is not active in this organization.' };
  }

  const instructorRoleId = await getRoleIdByName(supabase, 'instructor');
  if (!instructorRoleId) {
    return { ok: false, error: 'Instructor role not found.' };
  }

  const { data: instructorRoleRow, error: instructorRoleError } = await supabase
    .from('person_org_role')
    .select('role_id')
    .eq('person_organization_id', instructorOrg.person_organization_id)
    .eq('role_id', instructorRoleId)
    .maybeSingle();

  if (instructorRoleError) {
    return { ok: false, error: `Failed to validate instructor role: ${instructorRoleError.message}` };
  }

  if (!instructorRoleRow) {
    return { ok: false, error: 'Person does not have instructor role in this organization.' };
  }

  return { ok: true };
}

async function validateMemberInOrg(
  supabase: any,
  memberId: string,
  organizationId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: member, error: memberError } = await supabase
    .from('member')
    .select('member_id')
    .eq('member_id', memberId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (memberError) {
    return { ok: false, error: `Failed to validate member org membership: ${memberError.message}` };
  }

  return member ? { ok: true } : { ok: false, error: 'Member is not in this organization.' };
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const instructorPersonId = request.nextUrl.searchParams.get('instructor_person_id');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const organizationId = await getOrgIdByEmail(supabase, email);

    if (!organizationId) {
      return NextResponse.json({ error: 'Failed to find organization for user' }, { status: 500 });
    }

    const { data: members, error: membersError } = await supabase
      .from('member')
      .select('member_id, first_name, last_name, level')
      .eq('organization_id', organizationId)
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: `Failed to load members: ${membersError.message}` }, { status: 500 });
    }

    const instructorRoleId = await getRoleIdByName(supabase, 'instructor');
    if (!instructorRoleId) {
      return NextResponse.json({ error: 'Instructor role not found' }, { status: 500 });
    }

    const { data: activePersonOrgs, error: activePersonOrgsError } = await supabase
      .from('person_organization')
      .select('person_organization_id, person_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (activePersonOrgsError) {
      return NextResponse.json(
        { error: `Failed to load active org memberships: ${activePersonOrgsError.message}` },
        { status: 500 }
      );
    }

    const personOrgIds = (activePersonOrgs ?? []).map((row: any) => row.person_organization_id);
    const personIdByPersonOrgId = new Map(
      (activePersonOrgs ?? []).map((row: any) => [row.person_organization_id, row.person_id])
    );

    let instructorPersonIds: string[] = [];
    if (personOrgIds.length > 0) {
      const { data: instructorRoleRows, error: instructorRoleRowsError } = await supabase
        .from('person_org_role')
        .select('person_organization_id')
        .in('person_organization_id', personOrgIds)
        .eq('role_id', instructorRoleId);

      if (instructorRoleRowsError) {
        return NextResponse.json(
          { error: `Failed to load instructor role assignments: ${instructorRoleRowsError.message}` },
          { status: 500 }
        );
      }

      instructorPersonIds = Array.from(
        new Set(
          (instructorRoleRows ?? [])
            .map((row: any) => personIdByPersonOrgId.get(row.person_organization_id))
            .filter((id: string | undefined): id is string => Boolean(id))
        )
      );
    }

    const { data: instructors, error: instructorsError } = instructorPersonIds.length
      ? await supabase
          .from('person')
          .select('person_id, first_name, last_name, email')
          .in('person_id', instructorPersonIds)
      : { data: [], error: null };

    if (instructorsError) {
      return NextResponse.json({ error: `Failed to load instructors: ${instructorsError.message}` }, { status: 500 });
    }

    const memberIds = (members ?? []).map((m: any) => m.member_id);

    let assignmentsQuery = supabase
      .from('instructor_member_assignment')
      .select('instructor_person_id, member_id, assigned_by_person_id, assigned_at');

    if (memberIds.length > 0) {
      assignmentsQuery = assignmentsQuery.in('member_id', memberIds);
    }

    if (instructorPersonId) {
      assignmentsQuery = assignmentsQuery.eq('instructor_person_id', instructorPersonId);
    }

    const { data: assignments, error: assignmentsError } = await assignmentsQuery;

    if (assignmentsError) {
      return NextResponse.json({ error: `Failed to load assignments: ${assignmentsError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      members: members ?? [],
      instructors: instructors ?? [],
      assignments: assignments ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      instructor_person_id?: string;
      member_id?: string;
    };

    if (!body.email || !body.instructor_person_id || !body.member_id) {
      return NextResponse.json(
        { error: 'email, instructor_person_id, and member_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const organizationId = await getOrgIdByEmail(supabase, body.email);
    const requesterPersonId = await getPersonIdByEmail(supabase, body.email);

    if (!organizationId || !requesterPersonId) {
      return NextResponse.json({ error: 'Failed to resolve requester context' }, { status: 500 });
    }

    const memberValidation = await validateMemberInOrg(supabase, body.member_id, organizationId);
    if (!memberValidation.ok) {
      return NextResponse.json({ error: memberValidation.error }, { status: 400 });
    }

    const instructorValidation = await validateInstructorInOrg(
      supabase,
      body.instructor_person_id,
      organizationId
    );
    if (!instructorValidation.ok) {
      return NextResponse.json({ error: instructorValidation.error }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('instructor_member_assignment')
      .insert({
        instructor_person_id: body.instructor_person_id,
        member_id: body.member_id,
        assigned_by_person_id: requesterPersonId,
      });

    if (insertError) {
      const status = insertError.code === '23505' ? 409 : 500;
      return NextResponse.json(
        { error: `Failed to create assignment: ${insertError.message}` },
        { status }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      instructor_person_id?: string;
      member_id?: string;
    };

    if (!body.email || !body.instructor_person_id || !body.member_id) {
      return NextResponse.json(
        { error: 'email, instructor_person_id, and member_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const organizationId = await getOrgIdByEmail(supabase, body.email);

    if (!organizationId) {
      return NextResponse.json({ error: 'Failed to resolve requester organization' }, { status: 500 });
    }

    const memberValidation = await validateMemberInOrg(supabase, body.member_id, organizationId);
    if (!memberValidation.ok) {
      return NextResponse.json({ error: memberValidation.error }, { status: 400 });
    }

    const instructorValidation = await validateInstructorInOrg(
      supabase,
      body.instructor_person_id,
      organizationId
    );
    if (!instructorValidation.ok) {
      return NextResponse.json({ error: instructorValidation.error }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('instructor_member_assignment')
      .delete()
      .eq('instructor_person_id', body.instructor_person_id)
      .eq('member_id', body.member_id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to remove assignment: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
