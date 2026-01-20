import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    semesters as semestersAPI,
    courses as coursesAPI,
    schedules as schedulesAPI
} from '../api/client';
import { Plus, Trash2, Calendar, ChevronLeft, AlertCircle } from 'lucide-react';

const COLORS = [
    '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#ef4444', '#06b6d4', '#a855f7', '#f97316', '#14b8a6'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SemesterSetup() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [semester, setSemester] = useState(null);
    const [courses, setCourses] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [propagating, setPropagating] = useState(false);

    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDangerous: false
    });

    // New course form
    const [newCourse, setNewCourse] = useState({
        name: '',
        code: '',
        professor: '',
        color: COLORS[0],
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [semesterRes, coursesRes] = await Promise.all([
                semestersAPI.getOne(id),
                coursesAPI.getBySemester(id),
            ]);

            setSemester(semesterRes.data);
            setCourses(coursesRes.data);

            // Load schedules for each course
            const schedulesData = {};
            for (const course of coursesRes.data) {
                const schedRes = await schedulesAPI.getByCourse(course.id);
                schedulesData[course.id] = schedRes.data;
            }
            setSchedules(schedulesData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const addCourse = async () => {
        if (!newCourse.name || !newCourse.code) {
            alert('Please fill in course name and code');
            return;
        }

        try {
            setSaving(true);
            await coursesAPI.create({
                semester_id: id,
                ...newCourse,
            });

            setNewCourse({
                name: '',
                code: '',
                professor: '',
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            });

            await loadData();
        } catch (error) {
            console.error('Failed to add course:', error);
            alert('Failed to add course');
        } finally {
            setSaving(false);
        }
    };

    const deleteCourse = (courseId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Course',
            message: 'Are you sure you want to delete this course? All associated sessions will be deleted.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await coursesAPI.delete(courseId);
                    await loadData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Failed to delete course:', error);
                    alert('Failed to delete course');
                }
            }
        });
    };

    const addSchedule = async (courseId) => {
        try {
            await schedulesAPI.create({
                course_id: courseId,
                day_of_week: 1, // Monday
                start_time: '09:00',
                end_time: '10:00',
                location: '',
            });

            await loadData();
        } catch (error) {
            console.error('Failed to add schedule:', error);
            alert(error.response?.data?.error || 'Failed to add schedule');
        }
    };

    const updateSchedule = async (scheduleId, field, value) => {
        try {
            await schedulesAPI.update(scheduleId, { [field]: value });
            await loadData();
        } catch (error) {
            console.error('Failed to update schedule:', error);
            alert(error.response?.data?.error || 'Failed to update schedule');
        }
    };

    const deleteSchedule = async (scheduleId) => {
        try {
            await schedulesAPI.delete(scheduleId);
            await loadData();
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            alert(error.response?.data?.error || 'Failed to delete schedule');
        }
    };

    const propagateSchedule = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Generate Sessions',
            message: 'This will generate all sessions for the semester based on your weekly schedule. Continue?',
            isDangerous: false,
            onConfirm: async () => {
                try {
                    setPropagating(true);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    const response = await semestersAPI.propagate(id);
                    alert(`Success! Created ${response.data.sessionsCreated} sessions.`);
                    navigate(`/semester/${id}`);
                } catch (error) {
                    console.error('Failed to propagate schedule:', error);
                    alert(error.response?.data?.error || 'Failed to propagate schedule');
                } finally {
                    setPropagating(false);
                }
            }
        });
    };

    const resetSemester = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Reset Semester',
            message: 'WARNING: This will DELETE ALL courses, schedules, and sessions for this semester. This action cannot be undone.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await Promise.all(courses.map(course => coursesAPI.delete(course.id)));
                    await loadData();
                    alert('Semester reset successfully.');
                } catch (error) {
                    console.error('Failed to reset semester:', error);
                    alert('Failed to reset semester');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (loading || !semester) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    const hasSchedules = Object.values(schedules).some(s => s.length > 0);

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(`/semester/${id}`)}
                    className="btn-secondary mb-6 flex items-center gap-2"
                >
                    <ChevronLeft size={20} />
                    Back to Semester
                </button>

                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Setup: {semester.name}</h1>
                            <p className="text-gray-400">Add courses and configure your weekly schedule</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={resetSemester}
                                disabled={courses.length === 0}
                                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Reset (Clear All)
                            </button>
                            <button
                                onClick={() => navigate(`/semester/${id}/ai-import`)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI Import
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Course */}
                <div className="glass-card p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Add Course</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Course Name"
                            value={newCourse.name}
                            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                            className="input-field"
                        />
                        <input
                            type="text"
                            placeholder="Course Code"
                            value={newCourse.code}
                            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                            className="input-field"
                        />
                        <input
                            type="text"
                            placeholder="Professor (optional)"
                            value={newCourse.professor}
                            onChange={(e) => setNewCourse({ ...newCourse, professor: e.target.value })}
                            className="input-field"
                        />
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={newCourse.color}
                                onChange={(e) => setNewCourse({ ...newCourse, color: e.target.value })}
                                className="w-12 h-12 rounded-lg cursor-pointer"
                            />
                            <button
                                onClick={addCourse}
                                disabled={saving}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                <Plus size={20} />
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Courses and Schedules */}
                <div className="space-y-6">
                    {courses.map((course) => {
                        const courseSchedules = schedules[course.id] || [];
                        const isLocked = courseSchedules.some(s => s.locked);

                        return (
                            <div key={course.id} className="glass-card p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: course.color }}
                                        />
                                        <div>
                                            <h3 className="text-lg font-semibold">{course.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                {course.code} {course.professor && `• ${course.professor}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteCourse(course.id)}
                                        className="text-red-400 hover:text-red-300 p-2"
                                        disabled={isLocked}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                {isLocked && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        <span className="text-sm">Schedule is locked. Rebuild semester to modify.</span>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {courseSchedules.map((schedule) => (
                                        <div key={schedule.id} className="bg-white/5 p-4 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-3">
                                            <select
                                                value={schedule.day_of_week}
                                                onChange={(e) => updateSchedule(schedule.id, 'day_of_week', parseInt(e.target.value))}
                                                className="input-field"
                                                disabled={schedule.locked}
                                            >
                                                {DAYS.map((day, idx) => (
                                                    <option key={idx} value={idx + 1}>{day}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="time"
                                                value={schedule.start_time}
                                                onChange={(e) => updateSchedule(schedule.id, 'start_time', e.target.value)}
                                                className="input-field"
                                                disabled={schedule.locked}
                                            />
                                            <input
                                                type="time"
                                                value={schedule.end_time}
                                                onChange={(e) => updateSchedule(schedule.id, 'end_time', e.target.value)}
                                                className="input-field"
                                                disabled={schedule.locked}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Location"
                                                value={schedule.location || ''}
                                                onChange={(e) => updateSchedule(schedule.id, 'location', e.target.value)}
                                                className="input-field"
                                                disabled={schedule.locked}
                                            />
                                            <button
                                                onClick={() => deleteSchedule(schedule.id)}
                                                className="btn-danger"
                                                disabled={schedule.locked}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    {!isLocked && (
                                        <button
                                            onClick={() => addSchedule(course.id)}
                                            className="btn-secondary w-full flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Add Time Slot
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Propagate Button */}
                {courses.length > 0 && hasSchedules && (
                    <div className="glass-card p-6 mt-8">
                        <h3 className="text-lg font-semibold mb-2">Ready to Generate Sessions?</h3>
                        <p className="text-gray-400 mb-4">
                            This will create all attendance sessions for the semester based on your weekly schedule.
                            Make sure your schedule is correct before proceeding.
                        </p>
                        <button
                            onClick={propagateSchedule}
                            disabled={propagating}
                            className="btn-primary flex items-center gap-2"
                        >
                            {propagating ? (
                                <>
                                    <div className="spinner w-5 h-5 border-2"></div>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Calendar size={20} />
                                    Generate All Sessions
                                </>
                            )}
                        </button>
                    </div>
                )}
                {/* Confirmation Modal */}
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-[#1e1b4b] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-xl">
                            <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
                            <p className="text-gray-300 mb-6">{confirmModal.message}</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`px-4 py-2 rounded-lg font-medium ${confirmModal.isDangerous
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                        }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
