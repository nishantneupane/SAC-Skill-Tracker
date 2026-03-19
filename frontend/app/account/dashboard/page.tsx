/**
 * Swimm/Adult Swimmer dashboard page
 * Purpose: overview dashboard focused on swimmer progress and instructor notes.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SwimmerCard {
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
  organizationName?: string;
  swimmers: Array<Omit<SwimmerCard, 'classIds'> & { classIds?: string[] }>;
  skillsBySwimmer: Record<string, SkillItem[]>;
  notes: NoteItem[];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AccountDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('Guest User');
  const [organizationName, setOrganizationName] = useState('SAC Skill Tracker');
  const [swimmers, setSwimmers] = useState<SwimmerCard[]>([]);
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

        // Fetch all parent dashboard data in one request.
        const response = await fetch(`/api/account/dashboard?email=${encodeURIComponent(email)}`);
        const payload = (await response.json()) as DashboardPayload & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load dashboard data.');
        }

        if (!isMounted) return;

        setUserName(payload.userName || localName);
        setOrganizationName(payload.organizationName || 'SAC Skill Tracker');
        setSwimmers(
          (payload.swimmers ?? []).map((swimmer) => ({
            ...swimmer,
            classIds: swimmer.classIds ?? [],
          }))
        );
        setSkillsBySwimmer(payload.skillsBySwimmer ?? {});
        setNotes(payload.notes ?? []);
      } catch (fetchError) {
        if (!isMounted) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Unexpected error';
        setError(message);
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

  const uniqueSwimmers = useMemo(() => {
    const deduped = new Map<string, SwimmerCard>();
    swimmers.forEach((swimmer) => {
      if (!deduped.has(swimmer.id)) {
        deduped.set(swimmer.id, swimmer);
      }
    });
    return Array.from(deduped.values());
  }, [swimmers]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{organizationName}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Parent/Swimmer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-900">{userName || 'Guest User'}</p>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Parent/Swimmer</span>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-800 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-white flex-shrink-0">
              {userName ? getInitials(userName) : 'GU'}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Loading Banner */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-green-600 flex-shrink-0"></div>
            <p className="text-xs sm:text-sm text-blue-800">Loading dashboard data...</p>
          </div>
        )}

        {/* Error Banner */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-red-800">Failed to load data</p>
                  <p className="text-[10px] sm:text-xs text-red-700 mt-0.5 sm:mt-1 break-words">{error}</p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] sm:text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors whitespace-nowrap flex-shrink-0"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* My Swimmers Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-full">
              My Swimmers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {uniqueSwimmers.map((swimmer) => (
              <div key={swimmer.id} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:border-gray-300 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {getInitials(swimmer.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{swimmer.name}</p>
                      <p className="text-xs text-gray-500">{swimmer.level}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Record: {swimmer.id.slice(0, 8)} • {swimmer.classIds.length} class{swimmer.classIds.length === 1 ? '' : 'es'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Next: {swimmer.nextSession}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-gray-900 text-white rounded-full">
                    {(() => {
                      const skills = skillsBySwimmer[swimmer.id] || [];
                      const pct =
                        skills.length === 0
                          ? 0
                          : Math.round((skills.filter((s) => s.mastered).length / skills.length) * 100);
                      return `${pct}%`;
                    })()}
                  </span>
                </div>

                <div className="mt-4">
                  {(() => {
                    const skills = skillsBySwimmer[swimmer.id] || [];
                    const mastered = skills.filter((s) => s.mastered).length;
                    const pct =
                      skills.length === 0
                        ? 0
                        : Math.round((mastered / skills.length) * 100);
                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Overall Progress ({mastered}/{skills.length} skills)</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
                        </div>
                        {swimmer.classIds.length === 0 && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                            No class enrollment linked to this swimmer record.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Skills</p>
                  <div className="space-y-1">
                    {(skillsBySwimmer[swimmer.id] || []).length === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        No skills are attached to this member record yet.
                      </p>
                    )}
                    {(skillsBySwimmer[swimmer.id] || []).slice(0, 4).map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-4 w-4 rounded-full flex items-center justify-center text-xs ${skill.mastered ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
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
                    {(skillsBySwimmer[swimmer.id] || []).length > 4 && (
                      <p className="text-xs text-gray-400 pt-1">+ {(skillsBySwimmer[swimmer.id] || []).length - 4} more...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && !error && uniqueSwimmers.length === 0 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
              No linked swimmers found for this account yet.
            </div>
          )}
        </section>

        {/* Instructor Notes Section */}
        <section className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-full">
              Recent Notes
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Instructor Notes</h2>
              <p className="text-xs text-gray-500 mt-1">Feedback and updates from your instructors.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="px-5 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                          {getInitials(note.swimmerName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{note.swimmerName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{note.date}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">{note.note}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 sm:px-6 py-8 sm:py-10 text-center">
                  <p className="text-sm text-gray-500">No notes yet. Check back soon for instructor feedback.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
