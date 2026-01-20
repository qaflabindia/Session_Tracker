import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { semesters as semestersAPI } from '../api/client';
import { Plus, Calendar, TrendingUp, BookOpen, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadSemesters();
    }, []);

    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDangerous: false
    });

    const loadSemesters = async () => {
        try {
            const response = await semestersAPI.getAll();
            setSemesters(response.data);
        } catch (error) {
            console.error('Failed to load semesters:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteSemester = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Semester',
            message: 'Are you sure you want to delete this semester? All courses, schedules, and attendance records will be permanently deleted.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await semestersAPI.delete(id);
                    await loadSemesters();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Failed to delete semester:', error);
                    alert('Failed to delete semester');
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (semesters.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 max-w-md w-full text-center animate-slide-up">
                    <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar size={40} className="text-primary-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Welcome to Session Tracker</h2>
                    <p className="text-gray-400 mb-6">
                        Get started by creating your first semester. You'll be able to add courses, set up your schedule, and track attendance.
                    </p>
                    <button
                        onClick={() => navigate('/semester/new')}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Create First Semester
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Semesters</h1>
                        <p className="text-gray-400">Manage your attendance across all semesters</p>
                    </div>
                    <button
                        onClick={() => navigate('/semester/new')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        New Semester
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {semesters.map((semester) => (
                        <div
                            key={semester.id}
                            onClick={() => navigate(`/semester/${semester.id}`)}
                            className="glass-card p-6 cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold mb-1 group-hover:text-primary-400 transition-colors">
                                        {semester.name}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {format(parseISO(semester.start_date), 'MMM d, yyyy')} - {format(parseISO(semester.end_date), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSemester(semester.id);
                                        }}
                                        className="w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center transition-colors"
                                        title="Delete Semester"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                    <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                                        <BookOpen size={20} className="text-primary-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-gray-400">
                                    <Calendar size={16} />
                                    <span>{semester.timezone || 'UTC'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
    );
}
