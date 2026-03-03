/**
 * Instructor swimmer detail page
 * Purpose: detailed view for a single swimmer (skills, notes, history) accessible by ID.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface SwimmerDetail {
  id: string;
  name: string;
  age: number | null;
  level: string;
  enrollmentDate: string;
  guardianName: string;
  guardianEmail: string;
  guardianRelationship: string;
}

interface ClassInfo {
  id: string;
  name: string;
  schedule: string;
}

interface Skill {
  id: string;
  name: string;
  mastered: boolean;
  progress: number;
  dateAcquired?: string;
}

interface Note {
  id: string;
  date: string;
  content: string;
  author: string;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  className: string;
}

interface SwimmerPayload {
  swimmer: SwimmerDetail;
  classes: ClassInfo[];
  skills: Skill[];
  notes: Note[];
  attendanceHistory: AttendanceRecord[];
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

function getStatusBadge(status: AttendanceRecord['status']) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-700';
    case 'absent':
      return 'bg-red-100 text-red-700';
    case 'late':
      return 'bg-yellow-100 text-yellow-700';
    case 'excused':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function InstructorSwimmerDetail() {
  const router = useRouter();
  const params = useParams();
  const swimmerId = params.id as string;

  const [activeTab, setActiveTab] = useState<'skills' | 'notes' | 'attendance'>('skills');
  const [newNote, setNewNote] = useState('');

  const [swimmer, setSwimmer] = useState<SwimmerDetail | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [updatingSkillId, setUpdatingSkillId] = useState<string | null>(null);

  const loadSwimmerData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const stored = localStorage.getItem('user');
      if (!stored) {
        throw new Error('Missing local user session. Please log in again.');
      }

      const userData = JSON.parse(stored);
      const email = userData.email;

      if (!email) {
        throw new Error('Missing user email from login session.');
      }

      const response = await fetch(
        `/api/instructor/swimmers/${swimmerId}?email=${encodeURIComponent(email)}`
      );
      const payload = (await response.json()) as SwimmerPayload;

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load swimmer detail.');
      }

      setSwimmer(payload.swimmer ?? null);
      setClasses(payload.classes ?? []);
      setSkills(payload.skills ?? []);
      setNotes(payload.notes ?? []);
      setAttendanceHistory(payload.attendanceHistory ?? []);
      setSelectedClassId((payload.classes ?? [])[0]?.id ?? '');
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unexpected error';
      setError(message);
      setSwimmer(null);
      setClasses([]);
      setSkills([]);
      setNotes([]);
      setAttendanceHistory([]);
      setSelectedClassId('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSwimmerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swimmerId]);

  const masteredCount = useMemo(
    () => skills.filter((skill) => skill.mastered).length,
    [skills]
  );

  const progressPct = useMemo(
    () => (skills.length ? Math.round((masteredCount / skills.length) * 100) : 0),
    [masteredCount, skills.length]
  );

  const toggleSkill = async (skill: Skill) => {
    try {
      setSaveError('');
      setUpdatingSkillId(skill.id);

      const stored = localStorage.getItem('user');
      if (!stored) {
        throw new Error('Missing local user session. Please log in again.');
      }

      const userData = JSON.parse(stored);
      const email = userData.email;

      if (!email) {
        throw new Error('Missing user email from login session.');
      }

      const nextMastered = !skill.mastered;

      setSkills((prev) =>
        prev.map((item) =>
          item.id === skill.id
            ? {
                ...item,
                mastered: nextMastered,
                progress: nextMastered ? 100 : 0,
                dateAcquired: nextMastered
                  ? new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : undefined,
              }
            : item
        )
      );

      const response = await fetch(`/api/instructor/swimmers/${swimmerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          skillId: skill.id,
          mastered: nextMastered,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update skill.');
      }

      await loadSwimmerData();
    } catch (patchError) {
      const message = patchError instanceof Error ? patchError.message : 'Failed to update skill';
      setSaveError(message);
      await loadSwimmerData();
    } finally {
      setUpdatingSkillId(null);
    }
  };

  const handleAddNote = async () => {
    try {
      if (!newNote.trim()) return;

      setSaveError('');
      setIsSavingNote(true);

      const stored = localStorage.getItem('user');
      if (!stored) {
        throw new Error('Missing local user session. Please log in again.');
      }

      const userData = JSON.parse(stored);
      const email = userData.email;

      if (!email) {
        throw new Error('Missing user email from login session.');
      }

      const response = await fetch(`/api/instructor/swimmers/${swimmerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          note: newNote,
          classId: selectedClassId || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save note.');
      }

      setNewNote('');
      await loadSwimmerData();
    } catch (postError) {
      const message = postError instanceof Error ? postError.message : 'Failed to save note';
      setSaveError(message);
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading swimmer details...</div>
      </div>
    );
  }

  if (!isLoading && (error || !swimmer)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg px-6">
          <p className="text-red-700 text-sm">{error || 'Swimmer not found.'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-700">
                {getInitials(swimmer?.name ?? 'Unknown')}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{swimmer?.name}</h1>
                <p className="text-sm text-gray-500">
                  {swimmer?.age ? `Age ${swimmer.age} • ` : ''}
                  {swimmer?.level}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{progressPct}%</p>
            <p className="text-xs text-gray-500">Skills Mastered</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {masteredCount}/{skills.length}
            </p>
            <p className="text-xs text-gray-500">Skills Complete</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm font-semibold text-gray-900">{swimmer?.enrollmentDate || 'N/A'}</p>
            <p className="text-xs text-gray-500">Enrollment Date</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm font-semibold text-gray-900">{classes.length}</p>
            <p className="text-xs text-gray-500">Enrolled Classes</p>
          </div>
        </section>

        <div className="flex gap-2 border-b border-gray-200">
          {(['skills', 'notes', 'attendance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'skills' && (
          <section className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{swimmer?.level} Progress</span>
                <span className="text-sm text-gray-500">
                  {masteredCount} of {skills.length} skills
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {skills.map((skill) => (
                <div key={skill.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSkill(skill)}
                      disabled={updatingSkillId === skill.id}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-sm transition ${
                        skill.mastered
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {skill.mastered ? '✓' : '○'}
                    </button>
                    <div>
                      <p className={`text-sm ${skill.mastered ? 'text-gray-900' : 'text-gray-600'}`}>
                        {skill.name}
                      </p>
                      <p className="text-xs text-gray-400">Progress: {skill.progress}%</p>
                    </div>
                  </div>

                  <div className="text-right">
                    {skill.mastered && skill.dateAcquired ? (
                      <span className="text-xs text-gray-400">{skill.dateAcquired}</span>
                    ) : (
                      <span className="text-xs text-gray-400">Not yet acquired</span>
                    )}
                  </div>
                </div>
              ))}

              {skills.length === 0 && (
                <div className="px-6 py-6 text-sm text-gray-500">No skills tracked for this swimmer yet.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'notes' && (
          <section className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this swimmer..."
                className="w-full h-24 p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-200"
              />

              {classes.length > 0 && (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.schedule})
                    </option>
                  ))}
                </select>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSavingNote}
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {isSavingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {notes.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No notes yet</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{note.author}</span>
                      <span className="text-xs text-gray-400">{note.date}</span>
                    </div>
                    <p className="text-sm text-gray-600">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'attendance' && (
          <section className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Attendance History</h3>
              <p className="text-xs text-gray-500">Derived from saved evaluations</p>
            </div>
            <div className="divide-y divide-gray-100">
              {attendanceHistory.map((record, index) => (
                <div key={`${record.date}-${index}`} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900">{record.date}</p>
                    <p className="text-xs text-gray-500">{record.className}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(record.status)}`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </div>
              ))}

              {attendanceHistory.length === 0 && (
                <div className="px-6 py-6 text-sm text-gray-500">No attendance/evaluation records yet.</div>
              )}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Parent/Guardian Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm text-gray-900">{swimmer?.guardianName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              {swimmer?.guardianEmail ? (
                <a href={`mailto:${swimmer.guardianEmail}`} className="text-sm text-blue-600 hover:underline">
                  {swimmer.guardianEmail}
                </a>
              ) : (
                <p className="text-sm text-gray-900">Not available</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Relationship</p>
              <p className="text-sm text-gray-900">{swimmer?.guardianRelationship || 'Not available'}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
