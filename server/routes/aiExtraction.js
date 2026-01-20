const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const AITimetableParser = require('../services/aiParser');
const { getDecryptedApiKey } = require('./apiKeys');

const router = express.Router();
router.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'timetable-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'));
        }
    }
});

// Upload and parse timetable (supports single OR dual file upload)
router.post('/parse', upload.fields([
    { name: 'timetable', maxCount: 1 },
    { name: 'semesterAnnouncement', maxCount: 1 },
    { name: 'weeklySchedule', maxCount: 1 }
]), async (req, res) => {
    try {
        const files = req.files;

        // Check if we have files
        const hasSingleFile = files && files.timetable && files.timetable[0];
        const hasDualFiles = files && files.semesterAnnouncement && files.weeklySchedule &&
            files.semesterAnnouncement[0] && files.weeklySchedule[0];

        if (!hasSingleFile && !hasDualFiles) {
            return res.status(400).json({
                error: 'Please upload either a single timetable file OR both semester announcement and weekly schedule files'
            });
        }

        // Get user's API key
        const apiKey = getDecryptedApiKey(req.user.userId);
        if (!apiKey) {
            // Clean up uploaded files
            if (hasSingleFile) fs.unlinkSync(files.timetable[0].path);
            if (hasDualFiles) {
                fs.unlinkSync(files.semesterAnnouncement[0].path);
                fs.unlinkSync(files.weeklySchedule[0].path);
            }
            return res.status(400).json({
                error: 'OpenAI API key not configured. Please set your API key first.'
            });
        }

        const parser = new AITimetableParser(apiKey);
        const userHints = req.body.hints || '';

        let extracted;
        let uploadedFiles = [];

        if (hasDualFiles) {
            // TWO-FILE MODE: Semester Announcement + Weekly Schedule
            console.log('Processing two-file upload');
            const semesterPath = files.semesterAnnouncement[0].path;
            const schedulePath = files.weeklySchedule[0].path;
            uploadedFiles = [semesterPath, schedulePath];

            extracted = await parser.parseMultipleDocuments(semesterPath, schedulePath, userHints);
        } else {
            // SINGLE-FILE MODE: Traditional timetable (backward compatible)
            console.log('Processing single-file upload');
            const filePath = files.timetable[0].path;
            const fileExt = path.extname(files.timetable[0].originalname).toLowerCase();
            uploadedFiles = [filePath];

            if (fileExt === '.pdf') {
                extracted = await parser.parsePDFTimetable(filePath, userHints);
            } else {
                extracted = await parser.parseImageTimetable(filePath);
            }
        }

        // Store extraction result temporarily
        const extractionId = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const resultPath = path.join(__dirname, '..', 'uploads', `extraction-${extractionId}.json`);
        fs.writeFileSync(resultPath, JSON.stringify({
            ...extracted,
            extractionId,
            uploadMode: hasDualFiles ? 'dual' : 'single',
            uploadedAt: new Date().toISOString()
        }, null, 2));

        // Clean up original files after successful extraction
        uploadedFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        res.json({
            extractionId,
            ...extracted
        });
    } catch (error) {
        console.error('Parse timetable error:', error);

        // Clean up files on error
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
        }

        res.status(500).json({
            error: error.message || 'Failed to parse timetable'
        });
    }
});

// Get extraction result
router.get('/extraction/:extractionId', (req, res) => {
    try {
        const resultPath = path.join(__dirname, '..', 'uploads', `extraction-${req.params.extractionId}.json`);

        if (!fs.existsSync(resultPath)) {
            return res.status(404).json({ error: 'Extraction not found' });
        }

        const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        res.json(data);
    } catch (error) {
        console.error('Get extraction error:', error);
        res.status(500).json({ error: 'Failed to get extraction' });
    }
});

// Delete extraction result
router.delete('/extraction/:extractionId', (req, res) => {
    try {
        const resultPath = path.join(__dirname, '..', 'uploads', `extraction-${req.params.extractionId}.json`);

        if (fs.existsSync(resultPath)) {
            fs.unlinkSync(resultPath);
        }

        res.json({ message: 'Extraction deleted' });
    } catch (error) {
        console.error('Delete extraction error:', error);
        res.status(500).json({ error: 'Failed to delete extraction' });
    }
});

module.exports = router;
