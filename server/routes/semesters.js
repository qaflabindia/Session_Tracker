const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { addDays, parseISO, format, getDay } = require('date-fns');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all semesters for user
router.get('/', (req, res) => {
    try {
        const semesters = db.prepare(
            'SELECT * FROM semesters WHERE user_id = ? ORDER BY start_date DESC'
        ).all(req.user.userId);

        res.json(semesters);
    } catch (error) {
        console.error('Get semesters error:', error);
        res.status(500).json({ error: 'Failed to fetch semesters' });
    }
});

// Get single semester
router.get('/:id', (req, res) => {
    try {
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(req.params.id, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        res.json(semester);
    } catch (error) {
        console.error('Get semester error:', error);
        res.status(500).json({ error: 'Failed to fetch semester' });
    }
});

// Create semester
router.post('/', (req, res) => {
    try {
        const { name, start_date, end_date, timezone = 'UTC' } = req.body;

        if (!name || !start_date || !end_date) {
            return res.status(400).json({ error: 'Name, start_date, and end_date are required' });
        }

        const result = db.prepare(
            'INSERT INTO semesters (user_id, name, start_date, end_date, timezone) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.userId, name, start_date, end_date, timezone);

        const semester = db.prepare('SELECT * FROM semesters WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(semester);
    } catch (error) {
        console.error('Create semester error:', error);
        res.status(500).json({ error: 'Failed to create semester' });
    }
});

// Update semester
router.put('/:id', (req, res) => {
    try {
        const { name, start_date, end_date, timezone } = req.body;

        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(req.params.id, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        // Check if any schedules are locked
        const lockedSchedules = db.prepare(`
      SELECT COUNT(*) as count FROM weekly_schedules ws
      JOIN courses c ON ws.course_id = c.id
      WHERE c.semester_id = ? AND ws.locked = 1
    `).get(req.params.id);

        if (lockedSchedules.count > 0) {
            return res.status(400).json({
                error: 'Cannot update semester with locked schedules. Rebuild semester first.'
            });
        }

        db.prepare(
            'UPDATE semesters SET name = ?, start_date = ?, end_date = ?, timezone = ? WHERE id = ?'
        ).run(
            name || semester.name,
            start_date || semester.start_date,
            end_date || semester.end_date,
            timezone || semester.timezone,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM semesters WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        console.error('Update semester error:', error);
        res.status(500).json({ error: 'Failed to update semester' });
    }
});

// Delete semester
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare(
            'DELETE FROM semesters WHERE id = ? AND user_id = ?'
        ).run(req.params.id, req.user.userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        res.json({ message: 'Semester deleted successfully' });
    } catch (error) {
        console.error('Delete semester error:', error);
        res.status(500).json({ error: 'Failed to delete semester' });
    }
});

// Propagate schedule (generate sessions from weekly schedules)
router.post('/:id/propagate', (req, res) => {
    try {
        const semesterId = req.params.id;

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        // Get all courses for this semester
        const courses = db.prepare(
            'SELECT * FROM courses WHERE semester_id = ?'
        ).all(semesterId);

        if (courses.length === 0) {
            return res.status(400).json({ error: 'No courses found for this semester' });
        }

        // Get all weekly schedules for these courses
        const courseIds = courses.map(c => c.id);
        const placeholders = courseIds.map(() => '?').join(',');
        const weeklySchedules = db.prepare(
            `SELECT * FROM weekly_schedules WHERE course_id IN (${placeholders})`
        ).all(...courseIds);

        if (weeklySchedules.length === 0) {
            return res.status(400).json({ error: 'No weekly schedules found' });
        }

        // Get holidays for this semester
        const holidays = db.prepare(
            'SELECT date FROM holidays WHERE semester_id = ?'
        ).all(semesterId);
        const holidayDates = new Set(holidays.map(h => h.date));

        // Begin transaction
        const propagate = db.transaction(() => {
            let sessionCount = 0;
            const startDate = parseISO(semester.start_date);
            const endDate = parseISO(semester.end_date);

            // Iterate through each day in the semester
            let currentDate = startDate;
            while (currentDate <= endDate) {
                const dayOfWeek = getDay(currentDate);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                // Skip holidays
                if (!holidayDates.has(dateStr)) {
                    // Find weekly schedules for this day
                    const schedulesForDay = weeklySchedules.filter(ws => ws.day_of_week === dayOfWeek);

                    for (const schedule of schedulesForDay) {
                        // Create session
                        db.prepare(`
              INSERT INTO sessions (course_id, semester_id, date, start_time, end_time, status)
              VALUES (?, ?, ?, ?, ?, 'scheduled')
            `).run(schedule.course_id, semesterId, dateStr, schedule.start_time, schedule.end_time);

                        sessionCount++;
                    }
                }

                currentDate = addDays(currentDate, 1);
            }

            // Lock all weekly schedules
            db.prepare(`
        UPDATE weekly_schedules 
        SET locked = 1 
        WHERE course_id IN (${placeholders})
      `).run(...courseIds);

            return sessionCount;
        });

        const sessionCount = propagate();

        res.json({
            message: 'Schedule propagated successfully',
            sessionsCreated: sessionCount
        });
    } catch (error) {
        console.error('Propagate schedule error:', error);
        res.status(500).json({ error: 'Failed to propagate schedule' });
    }
});

// Rebuild semester (destructive operation)
router.post('/:id/rebuild', (req, res) => {
    try {
        const semesterId = req.params.id;
        const { confirm } = req.body;

        if (confirm !== 'REBUILD') {
            return res.status(400).json({
                error: 'Confirmation required. Send { "confirm": "REBUILD" }'
            });
        }

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        const rebuild = db.transaction(() => {
            // Delete all sessions for this semester
            db.prepare('DELETE FROM sessions WHERE semester_id = ?').run(semesterId);

            // Unlock all weekly schedules
            db.prepare(`
        UPDATE weekly_schedules 
        SET locked = 0 
        WHERE course_id IN (
          SELECT id FROM courses WHERE semester_id = ?
        )
      `).run(semesterId);
        });

        rebuild();

        res.json({ message: 'Semester rebuilt successfully. You can now propagate the schedule again.' });
    } catch (error) {
        console.error('Rebuild semester error:', error);
        res.status(500).json({ error: 'Failed to rebuild semester' });
    }
});

module.exports = router;
