const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all courses for a semester
router.get('/semester/:semesterId', (req, res) => {
    try {
        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(req.params.semesterId, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        const courses = db.prepare(
            'SELECT * FROM courses WHERE semester_id = ? ORDER BY name'
        ).all(req.params.semesterId);

        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get single course
router.get('/:id', (req, res) => {
    try {
        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Create course
router.post('/', (req, res) => {
    try {
        const { semester_id, name, code, professor, color = '#0ea5e9' } = req.body;

        if (!semester_id || !name || !code) {
            return res.status(400).json({ error: 'semester_id, name, and code are required' });
        }

        // Verify semester ownership
        const semester = db.prepare(
            'SELECT * FROM semesters WHERE id = ? AND user_id = ?'
        ).get(semester_id, req.user.userId);

        if (!semester) {
            return res.status(404).json({ error: 'Semester not found' });
        }

        const result = db.prepare(
            'INSERT INTO courses (semester_id, name, code, professor, color) VALUES (?, ?, ?, ?, ?)'
        ).run(semester_id, name, code, professor, color);

        const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(course);
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

// Update course
router.put('/:id', (req, res) => {
    try {
        const { name, code, professor, color } = req.body;

        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        db.prepare(
            'UPDATE courses SET name = ?, code = ?, professor = ?, color = ? WHERE id = ?'
        ).run(
            name || course.name,
            code || course.code,
            professor !== undefined ? professor : course.professor,
            color || course.color,
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

// Delete course
router.delete('/:id', (req, res) => {
    try {
        const course = db.prepare(`
      SELECT c.* FROM courses c
      JOIN semesters s ON c.semester_id = s.id
      WHERE c.id = ? AND s.user_id = ?
    `).get(req.params.id, req.user.userId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

module.exports = router;
