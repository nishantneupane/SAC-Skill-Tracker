/**
 * Admin dashboard page
 * Purpose: manage swimmers, instructors, and import roster data.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// Dashboard statistics from admin API
interface AdminStats {
    totalMembers: number;
    totalInstructors: number;
    activeClasses: number;
    skillLevels: number;
    organizationName: string;
    organizationId: string;
}

// Generic entity with normalized id field for consistent handling
interface Entity {
    id: string;  // Normalized from skill_id, person_id, class_id, etc.
    name: string;
    [key: string]: any;
}

// State for each entity type (skills, instructors, swimmers, parents, classes)
interface EntityState {
    list: Entity[];
    loading: boolean;
    editingId: string | null;      // ID of item currently being edited
    editingName: string;            // Edited name value
    newName: string;                // New item input value
}

type EntityType = 'skills' | 'instructors' | 'swimmers' | 'parents' | 'classes';
type Tab = EntityType | 'roster' | 'admins';

interface OrgPerson {
    person_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

// Configuration for each entity type. Centralizes all entity-specific logic.
// To add a new entity: add an entry here, and it works everywhere (forms, API, UI)
const ENTITY_CONFIG: Record<EntityType, {
    singularLabel: string;      // Used in alerts/messages: "Delete this instructor?"
    pluralLabel: string;        // Tab heading: "Manage Instructors"
    apiPath: string;            // API endpoint: /api/admin/instructors
    dataKey: string;            // Response key: data.instructors
    idField: string;            // ID field name in database: person_id vs skill_id
    displayName: (item: Entity) => string;  // How to display item in list: name or "first last"
}> = {
    skills: {
        singularLabel: 'skill',
        pluralLabel: 'Skills',
        apiPath: '/api/admin/skills',
        dataKey: 'skills',
        idField: 'skill_id',
        displayName: (item) => item.name,
    },
    instructors: {
        singularLabel: 'instructor',
        pluralLabel: 'Instructors',
        apiPath: '/api/admin/instructors',
        dataKey: 'instructors',
        idField: 'person_id',
        displayName: (item) => `${item.first_name || ''} ${item.last_name || ''}`.trim(),
    },
    swimmers: {
        singularLabel: 'swimmer',
        pluralLabel: 'Swimmers',
        apiPath: '/api/admin/swimmers',
        dataKey: 'swimmers',
        idField: 'person_id',
        displayName: (item) => `${item.first_name} ${item.last_name}`,
    },
    parents: {
        singularLabel: 'parent',
        pluralLabel: 'Parents',
        apiPath: '/api/admin/parents',
        dataKey: 'parents',
        idField: 'person_id',
        displayName: (item) => `${item.first_name} ${item.last_name}`,
    },
    classes: {
        singularLabel: 'class',
        pluralLabel: 'Classes',
        apiPath: '/api/admin/classes',
        dataKey: 'classes',
        idField: 'class_id',
        displayName: (item) => item.name,
    },
};

// Navigation tabs for the dashboard. Reusable for any entity type.
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'roster', label: 'Roster Management', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> },
    { id: 'admins', label: 'Admins', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg> },
    { id: 'swimmers', label: 'Swimmers', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'parents', label: 'Parents', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
    { id: 'instructors', label: 'Instructors', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'classes', label: 'Classes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'skills', label: 'Skills', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

function getInitials(name: string) {
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * EntityEditor - Reusable CRUD UI for any entity type (skills, instructors, etc.)
 * Handles: adding, editing, deleting items with inline editing
 * Uses ENTITY_CONFIG to adapt labels, API paths, and display names dynamically
 * Keyboard shortcuts: Enter to save, Escape to cancel
 */
function EntityEditor({
    type,
    state,
    onAdd,
    onUpdate,
    onDelete,
    onStartEdit,
    onCancelEdit,
    onNewNameChange,
    onEditNameChange,
}: {
    type: EntityType;
    state: EntityState;
    onAdd: () => void;
    onUpdate: (id: string) => void;
    onDelete: (id: string) => void;
    onStartEdit: (item: Entity) => void;
    onCancelEdit: () => void;
    onNewNameChange: (value: string) => void;
    onEditNameChange: (value: string) => void;
}) {
    const config = ENTITY_CONFIG[type];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-sm font-semibold text-gray-900 mb-4">Manage {config.pluralLabel}</p>

            {/* Add New Item */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={state.newName}
                    onChange={(e) => onNewNameChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                    placeholder={`Add new ${config.singularLabel}...`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                    onClick={onAdd}
                    disabled={!state.newName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                    Add
                </button>
            </div>

            {/* Items List */}
            {state.loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            ) : state.list.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No {config.pluralLabel.toLowerCase()} yet. Add one above!</p>
            ) : (
                <div className="space-y-1">
                    {state.list.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group">
                            {state.editingId === item.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={state.editingName}
                                        onChange={(e) => onEditNameChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') onUpdate(item.id);
                                            if (e.key === 'Escape') onCancelEdit();
                                        }}
                                        autoFocus
                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                    <button onClick={() => onUpdate(item.id)} className="text-green-600 hover:text-green-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                    <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 text-sm text-gray-900">{config.displayName(item)}</span>
                                    <button onClick={() => onStartEdit(item)} className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [userName, setUserName] = useState('Admin User');
    const [userEmail, setUserEmail] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('roster');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [admins, setAdmins] = useState<OrgPerson[]>([]);
    const [adminCandidates, setAdminCandidates] = useState<OrgPerson[]>([]);
    const [selectedAdminCandidate, setSelectedAdminCandidate] = useState('');
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [promotingAdmin, setPromotingAdmin] = useState(false);

    // Single generic state object manages all 5 entity types
    // Structure: { skills: {...}, instructors: {...}, swimmers: {...}, parents: {...}, classes: {...} }
    const [entities, setEntities] = useState<Record<EntityType, EntityState>>({
        skills: { list: [], loading: false, editingId: null, editingName: '', newName: '' },
        instructors: { list: [], loading: false, editingId: null, editingName: '', newName: '' },
        swimmers: { list: [], loading: false, editingId: null, editingName: '', newName: '' },
        parents: { list: [], loading: false, editingId: null, editingName: '', newName: '' },
        classes: { list: [], loading: false, editingId: null, editingName: '', newName: '' },
    });

    // Load user info and dashboard statistics on mount
    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            const userData = JSON.parse(stored);
            setUserName(userData.name || 'Admin User');
            setUserEmail(userData.email || '');

            const fetchStats = async () => {
                try {
                    const response = await fetch(`/api/admin/dashboard?email=${encodeURIComponent(userData.email)}`);
                    if (!response.ok) throw new Error('Failed to load stats');
                    const data = await response.json();
                    setStats(data);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                } finally {
                    setLoading(false);
                }
            };

            fetchStats();
        }
    }, []);

    // Memoize stat cards to avoid unnecessary recalculations
    const statCards = useMemo(() => [
        {
            label: 'Total Members', value: stats?.totalMembers ?? 0, icon: (
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
        {
            label: 'Instructors', value: stats?.totalInstructors ?? 0, icon: (
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
        {
            label: 'Active Classes', value: stats?.activeClasses ?? 0, icon: (
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )
        },
        {
            label: 'Skill Levels', value: stats?.skillLevels ?? 0, icon: (
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
        },
    ], [stats]);

    // Load all entity types when user email is available
    useEffect(() => {
        if (userEmail) {
            Object.keys(ENTITY_CONFIG).forEach((type) => {
                fetchEntity(type as EntityType);
            });
            fetchAdmins();
        }
    }, [userEmail]);

    const getPersonDisplayName = (person: OrgPerson) => {
        const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
        return name || person.email || 'Unknown';
    };

    const fetchAdmins = async () => {
        if (!userEmail) return;
        setAdminsLoading(true);
        try {
            const response = await fetch(`/api/admin/admins?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load admins');
            setAdmins(data.admins || []);
            setAdminCandidates(data.candidates || []);
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setAdminsLoading(false);
        }
    };

    const handlePromoteAdmin = async () => {
        if (!userEmail || !selectedAdminCandidate) return;
        setPromotingAdmin(true);
        try {
            const response = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, person_id: selectedAdminCandidate }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to promote admin');
            setSelectedAdminCandidate('');
            await fetchAdmins();
        } catch (err) {
            console.error('Error promoting admin:', err);
            alert('Failed to promote admin');
        } finally {
            setPromotingAdmin(false);
        }
    };

    // Fetch a specific entity type from API with loading state management
    const fetchEntity = async (type: EntityType) => {
        if (!userEmail) return;
        setEntities(prev => ({ ...prev, [type]: { ...prev[type], loading: true } }));
        try {
            const config = ENTITY_CONFIG[type];
            const response = await fetch(`${config.apiPath}?email=${encodeURIComponent(userEmail)}`);
            if (!response.ok) throw new Error(`Failed to load ${type}`);
            const data = await response.json();
            const listData = data[config.dataKey] || [];
            const listWithIds = listData.map((item: any) => ({
                ...item,
                id: item[config.idField],
            }));
            setEntities(prev => ({ ...prev, [type]: { ...prev[type], list: listWithIds } }));
        } catch (err) {
            console.error(`Error fetching ${type}:`, err);
        } finally {
            setEntities(prev => ({ ...prev, [type]: { ...prev[type], loading: false } }));
        }
    };

    // Create new entity. Uses entity-specific API path and field names from config.
    const handleAdd = async (type: EntityType) => {
        const state = entities[type];
        if (!state.newName.trim() || !userEmail) return;
        try {
            const config = ENTITY_CONFIG[type];
            const response = await fetch(config.apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, name: state.newName.trim() }),
            });
            if (!response.ok) throw new Error(`Failed to create ${type}`);
            setEntities(prev => ({ ...prev, [type]: { ...prev[type], newName: '' } }));
            await fetchEntity(type);
        } catch (err) {
            console.error(`Error adding ${type}:`, err);
            alert(`Failed to add ${ENTITY_CONFIG[type].singularLabel}`);
        }
    };

    // Update entity by ID. Uses correct ID field (skill_id, person_id, etc.) from config.
    const handleUpdate = async (type: EntityType, id: string) => {
        const state = entities[type];
        if (!state.editingName.trim() || !userEmail) return;
        try {
            const config = ENTITY_CONFIG[type];
            const response = await fetch(config.apiPath, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    [config.idField]: id,
                    name: state.editingName.trim(),
                }),
            });
            if (!response.ok) throw new Error(`Failed to update ${type}`);
            setEntities(prev => ({ ...prev, [type]: { ...prev[type], editingId: null, editingName: '' } }));
            await fetchEntity(type);
        } catch (err) {
            console.error(`Error updating ${type}:`, err);
            alert(`Failed to update ${ENTITY_CONFIG[type].singularLabel}`);
        }
    };

    // Delete entity with confirmation. Refreshes list after deletion.
    const handleDelete = async (type: EntityType, id: string) => {
        if (!userEmail) return;
        if (!confirm(`Delete this ${ENTITY_CONFIG[type].singularLabel}?`)) return;
        try {
            const config = ENTITY_CONFIG[type];
            const response = await fetch(`${config.apiPath}?email=${encodeURIComponent(userEmail)}&${config.idField}=${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error(`Failed to delete ${type}`);
            await fetchEntity(type);
        } catch (err) {
            console.error(`Error deleting ${type}:`, err);
            alert(`Failed to delete ${ENTITY_CONFIG[type].singularLabel}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">{stats?.organizationName || 'SAC Skill Tracker'}</p>
                            <p className="text-xs text-gray-500">Administrator Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{userName}</p>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Administrator</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-white">
                            {getInitials(userName)}
                        </div>
                        <button
                            onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}
                            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {/* Loading Banner */}
                {loading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-blue-800">Loading dashboard statistics...</p>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-red-800">Failed to load statistics</p>
                                    <p className="text-xs text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-md transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                                {stat.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${activeTab === tab.id
                                ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'roster' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="p-6 flex items-center justify-between border-b border-gray-100">
                            <h2 className="text-base font-semibold text-gray-900">Import from SportsEngine</h2>
                        </div>

                        <div className="p-6">
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center text-center mb-6">
                                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="4" strokeWidth={1.5} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12c0 2.21 4.03 4 9 4s9-1.79 9-4M3 16c0 2.21 4.03 4 9 4s9-1.79 9-4" /></svg>
                                <p className="text-base font-semibold text-gray-900 mb-1">Import Roster Data</p>
                                <p className="text-sm text-gray-500 mb-5">Import swimmer roster, levels, and class assignments from SportsEngine</p>
                                <div className="flex gap-3">
                                    <button className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Upload CSV
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-gray-900 mb-2">Supported Import Options:</p>
                                <ul className="text-sm text-gray-500 space-y-1">
                                    <li>• Bulk roster updates from SportsEngine API</li>
                                    <li>• CSV file upload for manual imports</li>
                                    <li>• Level and class assignment synchronization</li>
                                    <li>• Parent contact information updates</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'admins' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Organization Admins</h2>

                        <div className="mb-6">
                            <p className="text-sm font-medium text-gray-800 mb-2">Promote instructor to admin</p>
                            <div className="flex gap-2">
                                <select
                                    value={selectedAdminCandidate}
                                    onChange={(e) => setSelectedAdminCandidate(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select an instructor...</option>
                                    {adminCandidates.map((person) => (
                                        <option key={person.person_id} value={person.person_id}>
                                            {getPersonDisplayName(person)}{person.email ? ` (${person.email})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handlePromoteAdmin}
                                    disabled={!selectedAdminCandidate || promotingAdmin}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                >
                                    {promotingAdmin ? 'Promoting...' : 'Promote'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Promoting keeps instructor permissions and adds admin permissions.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-gray-800 mb-2">Current admins</p>
                            {adminsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    Loading admins...
                                </div>
                            ) : admins.length === 0 ? (
                                <p className="text-sm text-gray-500">No admins found.</p>
                            ) : (
                                <div className="space-y-1">
                                    {admins.map((person) => (
                                        <div key={person.person_id} className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                                            <p className="text-sm text-gray-900">{getPersonDisplayName(person)}</p>
                                            {person.email && <p className="text-xs text-gray-500">{person.email}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* All non-roster tabs use the same EntityEditor component with config-driven behavior */}
                {activeTab !== 'roster' && activeTab !== 'admins' && (
                    <EntityEditor
                        type={activeTab as EntityType}
                        state={entities[activeTab as EntityType]}
                        onAdd={() => handleAdd(activeTab as EntityType)}
                        onUpdate={(id) => handleUpdate(activeTab as EntityType, id)}
                        onDelete={(id) => handleDelete(activeTab as EntityType, id)}
                        onStartEdit={(item) =>
                            setEntities(prev => ({
                                ...prev,
                                [activeTab]: {
                                    ...prev[activeTab as EntityType],
                                    editingId: item.id,
                                    editingName: ENTITY_CONFIG[activeTab as EntityType].displayName(item),
                                },
                            }))
                        }
                        onCancelEdit={() =>
                            setEntities(prev => ({
                                ...prev,
                                [activeTab]: {
                                    ...prev[activeTab as EntityType],
                                    editingId: null,
                                    editingName: '',
                                },
                            }))
                        }
                        onNewNameChange={(value) =>
                            setEntities(prev => ({
                                ...prev,
                                [activeTab]: { ...prev[activeTab as EntityType], newName: value },
                            }))
                        }
                        onEditNameChange={(value) =>
                            setEntities(prev => ({
                                ...prev,
                                [activeTab]: { ...prev[activeTab as EntityType], editingName: value },
                            }))
                        }
                    />
                )}
            </main>
        </div>
    );
}

