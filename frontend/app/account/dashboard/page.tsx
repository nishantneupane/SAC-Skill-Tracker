/**
 * Swimm/Adult Swimmer dashboard page
 * Purpose: overview dashboard focused on swimmer progress and instructor notes.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

interface SwimmerCard {
    id: string;
    name: string;
    level: string;
    nextSession: string;
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
    mastered: boolean; // true if date_acquired is not null in member_skill
    dateAcquired?: string;
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
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const userData = JSON.parse(stored);
            setUserName(userData.name || '');

        }

        // TODO: using person_id from user data, query guardian_member? 
        // to get associated members and display on dashboard
    }, []);

    // TODO: query guardian_member by person_id to get members, 
    // member_skill for progress, enrollment + class_entity for next session


    // DEMO DATA for now
    const swimmers: SwimmerCard[] = useMemo(
        () => [
            {
                id: 'swimmer-1',
                name: 'Emma Johnson',
                level: 'Level 2',
                nextSession: 'Feb 12, 2026 at 4:00 PM',
            },
            {
                id: 'swimmer-2',
                name: 'Jack Johnson',
                level: 'Level 1',
                nextSession: 'Feb 12, 2026 at 5:00 PM',
            },
        ],
        []
    );

    // TODO: query member_skill joined with skill by member_id 
    // to get individual skill names, progress, and date_acquired
   
    // DEMO DATA
    const skillsBySwimmer: Record<string, SkillItem[]> = useMemo(
        () => ({
            'swimmer-1': [
                { id: 's1', name: 'Freestyle breathing', mastered: true, dateAcquired: 'Feb 10, 2026' },
                { id: 's2', name: 'Backstroke arms', mastered: true, dateAcquired: 'Jan 28, 2026' },
                { id: 's3', name: 'Flip turn', mastered: false },
                { id: 's4', name: 'Butterfly kick', mastered: false },
            ],
            'swimmer-2': [
                { id: 's5', name: 'Water comfort', mastered: true, dateAcquired: 'Feb 8, 2026' },
                { id: 's6', name: 'Freestyle arms', mastered: false },
                { id: 's7', name: 'Backstroke kick', mastered: false },
            ],
        }),
        []
    );

    // TODO: query evaluation by member_ids, 
    // join person for instructor name, order by date desc
   
    // DEMO DATA
    const notes: NoteItem[] = useMemo(
        () => [
            {
                id: 'note-1',
                swimmerName: 'Emma Johnson',
                note: 'Mastered coordinated breathing in freestyle.',
                date: 'Feb 10, 2026',
            },
            {
                id: 'note-2',
                swimmerName: 'Jack Johnson',
                note: 'Great improvement in water comfort. Jack is showing more confidence!',
                date: 'Feb 8, 2026',
            },
            {
                id: 'note-3',
                swimmerName: 'Emma Johnson',
                note: 'Successfully completed treading water for 30 seconds.',
                date: 'Feb 5, 2026',
            },
        ],
        []
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">SAC Skill Tracker</h1>
                        <p className="text-sm text-gray-500">Parent/Adult Swimmer Dashboard</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{userName || 'Guest User'}</p>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                                Parent/Adult Swimmer
                            </span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                            {userName ? getInitials(userName) : 'GU'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {swimmers.map((swimmer) => (
                        <div key={swimmer.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                                        {getInitials(swimmer.name)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{swimmer.name}</p>
                                        <p className="text-xs text-gray-500">{swimmer.level}</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-gray-900 text-white rounded-full">
                                    {(() => {
                                        const skills = skillsBySwimmer[swimmer.id] || [];
                                        const pct = skills.length === 0 ? 0 : Math.round((skills.filter(s => s.mastered).length / skills.length) * 100);
                                        return `${pct}%`;
                                    })()}
                                </span>
                            </div>

                            <div className="mt-4">
                                {(() => {
                                    const skills = skillsBySwimmer[swimmer.id] || [];
                                    const pct = skills.length === 0 ? 0 : Math.round((skills.filter(s => s.mastered).length / skills.length) * 100);
                                    return (
                                        <>
                                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                <span>Overall Progress ({skills.filter(s => s.mastered).length}/{skills.length} skills)</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gray-900" style={{ width: `${pct}%` }} />
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Individual Skills */}
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-500 mb-2">Skills</p>
                                <div className="space-y-1">
                                    {(skillsBySwimmer[swimmer.id] || []).map((skill) => (
                                        <div key={skill.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-xs ${skill.mastered ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {skill.mastered ? '✓' : '○'}
                                                </span>
                                                <span className="text-xs text-gray-700">{skill.name}</span>
                                            </div>
                                            {skill.mastered && skill.dateAcquired && (
                                                <span className="text-xs text-gray-400">{skill.dateAcquired}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-full">
                            Instructor Notes
                        </span>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">Recent Notes</h2>
                            <p className="text-xs text-gray-500">Focus on feedback and updates from instructors.</p>
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
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
