const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
router.use(authMiddleware);

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Get API key status (not the actual key)
router.get('/status', (req, res) => {
    try {
        const user = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(req.user.userId);
        const settings = JSON.parse(user.settings_json || '{}');

        // Check if key exists AND is decryptable
        let hasValidKey = false;
        if (settings.openai_api_key_encrypted) {
            try {
                decrypt(settings.openai_api_key_encrypted);
                hasValidKey = true;
            } catch (decryptError) {
                // Key exists but can't be decrypted - it's corrupted
                console.warn('Corrupted API key detected for user', req.user.userId);
                hasValidKey = false;
            }
        }

        res.json({
            hasApiKey: hasValidKey,
            keyPreview: hasValidKey
                ? '••••••••' + settings.openai_api_key_encrypted.slice(-4)
                : null
        });
    } catch (error) {
        console.error('Get API key status error:', error);
        res.status(500).json({ error: 'Failed to get API key status' });
    }
});

// Set API key
router.post('/set', (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey || !apiKey.startsWith('sk-')) {
            return res.status(400).json({ error: 'Invalid OpenAI API key format' });
        }

        const user = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(req.user.userId);
        const settings = JSON.parse(user.settings_json || '{}');

        // Encrypt and store
        settings.openai_api_key_encrypted = encrypt(apiKey);

        db.prepare('UPDATE users SET settings_json = ? WHERE id = ?')
            .run(JSON.stringify(settings), req.user.userId);

        res.json({
            message: 'API key saved securely',
            keyPreview: '••••••••' + apiKey.slice(-4)
        });
    } catch (error) {
        console.error('Set API key error:', error);
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

// Delete API key
router.delete('/', (req, res) => {
    try {
        const user = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(req.user.userId);
        const settings = JSON.parse(user.settings_json || '{}');

        delete settings.openai_api_key_encrypted;

        db.prepare('UPDATE users SET settings_json = ? WHERE id = ?')
            .run(JSON.stringify(settings), req.user.userId);

        res.json({ message: 'API key deleted' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// Get decrypted API key (internal use only)
function getDecryptedApiKey(userId) {
    try {
        const user = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(userId);
        const settings = JSON.parse(user.settings_json || '{}');

        if (!settings.openai_api_key_encrypted) {
            return null;
        }

        return decrypt(settings.openai_api_key_encrypted);
    } catch (error) {
        // Decryption failed (likely due to encryption key change)
        // Clear the corrupted key and return null
        console.warn('API key decryption failed for user', userId, '- clearing corrupted key');
        try {
            const user = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(userId);
            const settings = JSON.parse(user.settings_json || '{}');
            delete settings.openai_api_key_encrypted;
            db.prepare('UPDATE users SET settings_json = ? WHERE id = ?')
                .run(JSON.stringify(settings), userId);
        } catch (cleanupError) {
            console.error('Failed to clear corrupted API key:', cleanupError);
        }
        return null;
    }
}

module.exports = { router, getDecryptedApiKey };
