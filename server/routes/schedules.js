const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get weekly schedules for a course
router.get('/course/:courseId', (req, res) => {
    try {
        // Verify course ownership
        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(req.params.courseId, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const schedules = db.prepare(
            'SELECT * FROM weekly_schedules WHERE course_id = ? ORDER BY day_of_week, start_time'
        ).all(req.params.courseId);

        res.json(schedules);
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// Create weekly schedule
router.post('/', (req, res) => {
    try {
        const { course_id, day_of_week, start_time, end_time, location } = req.body;

        if (course_id === undefined || day_of_week === undefined || !start_time || !end_time) {
            return res.status(400).json({
                error: 'course_id, day_of_week, start_time, and end_time are required'
            });
        }

        if (day_of_week < 0 || day_of_week > 6) {
            return res.status(400).json({ error: 'day_of_week must be between 0 and 6' });
        }

        // Verify course ownership
        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(course_id, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check if already locked
        const existingLocked = db.prepare(
            'SELECT COUNT(*) as count FROM weekly_schedules WHERE course_id = ? AND locked = 1'
        ).get(course_id);

        if (existingLocked.count > 0) {
            return res.status(400).json({
                error: 'Cannot modify locked schedule. Rebuild semester first.'
            });
        }

        const result = db.prepare(
            'INSERT INTO weekly_schedules (course_id, day_of_week, start_time, end_time, location) VALUES (?, ?, ?, ?, ?)'
        ).run(course_id, day_of_week, start_time, end_time, location);

        const schedule = db.prepare('SELECT * FROM weekly_schedules WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

// Update weekly schedule
router.put('/:id', (req, res) => {
    try {
        const { day_of_week, start_time, end_time, location } = req.body;

        const schedule = db.prepare(`
      SELECT ws.* FROM weekly_schedules ws
      JOIN courses c ON ws.course_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      WHERE ws.id = ? AND s.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        if (schedule.locked) {
            return res.status(400).json({
                error: 'Cannot modify locked schedule. Rebuild semester first.'
            });
        }

        db.prepare(
            'UPDATE weekly_schedules SET day_of_week = ?, start_time = ?, end_time = ?, location = ? WHERE id = ?'
        ).run(
            day_of_week !== undefined ? day_of_week : schedule.day_of_week,
            start_time || schedule.start_time,
            end_time || schedule.end_time,
            location !== undefined ? location : schedule.location,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM weekly_schedules WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

// Delete weekly schedule
router.delete('/:id', (req, res) => {
    try {
        const schedule = db.prepare(`
      SELECT ws.* FROM weekly_schedules ws
      JOIN courses c ON ws.course_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      WHERE ws.id = ? AND s.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        if (schedule.locked) {
            return res.status(400).json({
                error: 'Cannot delete locked schedule. Rebuild semester first.'
            });
        }

        db.prepare('DELETE FROM weekly_schedules WHERE id = ?').run(req.params.id);

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// Add holiday
router.post('/holidays', (req, res) => {
    try {
        const { semester_id, date, description } = req.body;

        if (!semester_id || !date) {
            return res.status(400).json({ error: 'semester_id and date are required' });
        }

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semester_id, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        const result = db.prepare(
            'INSERT INTO holidays (semester_id, date, description) VALUES (?, ?, ?)'
        ).run(semester_id, date, description);

        const holiday = db.prepare('SELECT * FROM holidays WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(holiday);
    } catch (error) {
        console.error('Add holiday error:', error);
        res.status(500).json({ error: 'Failed to add holiday' });
    }
});

// Get holidays for semester
router.get('/holidays/semester/:semesterId', (req, res) => {
    try {
        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(req.params.semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        const holidays = db.prepare(
            'SELECT * FROM holidays WHERE semester_id = ? ORDER BY date'
        ).all(req.params.semesterId);

        res.json(holidays);
    } catch (error) {
        console.error('Get holidays error:', error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

module.exports = router;
