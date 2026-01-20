const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'attendance.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database with WAL mode
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
const initSchema = () => {
    // User table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      settings_json TEXT DEFAULT '{}'
    )
  `);

    // Semester table
    db.exec(`
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // Course table
    db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      professor TEXT,
      color TEXT DEFAULT '#0ea5e9',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )
  `);

    // Weekly Schedule table
    db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      location TEXT,
      locked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

    // Session table
    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      semester_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'attended', 'missed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )
  `);

    // Attendance Audit table
    db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('manual', 'bulk', 'undo', 'ai_suggestion')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

    // Bulk Operation table
    db.exec(`
    CREATE TABLE IF NOT EXISTS bulk_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      affected_sessions_count INTEGER NOT NULL,
      operation_type TEXT NOT NULL,
      operation_data TEXT NOT NULL,
      undo_available_until DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    // Holidays table (for schedule propagation)
    db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )
  `);

    // Create indexes for performance
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_course ON sessions(course_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_semester ON sessions(semester_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_audits_session ON attendance_audits(session_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_schedules_course ON weekly_schedules(course_id);
  `);

    console.log('Database schema initialized successfully');
};

// Initialize schema
initSchema();

module.exports = db;
