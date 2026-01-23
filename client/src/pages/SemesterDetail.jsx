import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { semesters as semestersAPI, courses as coursesAPI, sessions as sessionsAPI } from '../api/client';
import { format, parseISO, startOfWeek, endOfWeek, addDays, isSameDay, isAfter, startOfDay, differenceInMinutes, parse, getHours, getMinutes, addHours } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus, Settings, BarChart3, Check, X, Ban, Trash2, AlertTriangle } from 'lucide-react';

export default function SemesterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [semester, setSemester] = useState(null);
    const [courses, setCourses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(true);
    const [markingSession, setMarkingSession] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        loadData();
    }, [id, currentWeekStart]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [semesterRes, coursesRes, sessionsRes] = await Promise.all([
                semestersAPI.getOne(id),
                coursesAPI.getBySemester(id),
                sessionsAPI.getAll({
                    semester_id: id,
                    start_date: format(currentWeekStart, 'yyyy-MM-dd'),
                    end_date: format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                }),
            ]);

            setSemester(semesterRes.data);
            setCourses(coursesRes.data);
            setSessions(sessionsRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (sessionId, status) => {
        try {
            setMarkingSession(sessionId);
            await sessionsAPI.mark(sessionId, status);
            await loadData();
        } catch (error) {
            console.error('Failed to mark attendance:', error);
            alert('Failed to mark attendance');
        } finally {
            setMarkingSession(null);
        }
    };

    const handleAddSession = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            await sessionsAPI.create({
                semester_id: id,
                course_id: parseInt(formData.get('course_id')),
                date: formData.get('date'),
                start_time: formData.get('start_time'),
                end_time: formData.get('end_time'),
                repeat_weekly: formData.get('repeat_weekly') === 'on',
                repeat_until: formData.get('repeat_until')
            });
            setIsAddModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Failed to create session:', error);
            alert('Failed to create session');
        }
    };

    const handleDeleteSession = async (mode) => {
        if (!deleteTarget) return;
        try {
            await sessionsAPI.delete(deleteTarget.id, mode);
            setDeleteTarget(null);
            loadData();
        } catch (error) {
            console.error('Failed to delete session:', error);
            alert('Failed to delete session');
        }
    };

    const getSessionsForDay = (date) => {
        return sessions.filter(s => s && s.date && isSameDay(parseISO(s.date), date));
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    if (loading || !semester) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn-secondary mb-6 flex items-center gap-2"
                    >
                        <ChevronLeft size={20} />
                        Back to Dashboard
                    </button>

                    <div className="glass-card p-8 text-center">
                        <h2 className="text-2xl font-bold mb-4">{semester.name}</h2>
                        <p className="text-gray-400 mb-6">
                            No courses yet. Add courses and set up your weekly schedule to get started.
                        </p>
                        <button
                            onClick={() => navigate(`/semester/${id}/setup`)}
                            className="btn-primary flex items-center justify-center gap-2 mx-auto"
                        >
                            <Plus size={20} />
                            Set Up Courses & Schedule
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-gray-400 hover:text-white mb-2 flex items-center gap-1"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <h1 className="text-3xl font-bold">{semester.name}</h1>
                        <p className="text-gray-400">
                            {format(parseISO(semester.start_date), 'MMM d, yyyy')} - {format(parseISO(semester.end_date), 'MMM d, yyyy')}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Add Session
                        </button>
                        <button
                            onClick={() => navigate(`/semester/${id}/analytics`)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <BarChart3 size={20} />
                            Analytics
                        </button>
                        <button
                            onClick={() => navigate(`/semester/${id}/setup`)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Settings size={20} />
                            Manage
                        </button>
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="glass-card p-4 mb-6 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-center">
                        <p className="text-sm text-gray-400">Week of</p>
                        <p className="font-semibold">
                            {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                        </p>
                    </div>

                    <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Weekly Calendar */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {weekDays.map((day, index) => {
                        const rawSessions = getSessionsForDay(day);
                        // Filter valid sessions and sort by start time
                        const sortedSessions = [...rawSessions]
                            .filter(s => s.start_time && s.end_time)
                            .sort((a, b) => a.start_time.localeCompare(b.start_time));

                        // Calculate visual overlaps
                        let daySessions = [];
                        try {
                            daySessions = sortedSessions.map((session, index) => {
                                const start = parse(session.start_time, 'HH:mm', new Date());
                                const end = parse(session.end_time, 'HH:mm', new Date());
                                const startMinutes = getHours(start) * 60 + getMinutes(start);
                                const endMinutes = getHours(end) * 60 + getMinutes(end);

                                let overlapLevel = 0;
                                let hasConflict = false;

                                // Check against all other sessions for conflict
                                sortedSessions.forEach((other, otherIndex) => {
                                    if (index === otherIndex) return;

                                    const otherStart = parse(other.start_time, 'HH:mm', new Date());
                                    const otherEnd = parse(other.end_time, 'HH:mm', new Date());
                                    const otherStartMinutes = getHours(otherStart) * 60 + getMinutes(otherStart);
                                    const otherEndMinutes = getHours(otherEnd) * 60 + getMinutes(otherEnd);

                                    // Check for overlap intersection
                                    if (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) {
                                        hasConflict = true;
                                        // Only increment indent level for previous overlapping sessions (to stagger)
                                        if (otherIndex < index) {
                                            overlapLevel++;
                                        }
                                    }
                                });

                                return { ...session, startMinutes, endMinutes, overlapLevel, hasConflict };
                            });
                        } catch (err) {
                            console.error('Error in simple daySessions map:', err);
                        }
                        const isToday = isSameDay(day, new Date());
                        const isFuture = isAfter(startOfDay(day), startOfDay(new Date()));

                        return (
                            <div key={index} className={`glass-card p-4 ${isToday ? 'ring-2 ring-primary-500' : ''} ${isFuture ? 'opacity-75' : ''}`}>
                                <div className="text-center mb-4">
                                    <p className="text-xs text-gray-400">{format(day, 'EEE')}</p>
                                    <p className={`text-lg font-semibold ${isToday ? 'text-primary-400' : ''}`}>
                                        {format(day, 'd')}
                                    </p>
                                </div>

                                <div className="relative min-h-[1000px]">
                                    {daySessions.length === 0 ? (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <p className="text-xs text-gray-500/30 font-medium">No sessions</p>
                                        </div>
                                    ) : (
                                        daySessions.map((session) => {
                                            const { startMinutes, endMinutes, overlapLevel } = session;
                                            const course = courses.find(c => c.id === session.course_id);

                                            const refMinutes = 8 * 60; // 8:00 AM

                                            // GUARD RAIL: Prevent slots from going "above" the calendar (negative top)
                                            let topPx = Math.max(0, (startMinutes - refMinutes) * 1.5);

                                            const durationMinutes = endMinutes - startMinutes;
                                            // GUARD RAIL: Max height check to align with container
                                            const containerH = 1000;
                                            let heightPx = Math.max(60, durationMinutes * 1.5); // Min height 60px

                                            // Ensure it doesn't overflow bottom
                                            if (topPx + heightPx > containerH) {
                                                heightPx = containerH - topPx;
                                            }

                                            // Visual Offset for overlaps
                                            const indent = Math.min(session.overlapLevel, 3);
                                            const leftPct = indent * 15;
                                            const widthPct = 100 - leftPct;

                                            return (
                                                <div
                                                    key={session.id}
                                                    className="absolute p-2 rounded-lg border transition-all hover:z-50 hover:shadow-lg flex flex-col group"
                                                    style={{
                                                        backgroundColor: `${course?.color}20`,
                                                        borderColor: `${course?.color}40`,
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        minHeight: '60px',
                                                        maxHeight: `${containerH}px`,
                                                        overflow: 'hidden',
                                                        left: `${leftPct}%`,
                                                        width: `${widthPct}%`,
                                                        zIndex: 10 + indent
                                                    }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-white/10 text-white text-xs p-3 rounded-xl shadow-xl z-50 pointer-events-none">
                                                        <p className="font-bold text-sm text-center">{course?.name}</p>
                                                        {/* Arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                                    </div>

                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <p className="text-xs font-bold leading-tight truncate" style={{ color: course?.color }}>
                                                                {course?.code}
                                                            </p>
                                                            {session.hasConflict && (
                                                                <AlertTriangle size={12} className="text-amber-500 shrink-0 animate-pulse" />
                                                            )}
                                                        </div>
                                                        {/* Delete button (only visible on group hover) */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteTarget(session);
                                                            }}
                                                            className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono mb-auto block">
                                                        {session.start_time} - {session.end_time}
                                                    </span>

                                                    {/* Compact buttons for timeline view */}
                                                    <div className="flex gap-0.5 mt-auto pt-1">
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'attended')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Attended"}
                                                            className={`flex-1 h-6 rounded flex items-center justify-center transition-colors ${session.status === 'attended' ? 'bg-green-500 text-white' :
                                                                isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-green-500/30'
                                                                }`}
                                                        >
                                                            <Check size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'missed')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Skipped"}
                                                            className={`flex-1 h-6 rounded flex items-center justify-center transition-colors ${session.status === 'missed' ? 'bg-red-500 text-white' :
                                                                isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-red-500/30'
                                                                }`}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'cancelled')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Canceled"}
                                                            className={`flex-1 h-6 rounded flex items-center justify-center transition-colors ${session.status === 'cancelled' ? 'bg-gray-500 text-white' :
                                                                isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-gray-500/30'
                                                                }`}
                                                        >
                                                            <Ban size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Session Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <div className="glass-card w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">Add Session</h2>
                            <AddSessionForm
                                courses={courses}
                                semester={semester}
                                onClose={() => setIsAddModalOpen(false)}
                                onAdd={loadData}
                            />
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <DeleteConfirmationModal
                        onClose={() => setDeleteTarget(null)}
                        onConfirm={handleDeleteSession}
                    />
                )}
            </div>
        </div>
    );
}

function AddSessionForm({ courses, semester, onClose, onAdd }) {
    const [isRepeating, setIsRepeating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            await sessionsAPI.create({
                semester_id: semester.id,
                course_id: parseInt(formData.get('course_id')),
                date: formData.get('date'),
                start_time: formData.get('start_time'),
                end_time: formData.get('end_time'),
                repeat_weekly: isRepeating,
                repeat_until: formData.get('repeat_until')
            });
            onClose();
            onAdd();
        } catch (error) {
            console.error('Failed to create session:', error);
            alert(error.response?.data?.error || 'Failed to create session');
        }
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const oneHourLater = format(addHours(now, 1), 'HH:mm');
    const minDate = (semester?.start_date && semester.start_date > today) ? semester.start_date : today;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-1">Course</label>
                <select name="course_id" required className="input-field w-full">
                    <option value="">Select a course</option>
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                    <input
                        type="time"
                        name="start_time"
                        required
                        className="input-field w-full"
                        defaultValue={currentTime}
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">End Time</label>
                    <input
                        type="time"
                        name="end_time"
                        required
                        className="input-field w-full"
                        defaultValue={oneHourLater}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <input
                    type="checkbox"
                    id="repeat"
                    className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                />
                <label htmlFor="repeat" className="text-sm font-medium">Repeat Weekly</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">
                        {isRepeating ? "From Date" : "Date"}
                    </label>
                    <input
                        type="date"
                        name="date"
                        required
                        className="input-field w-full"
                        defaultValue={today}
                        min={minDate}
                        max={semester?.end_date}
                    />
                </div>
                <div>
                    <label className={`block text-sm text-gray-400 mb-1 ${!isRepeating ? 'opacity-50' : ''}`}>
                        To Date
                    </label>
                    <input
                        type="date"
                        name="repeat_until"
                        className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        defaultValue={semester?.end_date}
                        min={minDate}
                        max={semester?.end_date}
                        disabled={!isRepeating}
                        required={isRepeating}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                >
                    Cancel
                </button>
                <button type="submit" className="btn-primary">
                    {isRepeating ? "Add Sessions" : "Add Session"}
                </button>
            </div>
        </form>
    );
}

function DeleteConfirmationModal({ onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="glass-card w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-2">Delete Session</h2>
                <p className="text-gray-400 mb-6">
                    How would you like to delete this session?
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => onConfirm('single')}
                        className="w-full btn-secondary text-left flex items-center justify-between group"
                    >
                        <span>Delete this instance only</span>
                        <Trash2 size={16} className="text-gray-400 group-hover:text-red-400" />
                    </button>
                    <button
                        onClick={() => onConfirm('future')}
                        className="w-full btn-secondary text-left flex items-center justify-between group"
                    >
                        <span>Delete this and all future instances</span>
                        <Trash2 size={16} className="text-gray-400 group-hover:text-red-400" />
                    </button>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white px-4 py-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
