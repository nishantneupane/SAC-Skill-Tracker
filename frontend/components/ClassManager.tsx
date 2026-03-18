/**
 * ClassManager Component
 * Purpose: Manage classes with support for name, schedule, and length_minutes
 * Features: CRUD operations with inline editing for all class fields
 */

'use client';

import { useState, useEffect } from 'react';

interface Class {
    class_id: string;
    name: string;
    schedule?: string | null;
    length_minutes?: number | null;
    created_at: string;
}

interface ClassManagerProps {
    userEmail: string;
    onRefresh: () => void;
}

export default function ClassManager({ userEmail, onRefresh }: ClassManagerProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [csvSummary, setCsvSummary] = useState<{
        insertedClasses: number;
        updatedClasses: number;
        totalProcessed: number;
        skippedRows: number;
    } | null>(null);

    // New class form state
    const [newName, setNewName] = useState('');
    const [newSchedule, setNewSchedule] = useState('');
    const [newLengthMinutes, setNewLengthMinutes] = useState('');

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingSchedule, setEditingSchedule] = useState('');
    const [editingLengthMinutes, setEditingLengthMinutes] = useState('');

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; classId: string | null; className: string }>({ show: false, classId: null, className: '' });

    // Fetch classes
    const fetchClasses = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/classes?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes || []);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userEmail) {
            fetchClasses();
        }
    }, [userEmail]);

    // Show success message temporarily
    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    // Show error message temporarily
    const showError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    const handleCsvFileSelect = (file: File | null) => {
        if (!file) return;

        const isCsvType =
            file.type === 'text/csv' ||
            file.type === 'application/vnd.ms-excel' ||
            file.name.toLowerCase().endsWith('.csv');

        if (!isCsvType) {
            setCsvErrors(['Please select a CSV file.']);
            setSelectedCsvFile(null);
            return;
        }

        setSelectedCsvFile(file);
        setCsvErrors([]);
        setCsvSummary(null);
    };

    const handleUploadCsv = async () => {
        if (!selectedCsvFile || !userEmail || csvUploading) return;

        setCsvUploading(true);
        setCsvErrors([]);

        try {
            const formData = new FormData();
            formData.append('file', selectedCsvFile);
            formData.append('email', userEmail);

            const response = await fetch('/api/admin/import-classes', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                if (Array.isArray(data.errors) && data.errors.length > 0) {
                    setCsvErrors(data.errors);
                } else {
                    setCsvErrors([data.error || 'Failed to import classes CSV']);
                }
                return;
            }

            setCsvSummary({
                insertedClasses: data.insertedClasses ?? 0,
                updatedClasses: data.updatedClasses ?? 0,
                totalProcessed: data.totalProcessed ?? 0,
                skippedRows: data.skippedRows ?? 0,
            });
            setSelectedCsvFile(null);
            showSuccess('Classes CSV imported successfully');
            await fetchClasses();
            onRefresh();
        } catch (error) {
            console.error('Failed to import classes CSV:', error);
            setCsvErrors([
                error instanceof Error
                    ? error.message
                    : 'Unexpected error while importing classes CSV',
            ]);
        } finally {
            setCsvUploading(false);
        }
    };

    // Add new class
    const handleAdd = async () => {
        if (!newName.trim()) {
            showError('Class name is required');
            return;
        }

        if (newLengthMinutes && parseInt(newLengthMinutes) <= 0) {
            showError('Length must be a positive number');
            return;
        }

        if (submitting) return; // Prevent double submission
        setSubmitting(true);

        try {
            const response = await fetch('/api/admin/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_email: userEmail,
                    name: newName.trim(),
                    schedule: newSchedule.trim() || null,
                    length_minutes: newLengthMinutes ? parseInt(newLengthMinutes) : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create class');
            }

            setNewName('');
            setNewSchedule('');
            setNewLengthMinutes('');
            showSuccess('Class created successfully');
            await fetchClasses();
            onRefresh();
        } catch (error) {
            console.error('Failed to create class:', error);
            showError(error instanceof Error ? error.message : 'Failed to create class');
        } finally {
            setSubmitting(false);
        }
    };

    // Start editing a class
    const startEdit = (classItem: Class) => {
        setEditingId(classItem.class_id);
        setEditingName(classItem.name);
        setEditingSchedule(classItem.schedule || '');
        setEditingLengthMinutes(classItem.length_minutes?.toString() || '');
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditingSchedule('');
        setEditingLengthMinutes('');
    };

    // Save edited class
    const saveEdit = async (class_id: string) => {
        if (!editingName.trim()) {
            showError('Class name is required');
            return;
        }

        if (editingLengthMinutes && parseInt(editingLengthMinutes) <= 0) {
            showError('Length must be a positive number');
            return;
        }

        try {
            const response = await fetch('/api/admin/classes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_email: userEmail,
                    class_id,
                    name: editingName.trim(),
                    schedule: editingSchedule.trim() || null,
                    length_minutes: editingLengthMinutes ? parseInt(editingLengthMinutes) : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update class');
            }

            cancelEdit();
            showSuccess('Class updated successfully');
            await fetchClasses();
            onRefresh();
        } catch (error) {
            console.error('Failed to update class:', error);
            showError(error instanceof Error ? error.message : 'Failed to update class');
        }
    };

    // Confirm delete
    const confirmDelete = (class_id: string, className: string) => {
        setConfirmDialog({ show: true, classId: class_id, className });
    };

    // Delete class
    const handleDelete = async () => {
        const class_id = confirmDialog.classId;
        if (!class_id) return;

        setConfirmDialog({ show: false, classId: null, className: '' });

        try {
            const response = await fetch(
                `/api/admin/classes?email=${encodeURIComponent(userEmail)}&class_id=${class_id}`,
                { method: 'DELETE' }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete class');
            }

            showSuccess('Class deleted successfully');
            await fetchClasses();
            onRefresh();
        } catch (error) {
            console.error('Failed to delete class:', error);
            showError(error instanceof Error ? error.message : 'Failed to delete class');
        }
    };

    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Manage Classes</p>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-800">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-red-800">{errorMessage}</p>
                </div>
            )}

            {/* Add New Class Form */}
            <div className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 bg-gray-50/60">
                <p className="text-xs font-medium text-gray-700 mb-2">Upload Classes (CSV)</p>
                <p className="text-[11px] sm:text-xs text-gray-500 mb-3">
                    Required column: <span className="font-medium">name</span>. Optional columns: <span className="font-medium">schedule</span>, <span className="font-medium">length_minutes</span>.
                </p>

                <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    id="classesCsvUpload"
                    onChange={(e) => handleCsvFileSelect(e.target.files?.[0] ?? null)}
                />

                <div className="flex flex-wrap gap-2 items-center">
                    <label
                        htmlFor="classesCsvUpload"
                        className={`cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition ${csvUploading
                            ? 'border-gray-200 bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Choose CSV
                    </label>
                    <button
                        onClick={handleUploadCsv}
                        disabled={!selectedCsvFile || csvUploading}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition ${selectedCsvFile && !csvUploading
                            ? 'bg-black text-white hover:opacity-90'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {csvUploading ? 'Uploading...' : 'Upload Classes'}
                    </button>
                </div>

                {selectedCsvFile && (
                    <p className="mt-2 text-xs text-gray-500">Selected: {selectedCsvFile.name}</p>
                )}

                {csvSummary && (
                    <div className="mt-3 text-xs sm:text-sm text-green-700 space-y-1">
                        <p>Inserted: {csvSummary.insertedClasses}</p>
                        <p>Updated: {csvSummary.updatedClasses}</p>
                        <p>Processed rows: {csvSummary.totalProcessed}</p>
                        {csvSummary.skippedRows > 0 && (
                            <p>Skipped rows: {csvSummary.skippedRows}</p>
                        )}
                    </div>
                )}

                {csvErrors.length > 0 && (
                    <div className="mt-3 text-xs sm:text-sm text-red-700 space-y-1">
                        {csvErrors.map((msg, index) => (
                            <p key={`${msg}-${index}`}>{msg}</p>
                        ))}
                    </div>
                )}
            </div>

            {/* Add New Class Form */}
            <div className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Add New Class</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Class name*"
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <input
                        type="text"
                        value={newSchedule}
                        onChange={(e) => setNewSchedule(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Schedule (optional)"
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <input
                        type="number"
                        value={newLengthMinutes}
                        onChange={(e) => setNewLengthMinutes(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Length (min)"
                        min="1"
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!newName.trim() || submitting}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition whitespace-nowrap"
                    >
                        {submitting ? 'Adding...' : 'Add Class'}
                    </button>
                </div>
            </div>

            {/* Classes List */}
            {loading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                </div>
            ) : classes.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
                    No classes yet. Add one above!
                </p>
            ) : (
                <div className="space-y-2">
                    {classes.map((classItem) => (
                        <div
                            key={classItem.class_id}
                            className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition"
                        >
                            {editingId === classItem.class_id ? (
                                // Edit Mode
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                                                Name*
                                            </label>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(classItem.class_id);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                autoFocus
                                                className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                                                Schedule
                                            </label>
                                            <input
                                                type="text"
                                                value={editingSchedule}
                                                onChange={(e) => setEditingSchedule(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(classItem.class_id);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                placeholder="e.g., Mon/Wed 4pm"
                                                className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                                                Length (min)
                                            </label>
                                            <input
                                                type="number"
                                                value={editingLengthMinutes}
                                                onChange={(e) => setEditingLengthMinutes(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit(classItem.class_id);
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                min="1"
                                                placeholder="e.g., 45"
                                                className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={cancelEdit}
                                            className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => saveEdit(classItem.class_id)}
                                            className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                            {classItem.name}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                            {classItem.schedule && (
                                                <p className="text-xs sm:text-sm text-gray-600">
                                                    <span className="font-medium">Schedule:</span> {classItem.schedule}
                                                </p>
                                            )}
                                            {classItem.length_minutes && (
                                                <p className="text-xs sm:text-sm text-gray-600">
                                                    <span className="font-medium">Length:</span> {classItem.length_minutes} min
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => startEdit(classItem)}
                                            className="text-blue-600 hover:text-blue-700 transition"
                                            title="Edit class"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(classItem.class_id, classItem.name)}
                                            className="text-red-600 hover:text-red-700 transition"
                                            title="Delete class"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmDialog.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Class</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Are you sure you want to delete <strong>{confirmDialog.className}</strong>? This will remove all instructor assignments.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDialog({ show: false, classId: null, className: '' })}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
