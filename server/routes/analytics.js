const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get analytics for a semester
router.get('/semester/:semesterId', (req, res) => {
    try {
        const semesterId = req.params.semesterId;

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        // Overall attendance percentage
        const overall = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
      FROM sessions
      WHERE semester_id = ?
    `).get(semesterId);

        const attendancePercentage = overall.total_sessions > 0
            ? ((overall.attended / (overall.total_sessions - overall.cancelled)) * 100).toFixed(2)
            : 0;

        // Per-course analytics
        const perCourse = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.color,
        COUNT(s.id) as total_sessions,
        SUM(CASE WHEN s.status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN s.status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN s.status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
      FROM courses c
      LEFT JOIN sessions s ON c.id = s.course_id
      WHERE c.semester_id = ?
      GROUP BY c.id
    `).all(semesterId);

        const courseAnalytics = perCourse.map(course => {
            const validSessions = course.total_sessions - course.cancelled;
            const percentage = validSessions > 0
                ? ((course.attended / validSessions) * 100).toFixed(2)
                : 0;

            return {
                ...course,
                attendance_percentage: parseFloat(percentage)
            };
        });

        // Day of week heatmap
        const dayOfWeek = db.prepare(`
      SELECT 
        CAST(strftime('%w', date) AS INTEGER) as day_of_week,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM sessions
      WHERE semester_id = ? AND status != 'cancelled'
      GROUP BY day_of_week
      ORDER BY day_of_week
    `).all(semesterId);

        const dayHeatmap = dayOfWeek.map(day => ({
            day: day.day_of_week,
            day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.day_of_week],
            total: day.total,
            attended: day.attended,
            percentage: day.total > 0 ? ((day.attended / day.total) * 100).toFixed(2) : 0
        }));

        // Time slot density
        const timeSlots = db.prepare(`
      SELECT 
        start_time,
        COUNT(*) as session_count,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended_count
      FROM sessions
      WHERE semester_id = ? AND status != 'cancelled'
      GROUP BY start_time
      ORDER BY start_time
    `).all(semesterId);

        // Cancelled vs Missed ratio
        const cancelledVsMissed = {
            cancelled: overall.cancelled,
            missed: overall.missed,
            ratio: overall.missed > 0 ? (overall.cancelled / overall.missed).toFixed(2) : 0
        };

        res.json({
            overall: {
                ...overall,
                attendance_percentage: parseFloat(attendancePercentage)
            },
            by_course: courseAnalytics,
            day_heatmap: dayHeatmap,
            time_slots: timeSlots,
            cancelled_vs_missed: cancelledVsMissed
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get analytics for a specific course
router.get('/course/:courseId', (req, res) => {
    try {
        const courseId = req.params.courseId;

        // Verify course ownership
        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(courseId, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Course statistics
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
      FROM sessions
      WHERE course_id = ?
    `).get(courseId);

        const validSessions = stats.total_sessions - stats.cancelled;
        const attendancePercentage = validSessions > 0
            ? ((stats.attended / validSessions) * 100).toFixed(2)
            : 0;

        // Weekly trend
        const weeklyTrend = db.prepare(`
      SELECT 
        strftime('%Y-%W', date) as week,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended
      FROM sessions
      WHERE course_id = ? AND status != 'cancelled'
      GROUP BY week
      ORDER BY week
    `).all(courseId);

        res.json({
            course: {
                id: course.id,
                name: course.name,
                code: course.code
            },
            statistics: {
                ...stats,
                attendance_percentage: parseFloat(attendancePercentage)
            },
            weekly_trend: weeklyTrend
        });
    } catch (error) {
        console.error('Get course analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch course analytics' });
    }
});

module.exports = router;
