/**
 * InstructorManager Component
 * Purpose: Manage instructors - grant role to existing persons or create new instructors
 * Features: Dual mode (existing/new), class assignment, inline editing
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface MemberCandidate {
    member_id: string;
    person_id: string | null;
    first_name: string;
    last_name: string;
    email?: string | null;
    has_person_account?: boolean;
}

interface Class {
    class_id: string;
    name: string;
    schedule?: string;
}

interface Instructor {
    person_id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    created_at: string;
    class_ids?: string[];
}

interface InstructorManagerProps {
    userEmail: string;
    onRefresh: () => void;
}

export default function InstructorManager({ userEmail, onRefresh }: InstructorManagerProps) {
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [loading, setLoading] = useState(false);
    const [instructorsLoading, setInstructorsLoading] = useState(true);
    const personDropdownRef = useRef<HTMLDivElement>(null);

    // Lists
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [availablePersons, setAvailablePersons] = useState<MemberCandidate[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);

    // Form state for existing person mode
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [personSearchQuery, setPersonSearchQuery] = useState('');
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);
    const [memberEmailForAccount, setMemberEmailForAccount] = useState('');

    // Form state for new instructor mode
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Shared state
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [classEditorId, setClassEditorId] = useState<string | null>(null);
    const [classEditorSelection, setClassEditorSelection] = useState<string[]>([]);
    const [savingClasses, setSavingClasses] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch instructors
    const fetchInstructors = async () => {
        setInstructorsLoading(true);
        try {
            const response = await fetch(`/api/admin/instructors?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (response.ok) {
                setInstructors(data.instructors || []);
            }
        } catch (error) {
            console.error('Failed to fetch instructors:', error);
        } finally {
            setInstructorsLoading(false);
        }
    };

    // Fetch available persons
    const fetchAvailablePersons = async () => {
        try {
            const response = await fetch(`/api/admin/persons?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (response.ok) {
                setAvailablePersons(data.persons || []);
            }
        } catch (error) {
            console.error('Failed to fetch persons:', error);
        }
    };

    // Fetch classes
    const fetchClasses = async () => {
        try {
            const response = await fetch(`/api/admin/classes?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes || []);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    useEffect(() => {
        fetchInstructors();
        fetchAvailablePersons();
        fetchClasses();
    }, [userEmail]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (personDropdownRef.current && !personDropdownRef.current.contains(event.target as Node)) {
                setShowPersonDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset form when switching modes
    useEffect(() => {
        setSelectedMemberId('');
        setPersonSearchQuery('');
        setShowPersonDropdown(false);
        setMemberEmailForAccount('');
        setFirstName('');
        setLastName('');
        setEmail('');
        setSelectedClassIds([]);
        setSuccessMessage(null);
    }, [mode]);

    // Exclude current instructors so grant-access only shows eligible members.
    const instructorIds = new Set(instructors.map((inst) => inst.person_id));
    const eligibleMembers = availablePersons.filter((person) => !person.person_id || !instructorIds.has(person.person_id));

    // Filter eligible members based on search query
    const filteredPersons = eligibleMembers.filter(person => {
        const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
        const email = person.email?.toLowerCase() || '';
        const query = personSearchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    // Get selected person details for display
    const selectedPerson = eligibleMembers.find((p) => p.member_id === selectedMemberId);

    const handleSelectPerson = (person: MemberCandidate) => {
        setSelectedMemberId(person.member_id);
        setPersonSearchQuery(`${formatName(person.first_name, person.last_name)}${person.email ? ` (${person.email})` : ''}`);
        setMemberEmailForAccount(person.email || '');
        setShowPersonDropdown(false);
    };

    const handleToggleClass = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const formatName = (firstName?: string | null, lastName?: string | null) => {
        return [firstName || '', lastName || ''].join(' ').trim();
    };

    const startClassEdit = (instructor: Instructor) => {
        if (classEditorId === instructor.person_id) {
            setClassEditorId(null);
            setClassEditorSelection([]);
            return;
        }

        setClassEditorId(instructor.person_id);
        setClassEditorSelection(instructor.class_ids || []);
    };

    const toggleClassSelectionForInstructor = (classId: string) => {
        setClassEditorSelection((prev) =>
            prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
        );
    };

    const saveClassAssignments = async (personId: string) => {
        setSavingClasses(true);
        try {
            const response = await fetch('/api/admin/instructors', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_email: userEmail,
                    person_id: personId,
                    class_ids: classEditorSelection,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update instructor classes');
            }

            setSuccessMessage('Instructor classes updated successfully.');
            setClassEditorId(null);
            setClassEditorSelection([]);
            await fetchInstructors();
        } catch (error: any) {
            alert(error.message || 'Failed to update instructor classes');
        } finally {
            setSavingClasses(false);
        }
    };

    const handleSubmit = async () => {
        if (mode === 'existing' && !selectedMemberId) {
            alert('Please select a person');
            return;
        }
        if (mode === 'new' && (!firstName.trim() || !lastName.trim() || !email.trim())) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        setSuccessMessage(null);
        try {
            const payload: any = {
                admin_email: userEmail,
                mode,
                class_ids: selectedClassIds,
            };

            if (mode === 'existing') {
                const candidate = eligibleMembers.find((p) => p.member_id === selectedMemberId);
                if (!candidate) throw new Error('Selected member not found');

                if (candidate.person_id) {
                    payload.person_id = candidate.person_id;
                } else {
                    if (!memberEmailForAccount.trim()) {
                        throw new Error('This member has no linked account yet. Add an email to create one.');
                    }
                    payload.mode = 'new';
                    payload.first_name = candidate.first_name;
                    payload.last_name = candidate.last_name;
                    payload.new_email = memberEmailForAccount.trim();
                    payload.member_id = candidate.member_id;
                }
            } else {
                payload.first_name = firstName.trim();
                payload.last_name = lastName.trim();
                payload.new_email = email.trim();
            }

            const response = await fetch('/api/admin/instructors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add instructor');
            }

            // Reset form
            const previousSelection = selectedPerson;
            setSelectedMemberId('');
            setPersonSearchQuery('');
            setShowPersonDropdown(false);
            setMemberEmailForAccount('');
            setFirstName('');
            setLastName('');
            setEmail('');
            setSelectedClassIds([]);

            const classText = selectedClassIds.length > 0
                ? ` and assigned to ${selectedClassIds.length} class${selectedClassIds.length === 1 ? '' : 'es'}`
                : '';
            const createdName = `${firstName.trim()} ${lastName.trim()}`.trim();
            const createdFromMember = mode === 'existing' && previousSelection && !previousSelection.person_id;
            setSuccessMessage(
                mode === 'existing' && !createdFromMember
                    ? `Instructor access granted successfully${classText}.`
                    : `Instructor ${createdName || 'account'} created successfully${classText}.`
            );

            // Refresh lists
            await fetchInstructors();
            await fetchAvailablePersons();
            onRefresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (personId: string) => {
        if (!editingName.trim()) return;

        try {
            const response = await fetch('/api/admin/instructors', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    person_id: personId,
                    name: editingName.trim(),
                }),
            });

            if (!response.ok) throw new Error('Failed to update instructor');

            setEditingId(null);
            setEditingName('');
            await fetchInstructors();
            onRefresh();
        } catch (error) {
            alert('Failed to update instructor');
        }
    };

    const handleDelete = async (personId: string) => {
        if (!confirm('Remove this instructor? They will lose instructor access.')) return;

        try {
            const response = await fetch(`/api/admin/instructors?email=${encodeURIComponent(userEmail)}&person_id=${personId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete instructor');

            await fetchInstructors();
            await fetchAvailablePersons();
            onRefresh();
        } catch (error) {
            alert('Failed to remove instructor');
        }
    };

    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Manage Instructors</p>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
                <button
                    onClick={() => setMode('existing')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${mode === 'existing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Grant Access to Existing Person
                </button>
                <button
                    onClick={() => setMode('new')}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${mode === 'new'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Create New Instructor
                </button>
            </div>

            {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <p className="text-xs sm:text-sm text-green-800">{successMessage}</p>
                </div>
            )}

            {/* Form based on mode */}
            {mode === 'existing' ? (
                <div ref={personDropdownRef} className="mb-4 relative">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Search & Select Member (excludes current instructors)
                    </label>
                    <input
                        type="text"
                        value={personSearchQuery}
                        onChange={(e) => {
                            setPersonSearchQuery(e.target.value);
                            setShowPersonDropdown(true);
                            if (!e.target.value) {
                                setSelectedMemberId('');
                                setMemberEmailForAccount('');
                            }
                        }}
                        onFocus={() => setShowPersonDropdown(true)}
                        placeholder="Search by name or email..."
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    {showPersonDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredPersons.length === 0 ? (
                                <div className="p-3 text-xs sm:text-sm text-gray-500 text-center">
                                    No eligible members found matching "{personSearchQuery}"
                                </div>
                            ) : (
                                filteredPersons.map((person) => (
                                    <button
                                        key={person.member_id}
                                        type="button"
                                        onClick={() => handleSelectPerson(person)}
                                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-blue-50 transition ${selectedMemberId === person.member_id ? 'bg-blue-100' : ''
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900">
                                            {formatName(person.first_name, person.last_name)}
                                        </div>
                                        {person.email && (
                                            <div className="text-gray-500 text-[10px] sm:text-xs">
                                                {person.email}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    {selectedPerson && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-800">
                                ✓ Selected: <span className="font-medium">{formatName(selectedPerson.first_name, selectedPerson.last_name)}</span>
                                {selectedPerson.email && <span className="text-green-600"> ({selectedPerson.email})</span>}
                            </p>
                        </div>
                    )}

                    {selectedPerson && !selectedPerson.person_id && (
                        <div className="mt-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                This member has no person account yet. Enter email to create and grant access.
                            </label>
                            <input
                                type="email"
                                value={memberEmailForAccount}
                                onChange={(e) => setMemberEmailForAccount(e.target.value)}
                                placeholder="member@example.com"
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                First Name
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Doe"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="john.doe@example.com"
                        />
                    </div>
                </div>
            )}

            {/* Class Selection */}
            {classes.length > 0 && (
                <div className="mb-4">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Assign to Classes (optional)
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {classes.map((classItem) => (
                            <label
                                key={classItem.class_id}
                                className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedClassIds.includes(classItem.class_id)}
                                    onChange={() => handleToggleClass(classItem.class_id)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs sm:text-sm text-gray-900">
                                    {classItem.name}
                                    {classItem.schedule && (
                                        <span className="text-gray-500 ml-1">({classItem.schedule})</span>
                                    )}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={
                    loading ||
                    (mode === 'existing' && (
                        !selectedMemberId ||
                        (selectedPerson ? (!selectedPerson.person_id && !memberEmailForAccount.trim()) : false)
                    )) ||
                    (mode === 'new' && (!firstName || !lastName || !email))
                }
                className="w-full px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
                {loading ? 'Adding...' : mode === 'existing' ? 'Grant Instructor Access' : 'Create Instructor'}
            </button>

            {/* Current Instructors List */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Current Instructors</p>
                {instructorsLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                ) : instructors.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-3">No instructors yet</p>
                ) : (
                    <div className="space-y-1">
                        {instructors.map((instructor) => (
                            <div key={instructor.person_id} className="rounded-lg border border-gray-100 bg-gray-50/60 px-2 sm:px-3 py-2">
                                <div className="flex items-center gap-2">
                                    {editingId === instructor.person_id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdate(instructor.person_id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                autoFocus
                                                className="flex-1 px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleUpdate(instructor.person_id)}
                                                className="text-green-600 hover:text-green-700 flex-shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-xs sm:text-sm text-gray-900 truncate">
                                                {formatName(instructor.first_name, instructor.last_name)}
                                                {instructor.email && (
                                                    <span className="text-gray-500 ml-1">({instructor.email})</span>
                                                )}
                                            </span>
                                            <button
                                                onClick={() => startClassEdit(instructor)}
                                                className="text-[10px] sm:text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                                            >
                                                Classes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(instructor.person_id);
                                                    setEditingName(formatName(instructor.first_name, instructor.last_name));
                                                }}
                                                className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(instructor.person_id)}
                                                className="text-red-600 hover:text-red-700 flex-shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </div>

                                {classEditorId === instructor.person_id && (
                                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
                                        <p className="text-[11px] sm:text-xs font-medium text-gray-700 mb-2">Assign classes</p>
                                        <div className="space-y-1 max-h-36 overflow-y-auto">
                                            {classes.map((classItem) => (
                                                <label key={classItem.class_id} className="flex items-center gap-2 text-xs sm:text-sm text-gray-800 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={classEditorSelection.includes(classItem.class_id)}
                                                        onChange={() => toggleClassSelectionForInstructor(classItem.class_id)}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span>{classItem.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={() => saveClassAssignments(instructor.person_id)}
                                                disabled={savingClasses}
                                                className="text-[10px] sm:text-xs px-2.5 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                                            >
                                                {savingClasses ? 'Saving...' : 'Save classes'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setClassEditorId(null);
                                                    setClassEditorSelection([]);
                                                }}
                                                className="text-[10px] sm:text-xs px-2.5 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
