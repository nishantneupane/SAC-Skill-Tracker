import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

interface RouteParams {
  params: { id: string };
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

async function resolveInstructorPersonId(email?: string | null) {
  if (!email) {
    return { error: 'Missing instructor email' as const };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from('person')
    .select('person_id, email, first_name, last_name')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    return { error: `Failed to load instructor: ${error.message}` as const };
  }

  if (!data) {
    return { error: `No instructor found for email ${email}` as const };
  }

  return { person: data };
}

async function instructorCanAccessMember(
  instructorPersonId: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: taughtClasses, error: taughtClassesError } = await supabaseAdmin
    .from('class_instructor')
    .select('class_id')
    .eq('person_id', instructorPersonId);

  if (taughtClassesError) {
    return {
      ok: false,
      error: `Failed to load instructor classes: ${taughtClassesError.message}`,
    };
  }

  const taughtClassIds = new Set((taughtClasses ?? []).map((row) => row.class_id));

  const { data: memberEnrollments, error: memberEnrollmentsError } = await supabaseAdmin
    .from('enrollment')
    .select('class_id')
    .eq('member_id', memberId);

  if (memberEnrollmentsError) {
    return {
      ok: false,
      error: `Failed to load member enrollments: ${memberEnrollmentsError.message}`,
    };
  }

  const canAccessViaClass = (memberEnrollments ?? []).some((row) =>
    taughtClassIds.has(row.class_id)
  );

  const { data: directAssignment, error: directAssignmentError } = await supabaseAdmin
    .from('instructor_member_assignment')
    .select('member_id')
    .eq('instructor_person_id', instructorPersonId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (directAssignmentError) {
    return {
      ok: false,
      error: `Failed to load direct instructor assignments: ${directAssignmentError.message}`,
    };
  }

  const canAccessViaDirectAssignment = Boolean(directAssignment);

  return canAccessViaClass || canAccessViaDirectAssignment
    ? { ok: true }
    : { ok: false, error: 'You do not have access to this swimmer.' };
}

async function getSharedClassIdsForInstructorAndMember(
  instructorPersonId: string,
  memberId: string
): Promise<{ sharedClassIds: string[]; error?: string }> {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: taughtClasses, error: taughtClassesError } = await supabaseAdmin
    .from('class_instructor')
    .select('class_id')
    .eq('person_id', instructorPersonId);

  if (taughtClassesError) {
    return { sharedClassIds: [], error: `Failed to load instructor classes: ${taughtClassesError.message}` };
  }

  const { data: memberEnrollments, error: memberEnrollmentsError } = await supabaseAdmin
    .from('enrollment')
    .select('class_id')
    .eq('member_id', memberId);

  if (memberEnrollmentsError) {
    return { sharedClassIds: [], error: `Failed to load member enrollments: ${memberEnrollmentsError.message}` };
  }

  const taughtClassIds = new Set((taughtClasses ?? []).map((row) => row.class_id));
  const sharedClassIds = (memberEnrollments ?? [])
    .map((row) => row.class_id)
    .filter((classId) => taughtClassIds.has(classId));

  return { sharedClassIds };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const memberId = params.id;
    const email = request.nextUrl.searchParams.get('email');

    const instructorResolution = await resolveInstructorPersonId(email);
    if ('error' in instructorResolution) {
      return NextResponse.json({ error: instructorResolution.error }, { status: 400 });
    }
    const instructor = instructorResolution.person;

    const accessCheck = await instructorCanAccessMember(instructor.person_id, memberId);
    if (!accessCheck.ok) {
      return NextResponse.json(
        { error: accessCheck.error ?? 'You do not have access to this swimmer.' },
        { status: accessCheck.error?.startsWith('Failed') ? 500 : 403 }
      );
    }

    const { sharedClassIds, error: sharedClassError } =
      await getSharedClassIdsForInstructorAndMember(instructor.person_id, memberId);
    if (sharedClassError) {
      return NextResponse.json({ error: sharedClassError }, { status: 500 });
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('member')
      .select('member_id, organization_id, first_name, last_name, level, date_of_birth, created_at')
      .eq('member_id', memberId)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to load swimmer: ${memberError.message}` },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: 'Swimmer not found.' }, { status: 404 });
    }

    const { data: classRows, error: classRowsError } = sharedClassIds.length
      ? await supabaseAdmin
          .from('class_entity')
          .select('class_id, name, schedule')
          .in('class_id', sharedClassIds)
      : { data: [], error: null };

    if (classRowsError) {
      return NextResponse.json(
        { error: `Failed to load classes: ${classRowsError.message}` },
        { status: 500 }
      );
    }

    const { data: skills, error: skillsError } = await supabaseAdmin
      .from('member_skill')
      .select('skill_id, progress, date_acquired')
      .eq('member_id', memberId);

    if (skillsError) {
      return NextResponse.json(
        { error: `Failed to load swimmer skills: ${skillsError.message}` },
        { status: 500 }
      );
    }

    const { data: orgSkills, error: orgSkillsError } = await supabaseAdmin
      .from('skill')
      .select('skill_id, name')
      .eq('organization_id', member.organization_id)
      .order('name', { ascending: true });

    if (orgSkillsError) {
      return NextResponse.json(
        { error: `Failed to load organization skills: ${orgSkillsError.message}` },
        { status: 500 }
      );
    }

    const memberSkillById = new Map(
      (skills ?? []).map((row) => [
        row.skill_id,
        {
          progress: row.progress ?? 0,
          dateAcquired: row.date_acquired,
        },
      ])
    );

    const { data: evaluations, error: evaluationsError } = await supabaseAdmin
      .from('evaluation')
      .select('evaluation_id, feedback, evaluation_date, instructor_person_id, class_id')
      .eq('member_id', memberId)
      .order('evaluation_date', { ascending: false })
      .limit(30);

    if (evaluationsError) {
      return NextResponse.json(
        { error: `Failed to load swimmer notes: ${evaluationsError.message}` },
        { status: 500 }
      );
    }

    const authorIds = Array.from(
      new Set((evaluations ?? []).map((row) => row.instructor_person_id))
    );
    const authorNameById = new Map<string, string>();

    if (authorIds.length > 0) {
      const { data: authorRows, error: authorRowsError } = await supabaseAdmin
        .from('person')
        .select('person_id, first_name, last_name')
        .in('person_id', authorIds);

      if (authorRowsError) {
        return NextResponse.json(
          { error: `Failed to load note authors: ${authorRowsError.message}` },
          { status: 500 }
        );
      }

      (authorRows ?? []).forEach((row) => {
        authorNameById.set(
          row.person_id,
          `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Instructor'
        );
      });
    }

    const { data: guardianLinks, error: guardianLinksError } = await supabaseAdmin
      .from('guardian_member')
      .select('guardian_person_id, relationship')
      .eq('member_id', memberId);

    if (guardianLinksError) {
      return NextResponse.json(
        { error: `Failed to load guardians: ${guardianLinksError.message}` },
        { status: 500 }
      );
    }

    const guardianIds = Array.from(
      new Set((guardianLinks ?? []).map((link) => link.guardian_person_id))
    );
    const guardianById = new Map<
      string,
      { name: string; email: string }
    >();

    if (guardianIds.length > 0) {
      const { data: guardianRows, error: guardianRowsError } = await supabaseAdmin
        .from('person')
        .select('person_id, first_name, last_name, email')
        .in('person_id', guardianIds);

      if (guardianRowsError) {
        return NextResponse.json(
          { error: `Failed to load guardian contacts: ${guardianRowsError.message}` },
          { status: 500 }
        );
      }

      (guardianRows ?? []).forEach((guardian) => {
        guardianById.set(guardian.person_id, {
          name:
            `${guardian.first_name ?? ''} ${guardian.last_name ?? ''}`.trim() || 'Guardian',
          email: guardian.email ?? '',
        });
      });
    }

    const firstGuardianLink = guardianLinks?.[0];
    const firstGuardian = firstGuardianLink
      ? guardianById.get(firstGuardianLink.guardian_person_id)
      : null;

    return NextResponse.json({
      swimmer: {
        id: member.member_id,
        name: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim(),
        age: calculateAge(member.date_of_birth),
        level: member.level ?? 'Unassigned level',
        enrollmentDate: formatDate(member.created_at) ?? '',
        guardianName: firstGuardian?.name ?? 'No guardian on file',
        guardianEmail: firstGuardian?.email ?? '',
        guardianRelationship: firstGuardianLink?.relationship ?? '',
      },
      classes: (classRows ?? []).map((row) => ({
        id: row.class_id,
        name: row.name,
        schedule: row.schedule ?? 'Schedule TBD',
      })),
      skills: (orgSkills ?? [])
        .map((row) => {
          const memberSkill = memberSkillById.get(row.skill_id);
          return {
            id: row.skill_id,
            name: row.name,
            mastered: Boolean(memberSkill?.dateAcquired),
            progress: memberSkill?.progress ?? 0,
            dateAcquired: formatDate(memberSkill?.dateAcquired),
          };
        })
        .sort((a, b) => {
          if (a.mastered !== b.mastered) return a.mastered ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      notes: (evaluations ?? []).map((row) => ({
        id: row.evaluation_id,
        date: formatDate(row.evaluation_date) ?? '',
        content: row.feedback ?? '',
        author: authorNameById.get(row.instructor_person_id) ?? 'Instructor',
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const memberId = params.id;
    const body = (await request.json()) as {
      email?: string;
      skillId?: string;
      mastered?: boolean;
    };

    const instructorResolution = await resolveInstructorPersonId(body.email);
    if ('error' in instructorResolution) {
      return NextResponse.json({ error: instructorResolution.error }, { status: 400 });
    }
    const instructor = instructorResolution.person;

    if (!body.skillId || typeof body.mastered !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: skillId, mastered' },
        { status: 400 }
      );
    }

    const accessCheck = await instructorCanAccessMember(instructor.person_id, memberId);
    if (!accessCheck.ok) {
      return NextResponse.json(
        { error: accessCheck.error ?? 'You do not have access to this swimmer.' },
        { status: accessCheck.error?.startsWith('Failed') ? 500 : 403 }
      );
    }

    const { error: upsertError } = await supabaseAdmin.from('member_skill').upsert(
      {
        member_id: memberId,
        skill_id: body.skillId,
        progress: body.mastered ? 100 : 0,
        date_acquired: body.mastered
          ? new Date().toISOString().slice(0, 10)
          : null,
        updated_by_person_id: instructor.person_id,
      },
      { onConflict: 'member_id,skill_id' }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: `Failed to update skill: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const memberId = params.id;
    const body = (await request.json()) as {
      email?: string;
      note?: string;
      classId?: string;
      skillId?: string;
      mastered?: boolean;
    };

    const instructorResolution = await resolveInstructorPersonId(body.email);
    if ('error' in instructorResolution) {
      return NextResponse.json({ error: instructorResolution.error }, { status: 400 });
    }
    const instructor = instructorResolution.person;

    const trimmedNote = body.note?.trim() ?? '';
    const hasSkillUpdate = Boolean(body.skillId) && typeof body.mastered === 'boolean';
    const hasNote = Boolean(trimmedNote);

    if (!hasSkillUpdate && !hasNote) {
      return NextResponse.json(
        { error: 'Note content or skill update is required.' },
        { status: 400 }
      );
    }

    const accessCheck = await instructorCanAccessMember(instructor.person_id, memberId);
    if (!accessCheck.ok) {
      return NextResponse.json(
        { error: accessCheck.error ?? 'You do not have access to this swimmer.' },
        { status: accessCheck.error?.startsWith('Failed') ? 500 : 403 }
      );
    }

    const { sharedClassIds, error: sharedClassError } =
      await getSharedClassIdsForInstructorAndMember(instructor.person_id, memberId);
    if (sharedClassError) {
      return NextResponse.json({ error: sharedClassError }, { status: 500 });
    }

    let classId = body.classId;
    if (classId && !sharedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'Selected class is not assigned to this instructor for this swimmer.' },
        { status: 403 }
      );
    }

    if (!classId) {
      classId = sharedClassIds[0];
    }

    if (!classId) {
      return NextResponse.json(
        {
          error:
            'Cannot save class evaluation for a direct-only assignment without a shared class. Assign a shared class first.',
        },
        { status: 400 }
      );
    }

    if (hasSkillUpdate) {
      const { error: skillUpsertError } = await supabaseAdmin.from('member_skill').upsert(
        {
          member_id: memberId,
          skill_id: body.skillId,
          progress: body.mastered ? 100 : 0,
          date_acquired: body.mastered ? new Date().toISOString().slice(0, 10) : null,
          updated_by_person_id: instructor.person_id,
        },
        { onConflict: 'member_id,skill_id' }
      );

      if (skillUpsertError) {
        return NextResponse.json(
          { error: `Failed to update skill: ${skillUpsertError.message}` },
          { status: 500 }
        );
      }
    }

    if (!hasNote) {
      return NextResponse.json({ success: true });
    }

    const evaluationDate = new Date().toISOString().slice(0, 10);

    const { error: upsertError } = await supabaseAdmin.from('evaluation').upsert(
      {
        instructor_person_id: instructor.person_id,
        member_id: memberId,
        class_id: classId,
        feedback: trimmedNote,
        evaluation_date: evaluationDate,
      },
      { onConflict: 'instructor_person_id,member_id,class_id,evaluation_date' }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: `Failed to save note: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
