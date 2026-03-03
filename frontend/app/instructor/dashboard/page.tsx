/**
 * SAC/Instructor dashboard page
 * Purpose: overview dashboard focused on instructor roster, progress, schedule, and recent notes.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import InstructorClassView from './instructorClassView';

interface InstructorClass {
  id: string;
  name: string;
  schedule: string;
  swimmers: number;
}

interface RosterSwimmerCard {
  id: string;
  name: string;
  level: string;
  nextSession: string;
  classIds: string[];
}

interface NoteItem {
  id: string;
  swimmerName: string;
  note: string;
  date: string;
}

interface SkillItem {
  id: string;
  name: string;
  mastered: boolean;
  dateAcquired?: string;
}

interface DashboardPayload {
  userName: string;
  classes: InstructorClass[];
  swimmers: RosterSwimmerCard[];
  skillsBySwimmer: Record<string, SkillItem[]>;
  notes: NoteItem[];
  error?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatPct(mastered: number, total: number) {
  if (total === 0) return 0;
  return Math.round((mastered / total) * 100);
}

export default function InstructorDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Guest User');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [todayClasses, setTodayClasses] = useState<InstructorClass[]>([]);
  const [swimmers, setSwimmers] = useState<RosterSwimmerCard[]>([]);
  const [skillsBySwimmer, setSkillsBySwimmer] = useState<Record<string, SkillItem[]>>({});
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError('');

        const stored = localStorage.getItem('user');
        if (!stored) {
          throw new Error('Missing local user session. Please log in again.');
        }

        const userData = JSON.parse(stored);
        const localName = userData.name || 'Guest User';
        const email = userData.email;

        setUserName(localName);

        if (!email) {
          throw new Error('Missing user email from login session.');
        }

        const response = await fetch(`/api/instructor/dashboard?email=${encodeURIComponent(email)}`);
        const payload = (await response.json()) as DashboardPayload;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load instructor dashboard data.');
        }

        if (!isMounted) return;

        setUserName(payload.userName || localName);
        setTodayClasses(payload.classes ?? []);
        setSwimmers(payload.swimmers ?? []);
        setSkillsBySwimmer(payload.skillsBySwimmer ?? {});
        setNotes(payload.notes ?? []);
      } catch (fetchError) {
        if (!isMounted) return;

        const message =
          fetchError instanceof Error ? fetchError.message : 'Unexpected error loading dashboard.';

        setError(message);
        setTodayClasses([]);
        setSwimmers([]);
        setSkillsBySwimmer({});
        setNotes([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const swimmersByClass = useMemo(() => {
    const byClass: Record<string, RosterSwimmerCard[]> = {};
    swimmers.forEach((swimmer) => {
      swimmer.classIds.forEach((classId) => {
        if (!byClass[classId]) byClass[classId] = [];
        byClass[classId].push(swimmer);
      });
    });
    return byClass;
  }, [swimmers]);

  const selectedClass = useMemo(
    () => todayClasses.find((cls) => cls.id === selectedClassId) ?? null,
    [todayClasses, selectedClassId]
  );

  if (selectedClassId && selectedClass) {
    return (
      <InstructorClassView
        classInfo={selectedClass}
        swimmers={swimmersByClass[selectedClassId] ?? []}
        skillsBySwimmer={skillsBySwimmer}
        onBack={() => setSelectedClassId(null)}
        onSwimmerClick={(swimmerId) => router.push(`/instructor/swimmers/${swimmerId}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">SAC Skill Tracker</h1>
            <p className="text-sm text-gray-500">Instructor Dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName || 'Guest User'}</p>
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                Instructor
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {isLoading && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            Loading instructor dashboard...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Today's Classes{' '}
                <time className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </h2>
              <p className="text-xs text-gray-500">Tap a class to review roster.</p>
            </div>

            <div className="divide-y divide-gray-100">
              {todayClasses.map((cls) => (
                <button
                  key={cls.id}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition"
                  onClick={() => setSelectedClassId(cls.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-2 rounded-lg bg-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{cls.schedule}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{cls.name}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-gray-900 text-white rounded-full">
                      {cls.swimmers} swimmers
                    </span>
                  </div>
                </button>
              ))}

              {!isLoading && !error && todayClasses.length === 0 && (
                <div className="px-6 py-6 text-sm text-gray-500">No classes assigned yet.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            {(() => {
              const totalSwimmers = swimmers.length;
              const totalSkills = swimmers.reduce(
                (acc, swimmer) => acc + (skillsBySwimmer[swimmer.id]?.length ?? 0),
                0
              );
              const masteredSkills = swimmers.reduce(
                (acc, swimmer) =>
                  acc + (skillsBySwimmer[swimmer.id]?.filter((skill) => skill.mastered).length ?? 0),
                0
              );
              const pct = formatPct(masteredSkills, totalSkills);

              return (
                <>
                  <p className="text-xs font-medium text-gray-500">Overview</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">My Roster</p>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Swimmers</span>
                      <span className="text-sm font-semibold text-gray-900">{totalSwimmers}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Skills Mastered</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {masteredSkills}/{totalSkills}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Overall mastery</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-full">
              My Swimmers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {swimmers.map((swimmer) => {
              const skills = skillsBySwimmer[swimmer.id] || [];
              const mastered = skills.filter((s) => s.mastered).length;
              const pct = formatPct(mastered, skills.length);

              return (
                <button
                  key={swimmer.id}
                  className="text-left bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition"
                  onClick={() => router.push(`/instructor/swimmers/${swimmer.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {getInitials(swimmer.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{swimmer.name}</p>
                        <p className="text-xs text-gray-500">{swimmer.level}</p>
                        <p className="text-xs text-gray-400 mt-1">Next: {swimmer.nextSession}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-gray-900 text-white rounded-full">
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>
                        Overall Progress ({mastered}/{skills.length} skills)
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Skills</p>
                    <div className="space-y-1">
                      {skills.slice(0, 4).map((skill) => (
                        <div key={skill.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-4 w-4 rounded-full flex items-center justify-center text-xs ${
                                skill.mastered ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {skill.mastered ? '✓' : '○'}
                            </span>
                            <span className="text-xs text-gray-700">{skill.name}</span>
                          </div>
                          {skill.mastered && skill.dateAcquired && (
                            <span className="text-xs text-gray-400">{skill.dateAcquired}</span>
                          )}
                        </div>
                      ))}

                      {skills.length > 4 && (
                        <p className="text-xs text-gray-400 pt-1">+ {skills.length - 4} more...</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!isLoading && !error && swimmers.length === 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
              No swimmers assigned to your classes yet.
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-full">
              Recent Notes
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Instructor Notes</h2>
              <p className="text-xs text-gray-500">Recent feedback you have logged across swimmers.</p>
            </div>

            <div className="divide-y divide-gray-100">
              {notes.map((note) => (
                <div key={note.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                        {getInitials(note.swimmerName)}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{note.swimmerName}</p>
                    </div>
                    <span className="text-xs text-gray-400">{note.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{note.note}</p>
                </div>
              ))}

              {!isLoading && !error && notes.length === 0 && (
                <div className="px-6 py-6 text-sm text-gray-500">No notes logged yet.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
