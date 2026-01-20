import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiExtraction, apiKeys, semesters as semestersAPI, courses as coursesAPI, schedules as schedulesAPI } from '../api/client';
import { Upload, Key, CheckCircle, AlertCircle, ChevronLeft, Sparkles, ChevronRight, FileText, Calendar } from 'lucide-react';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AITimetableUpload() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [semester, setSemester] = useState(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // Upload mode
    const [uploadMode, setUploadMode] = useState('dual'); // 'single' or 'dual'

    // Files
    const [singleFile, setSingleFile] = useState(null);
    const [semesterAnnouncementFile, setSemesterAnnouncementFile] = useState(null);
    const [weeklyScheduleFile, setWeeklyScheduleFile] = useState(null);

    const [hints, setHints] = useState('');
    const [uploading, setUploading] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [error, setError] = useState('');

    // Two-step workflow
    const [currentStep, setCurrentStep] = useState(1); // 1 = courses, 2 = schedules
    const [editingCourses, setEditingCourses] = useState([]);
    const [editingSchedules, setEditingSchedules] = useState([]);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [semesterRes, apiKeyStatus] = await Promise.all([
                semestersAPI.getOne(id),
                apiKeys.getStatus()
            ]);

            setSemester(semesterRes.data);
            setHasApiKey(apiKeyStatus.data.hasApiKey);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const saveApiKey = async () => {
        try {
            await apiKeys.set(apiKey);
            setHasApiKey(true);
            setShowApiKeyInput(false);
            setApiKey('');
            alert('API key saved securely!');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save API key');
        }
    };

    const handleSingleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSingleFile(file);
            setError('');
        }
    };

    const handleSemesterAnnouncementChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSemesterAnnouncementFile(file);
            setError('');
        }
    };

    const handleWeeklyScheduleChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setWeeklyScheduleFile(file);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (uploadMode === 'single' && !singleFile) {
            setError('Please select a timetable file');
            return;
        }

        if (uploadMode === 'dual' && (!semesterAnnouncementFile || !weeklyScheduleFile)) {
            setError('Please select both semester announcement and weekly schedule files');
            return;
        }

        if (!hasApiKey) {
            setError('Please configure your OpenAI API key first');
            return;
        }

        try {
            setUploading(true);
            setError('');

            const formData = new FormData();

            if (uploadMode === 'single') {
                formData.append('timetable', singleFile);
            } else {
                formData.append('semesterAnnouncement', semesterAnnouncementFile);
                formData.append('weeklySchedule', weeklyScheduleFile);
            }

            if (hints) {
                formData.append('hints', hints);
            }

            const response = await aiExtraction.parseTimetable(formData);
            setExtractedData(response.data);

            // Initialize editing state with nested schedules
            const courses = JSON.parse(JSON.stringify(response.data.courses || []));
            const DEFAULT_COLORS = ['#f97316', '#a855f7', '#ec4899', '#10b981', '#0ea5e9', '#ef4444', '#06b6d4', '#f59e0b'];

            // Ensure each course has a schedules array (for backward compatibility)
            courses.forEach((course, idx) => {
                if (!course.schedules) {
                    course.schedules = [];
                }
                // Ensure slot field exists
                if (!course.slot) {
                    course.slot = course.code?.charAt(0) || 'A';
                }
                // Failsafe: Assign random color if missing or black
                if (!course.color || course.color === '#000000') {
                    course.color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
                }
            });

            setEditingCourses(courses);
            // editingSchedules is no longer used - schedules are nested under courses
            setEditingSchedules([]);
            setCurrentStep(1); // Start with course master
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to parse timetable');
        } finally {
            setUploading(false);
        }
    };

    const handleImportCourses = async () => {
        if (editingCourses.length === 0) {
            alert('Please add at least one course');
            return;
        }
        setCurrentStep(2);
    };

    const handleImportAll = async () => {
        try {
            setImporting(true);

            // Create courses and their nested schedules
            for (const course of editingCourses) {
                // strict validation
                if (!id || !course.name || !course.code) {
                    console.error('Missing required fields:', { semester_id: id, name: course.name, code: course.code });
                    throw new Error(`Missing details for course: ${course.name || 'Unknown'}. Name and Code are required.`);
                }

                // Create the course
                const courseRes = await coursesAPI.create({
                    semester_id: parseInt(id),
                    name: course.name,
                    code: course.code,
                    color: course.color
                });

                // Create all schedules for this course
                if (course.schedules && course.schedules.length > 0) {
                    for (const schedule of course.schedules) {
                        await schedulesAPI.create({
                            course_id: courseRes.data.id,
                            day_of_week: schedule.day_of_week,
                            start_time: schedule.start_time,
                            end_time: schedule.end_time,
                            location: schedule.location || ''
                        });
                    }
                }
            }

            alert('Timetable imported successfully!');
            navigate(`/semester/${id}/setup`);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to import timetable');
        } finally {
            setImporting(false);
        }
    };

    const updateCourse = (index, field, value) => {
        const updated = [...editingCourses];
        updated[index][field] = value;
        setEditingCourses(updated);
    };

    const removeCourse = (index) => {
        const updated = [...editingCourses];
        updated.splice(index, 1);
        setEditingCourses(updated);
    };

    const addCourse = () => {
        setEditingCourses([...editingCourses, {
            name: '',
            code: '',
            color: '#f97316',
            schedules: [],
            slot: ''
        }]);
    };

    // Legacy separate schedule functions removed as schedules are now nested within courses

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(`/semester/${id}/setup`)}
                    className="btn-secondary mb-6 flex items-center gap-2"
                >
                    <ChevronLeft size={20} />
                    Back
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles size={32} className="text-primary-400" />
                        <h1 className="text-3xl font-bold">AI-Assisted Timetable Import</h1>
                    </div>
                    <p className="text-gray-400">Upload your documents and let AI extract course and schedule details</p>
                </div>

                {/* Progress Steps */}
                {extractedData && (
                    <div className="glass-card p-4 mb-6">
                        <div className="flex items-center justify-center gap-4">
                            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-primary-400' : 'text-green-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-primary-500' : 'bg-green-500'}`}>
                                    {currentStep === 1 ? '1' : '✓'}
                                </div>
                                <span className="font-medium">Configure Courses</span>
                            </div>
                            <ChevronRight size={20} className="text-gray-500" />
                            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary-400' : 'text-gray-500'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-primary-500' : 'bg-gray-700'}`}>
                                    2
                                </div>
                                <span className="font-medium">Map Schedules</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* API Key Section */}
                {!hasApiKey && (
                    <div className="glass-card p-6 mb-6 border-l-4 border-yellow-500">
                        <div className="flex items-start gap-3">
                            <Key size={24} className="text-yellow-400 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold mb-2">OpenAI API Key Required</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    To use AI extraction, provide your OpenAI API key. It's encrypted and stored securely.
                                </p>

                                {!showApiKeyInput ? (
                                    <button
                                        onClick={() => setShowApiKeyInput(true)}
                                        className="btn-primary"
                                    >
                                        Configure API Key
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="input-field"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={saveApiKey} className="btn-primary">
                                                Save Key
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowApiKeyInput(false);
                                                    setApiKey('');
                                                }}
                                                className="btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                {!extractedData && (
                    <div className="glass-card p-8">
                        <h2 className="text-xl font-semibold mb-6">Upload Timetable</h2>

                        {/* Upload Mode Toggle */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">Upload Mode</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setUploadMode('dual')}
                                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${uploadMode === 'dual'
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-white/20 bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${uploadMode === 'dual' ? 'border-primary-500' : 'border-gray-500'
                                            }`}>
                                            {uploadMode === 'dual' && <div className="w-3 h-3 rounded-full bg-primary-500"></div>}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">Two Files (Recommended)</div>
                                            <div className="text-xs text-gray-400">Semester Announcement + Weekly Schedule</div>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setUploadMode('single')}
                                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${uploadMode === 'single'
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-white/20 bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${uploadMode === 'single' ? 'border-primary-500' : 'border-gray-500'
                                            }`}>
                                            {uploadMode === 'single' && <div className="w-3 h-3 rounded-full bg-primary-500"></div>}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">Single File</div>
                                            <div className="text-xs text-gray-400">Combined Timetable</div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {uploadMode === 'dual' ? (
                                <>
                                    {/* Semester Announcement Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                            <FileText size={16} />
                                            Semester Announcement
                                        </label>
                                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleSemesterAnnouncementChange}
                                                className="hidden"
                                                id="semester-announcement-upload"
                                            />
                                            <label htmlFor="semester-announcement-upload" className="cursor-pointer">
                                                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                                                <p className="text-gray-300 mb-2">
                                                    {semesterAnnouncementFile ? semesterAnnouncementFile.name : 'Click to upload semester announcement'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Contains: Semester info, Course list, Professors
                                                </p>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Weekly Schedule Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                            <Calendar size={16} />
                                            Weekly Course Schedule
                                        </label>
                                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleWeeklyScheduleChange}
                                                className="hidden"
                                                id="weekly-schedule-upload"
                                            />
                                            <label htmlFor="weekly-schedule-upload" className="cursor-pointer">
                                                <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                                                <p className="text-gray-300 mb-2">
                                                    {weeklyScheduleFile ? weeklyScheduleFile.name : 'Click to upload weekly schedule'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Contains: Timetable grid, Days, Times, Locations
                                                </p>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Single File Upload */
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Timetable File (Image or PDF)
                                    </label>
                                    <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleSingleFileChange}
                                            className="hidden"
                                            id="single-file-upload"
                                        />
                                        <label htmlFor="single-file-upload" className="cursor-pointer">
                                            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                                            <p className="text-gray-300 mb-2">
                                                {singleFile ? singleFile.name : 'Click to upload or drag and drop'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                PNG, JPG, GIF or PDF (max 10MB)
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Hints (Optional)
                                </label>
                                <textarea
                                    value={hints}
                                    onChange={(e) => setHints(e.target.value)}
                                    placeholder="e.g., 'Semester starts Jan 1, 2026'"
                                    className="input-field min-h-[100px]"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleUpload}
                                disabled={uploading || !hasApiKey}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="spinner w-5 h-5 border-2"></div>
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Extract with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 1: Course Master Configuration */}
                {extractedData && currentStep === 1 && (
                    <div className="space-y-6">
                        {extractedData.confidence < 0.85 && (
                            <div className="glass-card p-4 border-l-4 border-yellow-500">
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <AlertCircle size={20} />
                                    <span className="font-medium">Low Confidence ({(extractedData.confidence * 100).toFixed(0)}%)</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">
                                    Please verify all extracted information carefully.
                                </p>
                            </div>
                        )}

                        {extractedData.sources && (
                            <div className="glass-card p-4 bg-blue-500/10 border-l-4 border-blue-500">
                                <div className="text-sm text-blue-300">
                                    <strong>Source:</strong> {extractedData.sources.courses === 'semester_announcement' ? 'Semester Announcement' : 'Timetable'}
                                </div>
                            </div>
                        )}

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                Step 1: Configure Course Master ({editingCourses.length} courses)
                            </h3>
                            <p className="text-sm text-gray-400 mb-6">
                                Review and edit the unique courses extracted from your {uploadMode === 'dual' ? 'semester announcement' : 'timetable'}.
                            </p>

                            <div className="space-y-4">
                                {editingCourses.map((course, idx) => (
                                    <div key={idx} className="bg-white/5 p-4 rounded-lg">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-medium">Course {idx + 1}</h4>
                                            <button
                                                onClick={() => removeCourse(idx)}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                            <div className="md:col-span-2 relative">
                                                <input
                                                    type="text"
                                                    placeholder="Course Name (Required)"
                                                    value={course.name}
                                                    onChange={(e) => updateCourse(idx, 'name', e.target.value)}
                                                    className={`input-field w-full ${!course.name ? 'border-red-500 focus:border-red-500' : ''}`}
                                                />
                                                {!course.name && <span className="absolute right-3 top-3 text-red-500 text-xs font-bold">!</span>}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Code"
                                                    value={course.code}
                                                    onChange={(e) => updateCourse(idx, 'code', e.target.value)}
                                                    className={`input-field w-full ${!course.code ? 'border-red-500 focus:border-red-500' : ''}`}
                                                />
                                                {!course.code && <span className="absolute right-3 top-3 text-red-500 text-xs font-bold">!</span>}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Slot (A-Z)"
                                                value={course.slot || ''}
                                                onChange={(e) => updateCourse(idx, 'slot', e.target.value.toUpperCase())}
                                                className="input-field"
                                                maxLength={3}
                                            />
                                            <input
                                                type="color"
                                                value={course.color}
                                                onChange={(e) => updateCourse(idx, 'color', e.target.value)}
                                                className="w-full h-12 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        <p className="text-xs text-gray-500 mt-2">
                                            Slot {course.slot || 'N/A'} • {course.schedules?.length || 0} time slot(s)
                                        </p>
                                    </div>
                                ))}

                                <button
                                    onClick={addCourse}
                                    className="btn-secondary w-full"
                                >
                                    + Add Course
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setExtractedData(null);
                                    setEditingCourses([]);
                                    setEditingSchedules([]);
                                    setSingleFile(null);
                                    setSemesterAnnouncementFile(null);
                                    setWeeklyScheduleFile(null);
                                    setCurrentStep(1);
                                }}
                                className="btn-secondary flex-1"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleImportCourses}
                                disabled={editingCourses.some(c => !c.name || !c.code)}
                                className={`flex-1 flex items-center justify-center gap-2 ${editingCourses.some(c => !c.name || !c.code)
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'btn-primary'
                                    }`}
                                title={editingCourses.some(c => !c.name || !c.code) ? "Please fill all Course Names and Codes" : ""}
                            >
                                Next: Map Schedules
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Schedule Mapping (Course-Centric) */}
                {extractedData && currentStep === 2 && (
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                Step 2: Review Schedule Slots
                            </h3>
                            <p className="text-sm text-gray-400 mb-6">
                                Review and edit time slots for each course. Each course can have multiple weekly time slots.
                            </p>

                            <div className="space-y-6">
                                {editingCourses.map((course, courseIdx) => (
                                    <div key={courseIdx} className="bg-white/5 p-5 rounded-lg border border-white/10">
                                        {/* Course Header */}
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                            <div>
                                                <h4 className="font-semibold text-lg">
                                                    {course.code} - {course.name}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Slot {course.slot} • {course.schedules?.length || 0} time slot(s)
                                                </p>
                                            </div>
                                            <div
                                                className="w-8 h-8 rounded-full"
                                                style={{ backgroundColor: course.color }}
                                            ></div>
                                        </div>

                                        {/* Schedules for this course */}
                                        <div className="space-y-3">
                                            {course.schedules && course.schedules.length > 0 ? (
                                                course.schedules.map((schedule, schedIdx) => (
                                                    <div key={schedIdx} className="bg-white/5 p-3 rounded border border-white/5">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-medium text-gray-300">
                                                                Time Slot {schedIdx + 1}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = [...editingCourses];
                                                                    updated[courseIdx].schedules.splice(schedIdx, 1);
                                                                    setEditingCourses(updated);
                                                                }}
                                                                className="text-red-400 hover:text-red-300 text-xs"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                            <select
                                                                value={schedule.day_of_week}
                                                                onChange={(e) => {
                                                                    const updated = [...editingCourses];
                                                                    updated[courseIdx].schedules[schedIdx].day_of_week = parseInt(e.target.value);
                                                                    setEditingCourses(updated);
                                                                }}
                                                                className="input-field text-sm"
                                                            >
                                                                {DAYS.map((day, i) => i > 0 && (
                                                                    <option key={i} value={i}>{day}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="time"
                                                                value={schedule.start_time}
                                                                onChange={(e) => {
                                                                    const updated = [...editingCourses];
                                                                    updated[courseIdx].schedules[schedIdx].start_time = e.target.value;
                                                                    setEditingCourses(updated);
                                                                }}
                                                                className="input-field text-sm"
                                                            />
                                                            <input
                                                                type="time"
                                                                value={schedule.end_time}
                                                                onChange={(e) => {
                                                                    const updated = [...editingCourses];
                                                                    updated[courseIdx].schedules[schedIdx].end_time = e.target.value;
                                                                    setEditingCourses(updated);
                                                                }}
                                                                className="input-field text-sm"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Location"
                                                                value={schedule.location || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...editingCourses];
                                                                    updated[courseIdx].schedules[schedIdx].location = e.target.value;
                                                                    setEditingCourses(updated);
                                                                }}
                                                                className="input-field text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No time slots for this course</p>
                                            )}

                                            {/* Add Schedule Button */}
                                            <button
                                                onClick={() => {
                                                    const updated = [...editingCourses];
                                                    if (!updated[courseIdx].schedules) {
                                                        updated[courseIdx].schedules = [];
                                                    }
                                                    updated[courseIdx].schedules.push({
                                                        day_of_week: 1,
                                                        start_time: '09:00',
                                                        end_time: '10:00',
                                                        location: ''
                                                    });
                                                    setEditingCourses(updated);
                                                }}
                                                className="btn-secondary w-full text-sm"
                                            >
                                                + Add Time Slot
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={20} />
                                Back to Courses
                            </button>
                            <button
                                onClick={handleImportAll}
                                disabled={importing}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <div className="spinner w-5 h-5 border-2"></div>
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Import Timetable
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
