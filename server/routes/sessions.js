const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { addHours, parseISO, addWeeks, isAfter, format, getDay } = require('date-fns');

const router = express.Router();
router.use(authMiddleware);

// Create session (adhoc or recurring)
router.post('/', (req, res) => {
    try {
        const { semester_id, course_id, date, start_time, end_time, repeat_weekly, repeat_until } = req.body;

        if (!semester_id || !course_id || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify bounds
        const semester = db.prepare('SELECT * FROM semesters WHERE id = ? AND user_id = ?').get(semester_id, req.user.userId);
        if (!semester) return res.status(404).json({ error: 'Semester not found' });

        const course = db.prepare('SELECT * FROM courses WHERE id = ? AND semester_id = ?').get(course_id, semester_id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const createSessions = db.transaction(() => {
            const insert = db.prepare(`
                INSERT INTO sessions (semester_id, course_id, date, start_time, end_time, status)
                VALUES (?, ?, ?, ?, ?, 'scheduled')
            `);

            // 1. Insert the primary session
            insert.run(semester_id, course_id, date, start_time, end_time);

            // 2. Propagate if requested
            if (repeat_weekly) {
                let currentDate = addWeeks(parseISO(date), 1);
                // Use provided repeat_until or default to semester end date
                let endDate = repeat_until ? parseISO(repeat_until) : parseISO(semester.end_date);

                // Ensure we don't go past the semester end date
                if (isAfter(endDate, parseISO(semester.end_date))) {
                    endDate = parseISO(semester.end_date);
                }

                while (!isAfter(currentDate, endDate)) {
                    insert.run(
                        semester_id,
                        course_id,
                        format(currentDate, 'yyyy-MM-dd'),
                        start_time,
                        end_time
                    );
                    currentDate = addWeeks(currentDate, 1);
                }
            }
        });

        createSessions();
        res.json({ message: 'Session(s) created successfully' });

    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Delete session (single or series)
router.delete('/:id', (req, res) => {
    try {
        const { mode } = req.query; // 'single' or 'future'

        const session = db.prepare(`
            SELECT s.* FROM sessions s
            JOIN semesters sem ON s.semester_id = sem.id
            WHERE s.id = ? AND sem.user_id = ?
        `).get(req.params.id, req.user.userId);

        if (!session) return res.status(404).json({ error: 'Session not found' });

        const deleteOp = db.transaction(() => {
            if (mode === 'future') {
                console.log(`[DELETE] Starting future delete for session ${session.id}, date: ${session.date}`);

                // Delete this session and all future sessions of same course/time AND Same Day of Week
                // We use SQL strftime('%w', date) to ensure we match the day of week reliably

                // Find all candidates and delete them in one go
                const result = db.prepare(`
                    DELETE FROM sessions 
                    WHERE course_id = ? 
                    AND start_time = ? 
                    AND end_time = ? 
                    AND date >= ?
                    AND semester_id = ?
                    AND strftime('%w', date) = strftime('%w', ?)
                `).run(session.course_id, session.start_time, session.end_time, session.date, session.semester_id, session.date);

                console.log(`[DELETE] Deleted ${result.changes} sessions`);

            } else {
                // Single delete
                db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
            }
        });

        deleteOp();
        res.json({ message: 'Session(s) deleted successfully' });

    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});
router.get('/', (req, res) => {
    try {
        const { semester_id, start_date, end_date, course_id, status } = req.query;

        if (!semester_id) {
            return res.status(400).json({ error: 'semester_id is required' });
        }

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semester_id, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        let query = `
      SELECT s.*, c.name as course_name, c.code as course_code, c.color as course_color
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.semester_id = ?
    `;
        const params = [semester_id];

        if (start_date) {
            query += ' AND s.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND s.date <= ?';
            params.push(end_date);
        }

        if (course_id) {
            query += ' AND s.course_id = ?';
            params.push(course_id);
        }

        if (status) {
            query += ' AND s.status = ?';
            params.push(status);
        }

        query += ' ORDER BY s.date, s.start_time';

        const sessions = db.prepare(query).all(...params);

        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get single session
router.get('/:id', (req, res) => {
    try {
        const session = db.prepare(`
      SELECT s.*, c.name as course_name, c.code as course_code, c.color as course_color
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.id = ? AND sem.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Mark attendance for a session
router.post('/:id/mark', (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['attended', 'missed', 'cancelled', 'scheduled'].includes(status)) {
            return res.status(400).json({
                error: 'Valid status is required (attended, missed, cancelled, scheduled)'
            });
        }

        const session = db.prepare(`
      SELECT s.* FROM sessions s
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.id = ? AND sem.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const markAttendance = db.transaction(() => {
            // Create audit entry
            db.prepare(`
        INSERT INTO attendance_audits (session_id, previous_status, new_status, source)
        VALUES (?, ?, ?, 'manual')
      `).run(req.params.id, session.status, status);

            // Update session
            db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, req.params.id);
        });

        markAttendance();

        const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);

        res.json(updated);
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// Bulk update sessions
router.post('/bulk-update', (req, res) => {
    try {
        const { session_ids, status } = req.body;

        if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
            return res.status(400).json({ error: 'session_ids array is required' });
        }

        if (session_ids.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 sessions can be updated at once' });
        }

        if (!status || !['attended', 'missed', 'cancelled', 'scheduled'].includes(status)) {
            return res.status(400).json({
                error: 'Valid status is required (attended, missed, cancelled, scheduled)'
            });
        }

        // Verify all sessions belong to user
        const placeholders = session_ids.map(() => '?').join(',');
        const sessions = db.prepare(`
      SELECT s.* FROM sessions s
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.id IN (${placeholders}) AND sem.user_id = ?
    `).all(...session_ids, req.user.userId);

        if (sessions.length !== session_ids.length) {
            return res.status(404).json({ error: 'Some sessions not found' });
        }

        const bulkUpdate = db.transaction(() => {
            // Create bulk operation record
            const undoUntil = addHours(new Date(), 24).toISOString();
            const bulkOpResult = db.prepare(`
        INSERT INTO bulk_operations (user_id, affected_sessions_count, operation_type, operation_data, undo_available_until)
        VALUES (?, ?, 'bulk_update', ?, ?)
      `).run(req.user.userId, sessions.length, JSON.stringify({ session_ids, status }), undoUntil);

            // Update each session and create audit entries
            for (const session of sessions) {
                db.prepare(`
          INSERT INTO attendance_audits (session_id, previous_status, new_status, source)
          VALUES (?, ?, ?, 'bulk')
        `).run(session.id, session.status, status);

                db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, session.id);
            }

            return bulkOpResult.lastInsertRowid;
        });

        const bulkOpId = bulkUpdate();

        res.json({
            message: 'Bulk update successful',
            bulk_operation_id: bulkOpId,
            affected_count: sessions.length
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    }
});

// Undo bulk operation
router.post('/bulk/:bulkOpId/undo', (req, res) => {
    try {
        const bulkOp = db.prepare(`
      SELECT * FROM bulk_operations 
      WHERE id = ? AND user_id = ?
    `).get(req.params.bulkOpId, req.user.userId);

        if (!bulkOp) {
            return res.status(404).json({ error: 'Bulk operation not found' });
        }

        const now = new Date();
        const undoUntil = parseISO(bulkOp.undo_available_until);

        if (now > undoUntil) {
            return res.status(400).json({ error: 'Undo window has expired' });
        }

        const operationData = JSON.parse(bulkOp.operation_data);
        const { session_ids } = operationData;

        const undo = db.transaction(() => {
            // Get the previous statuses from audit trail
            const placeholders = session_ids.map(() => '?').join(',');
            const audits = db.prepare(`
        SELECT session_id, previous_status 
        FROM attendance_audits 
        WHERE session_id IN (${placeholders}) AND source = 'bulk'
        ORDER BY timestamp DESC
      `).all(...session_ids);

            // Revert each session
            for (const audit of audits) {
                db.prepare(`
          INSERT INTO attendance_audits (session_id, previous_status, new_status, source)
          VALUES (?, (SELECT status FROM sessions WHERE id = ?), ?, 'undo')
        `).run(audit.session_id, audit.session_id, audit.previous_status);

                db.prepare('UPDATE sessions SET status = ? WHERE id = ?')
                    .run(audit.previous_status, audit.session_id);
            }

            // Mark bulk operation as undone
            db.prepare('DELETE FROM bulk_operations WHERE id = ?').run(req.params.bulkOpId);
        });

        undo();

        res.json({ message: 'Bulk operation undone successfully' });
    } catch (error) {
        console.error('Undo bulk operation error:', error);
        res.status(500).json({ error: 'Failed to undo bulk operation' });
    }
});

// Get recent bulk operations
router.get('/bulk/recent', (req, res) => {
    try {
        const bulkOps = db.prepare(`
      SELECT * FROM bulk_operations 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all(req.user.userId);

        res.json(bulkOps);
    } catch (error) {
        console.error('Get bulk operations error:', error);
        res.status(500).json({ error: 'Failed to fetch bulk operations' });
    }
});

// Get audit trail for a session
router.get('/:id/audit', (req, res) => {
    try {
        const session = db.prepare(`
      SELECT s.* FROM sessions s
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.id = ? AND sem.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const audits = db.prepare(`
      SELECT * FROM attendance_audits 
      WHERE session_id = ? 
      ORDER BY timestamp DESC
    `).all(req.params.id);

        res.json(audits);
    } catch (error) {
        console.error('Get audit trail error:', error);
        res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
});

module.exports = router;
