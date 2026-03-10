import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

interface InstructorClassPayload {
  id: string;
  name: string;
  schedule: string;
  swimmers: number;
}

interface InstructorSwimmerPayload {
  id: string;
  name: string;
  level: string;
  nextSession: string;
  classIds: string[];
}

interface InstructorSkillPayload {
  id: string;
  name: string;
  mastered: boolean;
  dateAcquired?: string;
}

interface InstructorNotePayload {
  id: string;
  swimmerName: string;
  note: string;
  date: string;
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

    const { data: person, error: personError } = await supabaseAdmin
      .from('person')
      .select('person_id, first_name, last_name, email')
      .ilike('email', email)
      .maybeSingle();

    if (personError) {
      return NextResponse.json(
        { error: `Failed to load person: ${personError.message}` },
        { status: 500 }
      );
    }

    if (!person) {
      return NextResponse.json(
        {
          userName: '',
          classes: [],
          swimmers: [],
          skillsBySwimmer: {},
          notes: [],
          error: `No instructor found for email ${email}`,
        },
        { status: 404 }
      );
    }

    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('class_instructor')
      .select('class_id')
      .eq('person_id', person.person_id);

    if (assignmentError) {
      return NextResponse.json(
        { error: `Failed to load instructor assignments: ${assignmentError.message}` },
        { status: 500 }
      );
    }

    const classIds = Array.from(new Set((assignments ?? []).map((row) => row.class_id)));
    const userName = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email;

    const { data: directAssignments, error: directAssignmentsError } = await supabaseAdmin
      .from('instructor_member_assignment')
      .select('member_id')
      .eq('instructor_person_id', person.person_id);

    if (directAssignmentsError) {
      return NextResponse.json(
        { error: `Failed to load direct instructor assignments: ${directAssignmentsError.message}` },
        { status: 500 }
      );
    }

    // Fetch instructor's organization
    const { data: personOrg, error: personOrgError } = await supabaseAdmin
      .from('person_organization')
      .select('organization_id')
      .eq('person_id', person.person_id)
      .maybeSingle();

    let organizationName = 'SAC Skill Tracker';
    if (!personOrgError && personOrg) {
      const { data: org } = await supabaseAdmin
        .from('organization')
        .select('name')
        .eq('organization_id', personOrg.organization_id)
        .maybeSingle();
      if (org?.name) organizationName = org.name;
    }

    const directMemberIds = Array.from(new Set((directAssignments ?? []).map((row) => row.member_id)));

    if (classIds.length === 0 && directMemberIds.length === 0) {
      return NextResponse.json({
        userName,
        organizationName,
        classes: [],
        swimmers: [],
        skillsBySwimmer: {},
        notes: [],
      });
    }

    const { data: classes, error: classesError } = classIds.length
      ? await supabaseAdmin
          .from('class_entity')
          .select('class_id, name, schedule')
          .in('class_id', classIds)
      : { data: [], error: null };

    if (classesError) {
      return NextResponse.json(
        { error: `Failed to load classes: ${classesError.message}` },
        { status: 500 }
      );
    }

    const { data: enrollments, error: enrollmentsError } = classIds.length
      ? await supabaseAdmin
          .from('enrollment')
          .select('member_id, class_id')
          .in('class_id', classIds)
      : { data: [], error: null };

    if (enrollmentsError) {
      return NextResponse.json(
        { error: `Failed to load enrollments: ${enrollmentsError.message}` },
        { status: 500 }
      );
    }

    const memberIds = Array.from(
      new Set([...(enrollments ?? []).map((row) => row.member_id), ...directMemberIds])
    );
    const memberToClasses = new Map<string, string[]>();

    (enrollments ?? []).forEach((row) => {
      const existing = memberToClasses.get(row.member_id) ?? [];
      if (!existing.includes(row.class_id)) {
        existing.push(row.class_id);
      }
      memberToClasses.set(row.member_id, existing);
    });

    const classById = new Map<string, { name: string; schedule: string | null }>();
    (classes ?? []).forEach((row) => {
      classById.set(row.class_id, { name: row.name, schedule: row.schedule });
    });

    const classSwimmerCounts = new Map<string, number>();
    (enrollments ?? []).forEach((row) => {
      classSwimmerCounts.set(row.class_id, (classSwimmerCounts.get(row.class_id) ?? 0) + 1);
    });

    const classesPayload: InstructorClassPayload[] = (classes ?? []).map((row) => ({
      id: row.class_id,
      name: row.name,
      schedule: row.schedule ?? 'Schedule TBD',
      swimmers: classSwimmerCounts.get(row.class_id) ?? 0,
    }));

    if (memberIds.length === 0) {
      return NextResponse.json({
        userName,
        organizationName,
        classes: classesPayload,
        swimmers: [],
        skillsBySwimmer: {},
        notes: [],
      });
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('member')
      .select('member_id, first_name, last_name, level')
      .in('member_id', memberIds);

    if (membersError) {
      return NextResponse.json(
        { error: `Failed to load members: ${membersError.message}` },
        { status: 500 }
      );
    }

    const { data: memberSkillRows, error: memberSkillError } = await supabaseAdmin
      .from('member_skill')
      .select('member_id, skill_id, date_acquired')
      .in('member_id', memberIds);

    if (memberSkillError) {
      return NextResponse.json(
        { error: `Failed to load member skills: ${memberSkillError.message}` },
        { status: 500 }
      );
    }

    const skillIds = Array.from(new Set((memberSkillRows ?? []).map((row) => row.skill_id)));
    const skillNameById = new Map<string, string>();

    if (skillIds.length > 0) {
      const { data: skillRows, error: skillError } = await supabaseAdmin
        .from('skill')
        .select('skill_id, name')
        .in('skill_id', skillIds);

      if (skillError) {
        return NextResponse.json(
          { error: `Failed to load skills: ${skillError.message}` },
          { status: 500 }
        );
      }

      (skillRows ?? []).forEach((row) => {
        skillNameById.set(row.skill_id, row.name);
      });
    }

    const { data: evaluations, error: evalError } = await supabaseAdmin
      .from('evaluation')
      .select('evaluation_id, member_id, feedback, evaluation_date')
      .eq('instructor_person_id', person.person_id)
      .order('evaluation_date', { ascending: false })
      .limit(25);

    if (evalError) {
      return NextResponse.json(
        { error: `Failed to load evaluations: ${evalError.message}` },
        { status: 500 }
      );
    }

    const memberNameById = new Map<string, string>();
    (members ?? []).forEach((member) => {
      memberNameById.set(
        member.member_id,
        `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
      );
    });

    const swimmersPayload: InstructorSwimmerPayload[] = (members ?? []).map((member) => {
      const swimmerClassIds = memberToClasses.get(member.member_id) ?? [];
      const firstClassId = swimmerClassIds[0];
      const firstClass = firstClassId ? classById.get(firstClassId) : null;

      return {
        id: member.member_id,
        name: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim(),
        level: member.level ?? 'Unassigned level',
        nextSession: firstClass
          ? `${firstClass.name}: ${firstClass.schedule ?? 'Schedule TBD'}`
          : 'No upcoming session',
        classIds: swimmerClassIds,
      };
    });

    const skillsBySwimmer: Record<string, InstructorSkillPayload[]> = {};
    (memberSkillRows ?? []).forEach((row) => {
      if (!skillsBySwimmer[row.member_id]) skillsBySwimmer[row.member_id] = [];
      skillsBySwimmer[row.member_id].push({
        id: row.skill_id,
        name: skillNameById.get(row.skill_id) ?? 'Unknown skill',
        mastered: Boolean(row.date_acquired),
        dateAcquired: formatDate(row.date_acquired),
      });
    });

    Object.keys(skillsBySwimmer).forEach((memberId) => {
      skillsBySwimmer[memberId].sort((a, b) => {
        if (a.mastered !== b.mastered) return a.mastered ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    });

    const notesPayload: InstructorNotePayload[] = (evaluations ?? []).map((row) => ({
      id: row.evaluation_id,
      swimmerName: memberNameById.get(row.member_id) ?? 'Unknown swimmer',
      note: row.feedback ?? '',
      date: formatDate(row.evaluation_date) ?? '',
    }));

    return NextResponse.json({
      userName,
      organizationName,
      classes: classesPayload,
      swimmers: swimmersPayload,
      skillsBySwimmer,
      notes: notesPayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
