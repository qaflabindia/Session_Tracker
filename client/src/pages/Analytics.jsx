import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analytics as analyticsAPI, exportData } from '../api/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, Download, FileText } from 'lucide-react';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export default function Analytics() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [id]);

    const loadAnalytics = async () => {
        try {
            const response = await analyticsAPI.getBySemester(id);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        exportData.downloadCSV(id);
    };

    if (loading || !analytics) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    const overallData = [
        { name: 'Attended', value: analytics.overall.attended, color: '#10b981' },
        { name: 'Missed', value: analytics.overall.missed, color: '#ef4444' },
        { name: 'Cancelled', value: analytics.overall.cancelled, color: '#f59e0b' },
        { name: 'Scheduled', value: analytics.overall.scheduled, color: '#3b82f6' },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(`/semester/${id}`)}
                    className="btn-secondary mb-6 flex items-center gap-2"
                >
                    <ChevronLeft size={20} />
                    Back to Semester
                </button>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                        <p className="text-gray-400">Attendance insights and statistics</p>
                    </div>

                    <button
                        onClick={downloadCSV}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Download size={20} />
                        Export CSV
                    </button>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Total Sessions</p>
                        <p className="text-3xl font-bold">{analytics.overall.total_sessions}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Attended</p>
                        <p className="text-3xl font-bold text-green-400">{analytics.overall.attended}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Missed</p>
                        <p className="text-3xl font-bold text-red-400">{analytics.overall.missed}</p>
                    </div>
                    <div className="glass-card p-6">
                        <p className="text-sm text-gray-400 mb-1">Attendance Rate</p>
                        <p className="text-3xl font-bold text-primary-400">
                            {analytics.overall.attendance_percentage}%
                        </p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Pie Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Overall Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={overallData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {overallData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Day of Week Heatmap */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-4">Attendance by Day</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.day_heatmap}>
                                <XAxis dataKey="day_name" tick={{ fill: '#9ca3af' }} />
                                <YAxis tick={{ fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="attended" fill="#10b981" />
                                <Bar dataKey="total" fill="#374151" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Per-Course Analytics */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Course-wise Attendance</h3>
                    <div className="space-y-4">
                        {analytics.by_course.map((course) => {
                            const validSessions = course.total_sessions - course.cancelled;
                            const percentage = course.attendance_percentage;

                            return (
                                <div key={course.id} className="bg-white/5 p-4 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: course.color }}
                                            />
                                            <div>
                                                <p className="font-medium">{course.name}</p>
                                                <p className="text-sm text-gray-400">{course.code}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold">{percentage}%</p>
                                            <p className="text-xs text-gray-400">
                                                {course.attended}/{validSessions} sessions
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: course.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="glass-card p-6 mt-8 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-400">
                        <strong className="text-yellow-400">Disclaimer:</strong> This is a self-reported attendance record
                        and has not been externally verified. Data is for personal tracking purposes only.
                    </p>
                </div>
            </div>
        </div>
    );
}
