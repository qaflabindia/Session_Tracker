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
    const timezone = semester.timezone || 'UTC';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });

    // Overall analytics (Total + To Date)
    const overall = db.prepare(`
      SELECT 
        -- Total Semester Stats
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,

        -- To Date Stats
        SUM(CASE WHEN date <= ? THEN 1 ELSE 0 END) as total_sessions_todate,
        SUM(CASE WHEN date <= ? AND status = 'attended' THEN 1 ELSE 0 END) as attended_todate,
        SUM(CASE WHEN date <= ? AND status = 'missed' THEN 1 ELSE 0 END) as missed_todate,
        SUM(CASE WHEN date <= ? AND status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_todate,
        SUM(CASE WHEN date <= ? AND status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_todate
      FROM sessions
      WHERE semester_id = ?
    `).get(today, today, today, today, today, semesterId);

    // Helper to calc percent
    const calcPercent = (attended, total, cancelled) => {
      const valid = total - cancelled;
      return valid > 0 ? ((attended / valid) * 100).toFixed(2) : 0;
    };

    const overallStats = {
      total: {
        total_sessions: overall.total_sessions || 0,
        attended: overall.attended || 0,
        missed: overall.missed || 0,
        cancelled: overall.cancelled || 0,
        scheduled: overall.scheduled || 0,
        attendance_percentage: parseFloat(calcPercent(overall.attended || 0, overall.total_sessions || 0, overall.cancelled || 0))
      },
      to_date: {
        total_sessions: overall.total_sessions_todate || 0,
        attended: overall.attended_todate || 0,
        missed: overall.missed_todate || 0,
        cancelled: overall.cancelled_todate || 0,
        scheduled: overall.scheduled_todate || 0,
        attendance_percentage: parseFloat(calcPercent(overall.attended_todate || 0, overall.total_sessions_todate || 0, overall.cancelled_todate || 0))
      }
    };

    // Per-course analytics
    const perCourse = db.prepare(`
      SELECT 
        c.id, c.name, c.code, c.color,
        -- Total
        COUNT(s.id) as total_sessions,
        SUM(CASE WHEN s.status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN s.status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN s.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        
        -- To Date
        SUM(CASE WHEN s.date <= ? THEN 1 ELSE 0 END) as total_sessions_todate,
        SUM(CASE WHEN s.date <= ? AND s.status = 'attended' THEN 1 ELSE 0 END) as attended_todate,
        SUM(CASE WHEN s.date <= ? AND s.status = 'missed' THEN 1 ELSE 0 END) as missed_todate,
        SUM(CASE WHEN s.date <= ? AND s.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_todate
      FROM courses c
      LEFT JOIN sessions s ON c.id = s.course_id
      WHERE c.semester_id = ?
      GROUP BY c.id
    `).all(today, today, today, today, semesterId);

    console.log('Analytics Debug - PerCourse Count:', perCourse.length);

    const courseAnalytics = perCourse.map(course => ({
      id: course.id,
      name: course.name,
      code: course.code,
      color: course.color,
      total: {
        total_sessions: course.total_sessions || 0,
        attended: course.attended || 0,
        missed: course.missed || 0,
        cancelled: course.cancelled || 0,
        attendance_percentage: parseFloat(calcPercent(course.attended || 0, course.total_sessions || 0, course.cancelled || 0))
      },
      to_date: {
        total_sessions: course.total_sessions_todate || 0,
        attended: course.attended_todate || 0,
        missed: course.missed_todate || 0,
        cancelled: course.cancelled_todate || 0,
        attendance_percentage: parseFloat(calcPercent(course.attended_todate || 0, course.total_sessions_todate || 0, course.cancelled_todate || 0))
      }
    }));

    // Day of week heatmap
    const dayOfWeek = db.prepare(`
      SELECT 
        CAST(strftime('%w', date) AS INTEGER) as day_of_week,
        -- Total
        COUNT(*) as total,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
        -- To Date
        SUM(CASE WHEN date <= ? THEN 1 ELSE 0 END) as total_todate,
        SUM(CASE WHEN date <= ? AND status = 'attended' THEN 1 ELSE 0 END) as attended_todate
      FROM sessions
      WHERE semester_id = ? AND status != 'cancelled'
      GROUP BY day_of_week
      ORDER BY day_of_week
    `).all(today, today, semesterId);

    const heatmapTotal = dayOfWeek.map(day => ({
      day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.day_of_week],
      total: day.total,
      attended: day.attended
    }));

    const heatmapToDate = dayOfWeek.map(day => ({
      day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.day_of_week],
      total: day.total_todate,
      attended: day.attended_todate
    }));

    const dayHeatmap = {
      total: heatmapTotal,
      to_date: heatmapToDate
    };

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
      cancelled: overallStats.total.cancelled,
      missed: overallStats.total.missed,
      ratio: overallStats.total.missed > 0 ? (overallStats.total.cancelled / overallStats.total.missed).toFixed(2) : 0
    };

    res.json({
      overall: overallStats,
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
