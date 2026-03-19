create or replace function public.get_parent_dashboard(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with target_person as (
    select
      p.person_id,
      p.email,
      trim(concat_ws(' ', p.first_name, p.last_name)) as display_name
    from person p
    where p.email ilike p_email
    limit 1
  ),
  person_org as (
    select o.name
    from target_person tp
    left join person_organization po on po.person_id = tp.person_id
    left join organization o on o.organization_id = po.organization_id
    order by po.joined_at nulls last
    limit 1
  ),
  member_base as (
    select
      m.member_id,
      trim(concat_ws(' ', m.first_name, m.last_name)) as name,
      coalesce(m.level, 'Unassigned level') as level
    from target_person tp
    join guardian_member gm on gm.guardian_person_id = tp.person_id
    join member m on m.member_id = gm.member_id
  ),
  member_next_session as (
    select distinct on (e.member_id)
      e.member_id,
      ce.name || ': ' || coalesce(ce.schedule, 'Schedule TBD') as next_session
    from enrollment e
    join class_entity ce on ce.class_id = e.class_id
    join member_base mb on mb.member_id = e.member_id
    order by e.member_id, ce.name, ce.class_id
  ),
  swimmers_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', mb.member_id,
          'name', mb.name,
          'level', mb.level,
          'nextSession', coalesce(mns.next_session, 'No upcoming session')
        )
        order by mb.name asc
      ),
      '[]'::jsonb
    ) as swimmers
    from member_base mb
    left join member_next_session mns on mns.member_id = mb.member_id
  ),
  skills_grouped as (
    select
      ms.member_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ms.skill_id,
          'name', coalesce(s.name, 'Unknown skill'),
          'mastered', (ms.date_acquired is not null),
          'dateAcquired', case
            when ms.date_acquired is null then null
            else to_char(ms.date_acquired, 'Mon FMDD, YYYY')
          end
        )
        order by (ms.date_acquired is not null) desc, s.name asc
      ) as skills
    from member_skill ms
    left join skill s on s.skill_id = ms.skill_id
    join member_base mb on mb.member_id = ms.member_id
    group by ms.member_id
  ),
  skills_by_swimmer_json as (
    select coalesce(
      jsonb_object_agg(
        mb.member_id,
        coalesce(sg.skills, '[]'::jsonb)
      ),
      '{}'::jsonb
    ) as skills_by_swimmer
    from member_base mb
    left join skills_grouped sg on sg.member_id = mb.member_id
  ),
  notes_limited as (
    select
      e.evaluation_id,
      e.member_id,
      e.feedback,
      e.evaluation_date
    from evaluation e
    join member_base mb on mb.member_id = e.member_id
    order by e.evaluation_date desc
    limit 20
  ),
  notes_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', nl.evaluation_id,
          'swimmerName', mb.name,
          'note', coalesce(nl.feedback, ''),
          'date', to_char(nl.evaluation_date, 'Mon FMDD, YYYY')
        )
        order by nl.evaluation_date desc
      ),
      '[]'::jsonb
    ) as notes
    from notes_limited nl
    join member_base mb on mb.member_id = nl.member_id
  )
  select jsonb_build_object(
    'userName', coalesce(nullif(tp.display_name, ''), tp.email),
    'organizationName', coalesce(po.name, 'SAC Skill Tracker'),
    'swimmers', sj.swimmers,
    'skillsBySwimmer', sbj.skills_by_swimmer,
    'notes', nj.notes
  )
  from target_person tp
  left join person_org po on true
  cross join swimmers_json sj
  cross join skills_by_swimmer_json sbj
  cross join notes_json nj;
$$;
