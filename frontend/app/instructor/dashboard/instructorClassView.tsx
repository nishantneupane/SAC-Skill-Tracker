/**
 * Instructor Dashboard - Class View
 * From the instructor dashboard, when an instructor clicks on a specific class, they are taken to this page which shows the roster of swimmers in that class
 * Instructors can take class attendance easily
 * Instructors can click on a swimmer to update their individual progress and skill assessments
 */

'use client';

import { useMemo, useState } from 'react';

interface ClassInfo {
  id: string;
  name: string;
  schedule: string;
  swimmers: number;
}

interface ClassSwimmer {
  id: string;
  name: string;
  level: string;
  nextSession: string;
}

interface SkillItem {
  id: string;
  name: string;
  mastered: boolean;
}

interface AttendanceRecord {
  swimmerId: string;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStatusColor(status: AttendanceRecord['status']) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'absent':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'late':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'excused':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

function getStatusIcon(status: AttendanceRecord['status']) {
  switch (status) {
    case 'present':
      return '✓';
    case 'absent':
      return '✕';
    case 'late':
      return '⏰';
    case 'excused':
      return 'E';
    default:
      return '○';
  }
}

interface InstructorClassViewProps {
  classInfo: ClassInfo;
  swimmers: ClassSwimmer[];
  skillsBySwimmer: Record<string, SkillItem[]>;
  onBack: () => void;
  onSwimmerClick: (swimmerId: string) => void;
}

export default function InstructorClassView({
  classInfo,
  swimmers,
  skillsBySwimmer,
  onBack,
  onSwimmerClick,
}: InstructorClassViewProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    swimmers.map((swimmer) => ({ swimmerId: swimmer.id, status: null }))
  );
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const updateAttendance = (swimmerId: string, status: AttendanceRecord['status']) => {
    setAttendance((prev) =>
      prev.map((record) =>
        record.swimmerId === swimmerId ? { ...record, status } : record
      )
    );
    setAttendanceSaved(false);
  };

  const markAllPresent = () => {
    setAttendance((prev) => prev.map((record) => ({ ...record, status: 'present' })));
    setAttendanceSaved(false);
  };

  // Attendance persistence needs a dedicated table/API; for now this confirms local marking.
  const saveAttendance = () => {
    setAttendanceSaved(true);
  };

  const attendanceStats = useMemo(() => {
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const excused = attendance.filter((a) => a.status === 'excused').length;
    const unmarked = attendance.filter((a) => a.status === null).length;
    return { present, absent, late, excused, unmarked, total: swimmers.length };
  }, [attendance, swimmers.length]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{classInfo.name}</h1>
                <p className="text-sm text-gray-500">{classInfo.schedule}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={markAllPresent}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Mark All Present
              </button>
              <button
                onClick={saveAttendance}
                disabled={attendanceSaved}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  attendanceSaved
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {attendanceSaved ? '✓ Saved' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{attendanceStats.present}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{attendanceStats.absent}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{attendanceStats.late}</p>
            <p className="text-xs text-yellow-600">Late</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{attendanceStats.excused}</p>
            <p className="text-xs text-blue-600">Excused</p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Class Roster</h2>
              <p className="text-xs text-gray-500">
                {attendanceStats.unmarked > 0
                  ? `${attendanceStats.unmarked} swimmer${attendanceStats.unmarked > 1 ? 's' : ''} unmarked`
                  : 'All swimmers marked'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-100 border border-green-200"></span>
                Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></span>
                Absent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></span>
                Late
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></span>
                Excused
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {swimmers.map((swimmer) => {
              const record = attendance.find((a) => a.swimmerId === swimmer.id);
              const currentStatus = record?.status ?? null;
              const swimmerSkills = skillsBySwimmer[swimmer.id] ?? [];
              const mastered = swimmerSkills.filter((skill) => skill.mastered).length;
              const progress = swimmerSkills.length
                ? Math.round((mastered / swimmerSkills.length) * 100)
                : 0;

              return (
                <div key={swimmer.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => onSwimmerClick(swimmer.id)}
                      className="flex items-center gap-4 text-left flex-1 min-w-0"
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700 flex-shrink-0">
                        {getInitials(swimmer.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{swimmer.name}</p>
                        <p className="text-xs text-gray-500">{swimmer.level}</p>
                        <p className="text-xs text-gray-400 mt-1 truncate">Next session: {swimmer.nextSession}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateAttendance(swimmer.id, currentStatus === status ? null : status)}
                          className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm font-medium transition ${
                            currentStatus === status
                              ? getStatusColor(status)
                              : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                          }`}
                          title={status.charAt(0).toUpperCase() + status.slice(1)}
                        >
                          {getStatusIcon(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {swimmers.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500">No swimmers enrolled in this class.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
