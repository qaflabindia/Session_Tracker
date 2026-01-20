const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { format } = require('date-fns');

const router = express.Router();
router.use(authMiddleware);

// Export semester data as CSV
router.get('/semester/:semesterId/csv', (req, res) => {
    try {
        const semesterId = req.params.semesterId;

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        // Get all sessions with course info
        const sessions = db.prepare(`
      SELECT 
        s.date,
        s.start_time,
        s.end_time,
        s.status,
        c.name as course_name,
        c.code as course_code,
        c.professor
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.semester_id = ?
      ORDER BY s.date, s.start_time
    `).all(semesterId);

        // Generate CSV
        const headers = ['Date', 'Course Code', 'Course Name', 'Professor', 'Start Time', 'End Time', 'Status'];
        const rows = sessions.map(s => [
            s.date,
            s.course_code,
            s.course_name,
            s.professor || '',
            s.start_time,
            s.end_time,
            s.status
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${semester.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ error: 'Failed to export CSV' });
    }
});

// Export semester data as JSON (for PDF generation on frontend)
router.get('/semester/:semesterId/data', (req, res) => {
    try {
        const semesterId = req.params.semesterId;

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        // Get user info
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.userId);

        // Get courses
        const courses = db.prepare(`
      SELECT 
        c.*,
        COUNT(s.id) as total_sessions,
        SUM(CASE WHEN s.status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN s.status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM courses c
      LEFT JOIN sessions s ON c.id = s.course_id
      WHERE c.semester_id = ?
      GROUP BY c.id
    `).all(semesterId);

        // Get all sessions
        const sessions = db.prepare(`
      SELECT 
        s.*,
        c.name as course_name,
        c.code as course_code,
        c.color as course_color
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.semester_id = ?
      ORDER BY s.date, s.start_time
    `).all(semesterId);

        // Calculate overall stats
        const overall = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM sessions
      WHERE semester_id = ?
    `).get(semesterId);

        const validSessions = overall.total_sessions - overall.cancelled;
        const attendancePercentage = validSessions > 0
            ? ((overall.attended / validSessions) * 100).toFixed(2)
            : 0;

        res.json({
            export_metadata: {
                generated_at: new Date().toISOString(),
                export_id: `${semesterId}-${Date.now()}`,
                disclaimer: 'This is a self-reported attendance record and has not been externally verified.'
            },
            user: {
                email: user.email
            },
            semester: semester,
            overall_statistics: {
                ...overall,
                attendance_percentage: parseFloat(attendancePercentage)
            },
            courses: courses.map(c => ({
                ...c,
                attendance_percentage: (c.total_sessions - c.cancelled) > 0
                    ? ((c.attended / (c.total_sessions - c.cancelled)) * 100).toFixed(2)
                    : 0
            })),
            sessions: sessions
        });
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

module.exports = router;
