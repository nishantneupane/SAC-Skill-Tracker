/**
 * Instructor Dashboard - Class View
 * From the instructor dashboard, when an instructor clicks on a specific class, they are taken to this page which shows the roster of swimmers in that class
 * Instructors can click on a swimmer to update their individual progress and skill assessments
 */

'use client';

import { useState } from 'react';

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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
  const [searchValue, setSearchValue] = useState('');

  const filteredSwimmers = swimmers.filter((swimmer) => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return true;
    return (
      swimmer.name.toLowerCase().includes(query) ||
      swimmer.level.toLowerCase().includes(query)
    );
  });

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

            <div className="text-sm text-gray-500">
              {swimmers.length} swimmer{swimmers.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Class Roster</h2>
              <p className="text-xs text-gray-500">Review swimmer progress and open individual detail pages.</p>
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search swimmers..."
              className="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div className="divide-y divide-gray-100">
            {filteredSwimmers.map((swimmer) => {
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

                    <span className="text-xs text-gray-400">Open</span>
                  </div>
                </div>
              );
            })}

            {filteredSwimmers.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500">No swimmers enrolled in this class.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
