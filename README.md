# Session Tracker

A comprehensive personal attendance tracking application for students.

## Features

- ✅ **Self-Reported Attendance**: Track your attendance without external verification
- 📅 **Semester Management**: Organize courses by semester
- 🔄 **Schedule Propagation**: Automatically generate sessions from weekly schedules
- 🤖 **AI-Assisted Import**: Upload timetable images/PDFs and let AI extract course details
- 🔐 **Secure API Key Vault**: Encrypted storage for your OpenAI API key
- 📊 **Analytics Dashboard**: Visualize attendance patterns and statistics
- 📥 **Export Data**: Download attendance records as CSV
- 🔒 **Secure Authentication**: JWT-based user authentication
- 🎨 **Modern UI**: Glassmorphic design with dark theme
- 📱 **Mobile-First**: Responsive design optimized for mobile devices

## Tech Stack

### Backend
- Node.js + Express
- SQLite with WAL mode
- JWT authentication
- RESTful API

### Frontend
- React + Vite
- React Router
- Tailwind CSS
- Recharts for analytics
- Axios for API calls

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd "/Users/lakshminarasimhansanthanam/Workspaces/Session Tracker"
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Set up environment variables**

Backend `.env`:
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

Frontend `client/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

### Running the Application

1. **Start the backend server**
```bash
npm run dev
```

2. **In a new terminal, start the frontend**
```bash
cd client
npm run dev
```

3. **Access the application**
- Frontend: http://localhost:5174
- Backend API: http://localhost:3000/api

## Usage Guide

### 1. Create an Account
- Register with your email and password
- Password must be at least 6 characters

### 2. Create a Semester
- Click "Create First Semester" or "New Semester"
- Enter semester name, start date, and end date
- Set your timezone

### 3. Add Courses
- Navigate to semester setup
- Add courses with name, code, professor, and color
- Each course can have multiple weekly time slots

### 4. Set Up Weekly Schedule
- For each course, add time slots
- Specify day of week, start time, end time, and location
- Add multiple slots if the course meets more than once per week

### 5. Generate Sessions
- Once all courses and schedules are configured
- Click "Generate All Sessions"
- This creates attendance sessions for the entire semester

### 6. Mark Attendance
- View weekly calendar
- Click ✓ to mark attended
- Click ✗ to mark missed
- Sessions can be marked at any time (no auto-miss)

### 7. View Analytics
- Click "Analytics" to see attendance statistics
- View overall percentage, course-wise breakdown
- See day-of-week patterns
- Export data as CSV

## Key Design Decisions

### No Auto-Miss Logic
Sessions remain "scheduled" until manually marked. This prevents accidental missed markings.

### Schedule Locking
Once sessions are generated, weekly schedules are locked to maintain data integrity. Use "Rebuild Semester" to modify.

### Audit Trail
Every attendance change is logged with timestamp and source (manual, bulk, undo).

### Bulk Operations
- Maximum 50 sessions per bulk operation
- 24-hour undo window
- Last 5 operations can be undone

### Self-Reported Data
All attendance data is self-declared and includes disclaimers. No external verification.

## Database Schema

- **users**: User accounts
- **semesters**: Academic semesters
- **courses**: Courses per semester
- **weekly_schedules**: Recurring weekly schedule
- **sessions**: Individual attendance sessions
- **attendance_audits**: Change history
- **bulk_operations**: Bulk operation tracking
- **holidays**: Excluded dates

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Semesters
- `GET /api/semesters` - List all semesters
- `POST /api/semesters` - Create semester
- `POST /api/semesters/:id/propagate` - Generate sessions
- `POST /api/semesters/:id/rebuild` - Rebuild semester

### Courses
- `GET /api/courses/semester/:semesterId` - List courses
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Schedules
- `GET /api/schedules/course/:courseId` - List schedules
- `POST /api/schedules` - Create schedule
- `POST /api/schedules/holidays` - Add holiday

### Sessions
- `GET /api/sessions` - List sessions (with filters)
- `POST /api/sessions/:id/mark` - Mark attendance
- `POST /api/sessions/bulk-update` - Bulk update
- `POST /api/sessions/bulk/:id/undo` - Undo bulk operation

### Analytics
- `GET /api/analytics/semester/:id` - Semester analytics
- `GET /api/analytics/course/:id` - Course analytics

### Export
- `GET /api/export/semester/:id/csv` - Download CSV
- `GET /api/export/semester/:id/data` - Get export data

## Security Considerations

- JWT tokens expire after 30 days
- Passwords hashed with bcrypt
- All API routes (except auth) require authentication
- User data is isolated (multi-tenancy enforced)
- No sensitive data logged

## AI Features

See [AI_FEATURES.md](./AI_FEATURES.md) for detailed documentation on:
- AI-assisted timetable parsing from images/PDFs
- Secure API key vault with encryption
- Human-in-the-loop verification workflow
- Confidence scoring and extraction accuracy

## Future Enhancements

- PDF export generation
- Push notifications for upcoming sessions
- Calendar integration (Google Calendar, iCal)
- Attendance goals and reminders
- Multi-semester analytics comparison

## License

MIT

## Disclaimer

This application is for personal attendance tracking only. All data is self-reported and not externally verified. Not intended for institutional use or enforcement.
