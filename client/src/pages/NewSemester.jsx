import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { semesters as semestersAPI } from '../api/client';
import { ChevronLeft, Calendar } from 'lucide-react';

export default function NewSemester() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            setError('End date must be after start date');
            return;
        }

        try {
            setSaving(true);
            const response = await semestersAPI.create(formData);
            navigate(`/semester/${response.data.id}/setup`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create semester');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary mb-6 flex items-center gap-2"
                >
                    <ChevronLeft size={20} />
                    Back to Dashboard
                </button>

                <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                            <Calendar size={24} className="text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Create New Semester</h1>
                            <p className="text-gray-400">Set up a new semester to track attendance</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Semester Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="e.g., Fall 2024, Spring 2025"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    End Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Timezone
                            </label>
                            <input
                                type="text"
                                value={formData.timezone}
                                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                className="input-field"
                                placeholder="UTC"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary flex-1"
                            >
                                {saving ? 'Creating...' : 'Create Semester'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
