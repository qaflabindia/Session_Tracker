import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { semesters as semestersAPI, courses as coursesAPI, sessions as sessionsAPI } from '../api/client';
import { format, parseISO, startOfWeek, endOfWeek, addDays, isSameDay, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus, Settings, BarChart3, Check, X, Ban } from 'lucide-react';

export default function SemesterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [semester, setSemester] = useState(null);
    const [courses, setCourses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(true);
    const [markingSession, setMarkingSession] = useState(null);

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

    const getSessionsForDay = (date) => {
        return sessions.filter(s => isSameDay(parseISO(s.date), date));
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
        <div className="min-h-screen p-4 md:p-8">
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
                        const daySessions = getSessionsForDay(day);
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

                                <div className="space-y-2">
                                    {daySessions.length === 0 ? (
                                        <p className="text-xs text-gray-500 text-center py-4">No sessions</p>
                                    ) : (
                                        daySessions.map((session) => {
                                            const course = courses.find(c => c.id === session.course_id);
                                            return (
                                                <div
                                                    key={session.id}
                                                    className="p-3 rounded-lg border transition-all hover:scale-105"
                                                    style={{
                                                        backgroundColor: `${course?.color}20`,
                                                        borderColor: `${course?.color}40`,
                                                    }}
                                                >
                                                    <p className="text-xs font-medium mb-1" style={{ color: course?.color }}>
                                                        {course?.code}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mb-2">
                                                        {session.start_time} - {session.end_time}
                                                    </p>

                                                    <div className="flex gap-1 mt-auto">
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'attended')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Attended"}
                                                            className={`flex-1 text-xs py-1.5 px-0 rounded transition-all flex items-center justify-center ${session.status === 'attended'
                                                                ? 'bg-green-500 text-white'
                                                                : isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-green-500/30'
                                                                }`}
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'missed')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Skipped"}
                                                            className={`flex-1 text-xs py-1.5 px-0 rounded transition-all flex items-center justify-center ${session.status === 'missed'
                                                                ? 'bg-red-500 text-white'
                                                                : isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-red-500/30'
                                                                }`}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => markAttendance(session.id, 'cancelled')}
                                                            disabled={markingSession === session.id || isFuture}
                                                            title={isFuture ? "Cannot mark future session" : "Canceled"}
                                                            className={`flex-1 text-xs py-1.5 px-0 rounded transition-all flex items-center justify-center ${session.status === 'cancelled'
                                                                ? 'bg-gray-500 text-white'
                                                                : isFuture ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/10 hover:bg-gray-500/30'
                                                                }`}
                                                        >
                                                            <Ban size={14} />
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
            </div>
        </div>
    );
}
