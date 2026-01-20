# Session Tracker - Quick Reference

## 🚀 Getting Started (5 minutes)

### 1. Start the Application
```bash
cd "/Users/lakshminarasimhansanthanam/Workspaces/Session Tracker"
./start.sh
```

Or manually:
```bash
# Terminal 1
npm run dev

# Terminal 2
cd client && npm run dev
```

### 2. Access the App
- Open browser: http://localhost:5174
- Backend API: http://localhost:3000/api

### 3. Create Your Account
- Click "Sign up"
- Enter email and password (min 6 chars)
- You're in!

## 📅 First-Time Setup (10 minutes)

### Step 1: Create Semester
1. Click "Create First Semester"
2. Enter name (e.g., "Fall 2024")
3. Set start and end dates
4. Click "Create Semester"

### Step 2: Add Courses
1. Enter course details:
   - Name: "Introduction to Computer Science"
   - Code: "CS101"
   - Professor: "Dr. Smith" (optional)
   - Pick a color
2. Click "Add"
3. Repeat for all courses

### Step 3: Set Weekly Schedule
For each course:
1. Click "Add Time Slot"
2. Select day of week
3. Set start and end times
4. Add location (optional)
5. Add more slots if course meets multiple times/week

### Step 4: Generate Sessions
1. Review your schedule
2. Click "Generate All Sessions"
3. Confirm the action
4. Done! All sessions created for the semester

## 📝 Daily Usage (2 minutes)

### Mark Attendance
1. Open your semester
2. View the current week
3. For each class:
   - Tap ✓ to mark attended
   - Tap ✗ to mark missed
4. That's it!

### Navigate Weeks
- Use ← → arrows to move between weeks
- Current day is highlighted

## 📊 View Analytics

1. Click "Analytics" button
2. See:
   - Overall attendance percentage
   - Per-course breakdown
   - Day-of-week patterns
   - Time slot analysis
3. Click "Export CSV" to download data

## 🔧 Common Tasks

### Add a Holiday
1. Go to semester setup
2. Scroll to holidays section
3. Add date and description
4. Sessions won't be created for that day

### Edit a Course
1. Go to semester setup
2. Update course details
3. Changes save automatically

### Rebuild Semester
⚠️ **Destructive Action**
1. Go to semester setup
2. Click "Rebuild Semester"
3. Type "REBUILD" to confirm
4. All sessions deleted
5. Schedules unlocked
6. Re-propagate when ready

### Bulk Mark Attendance
1. Select multiple sessions (future feature)
2. Choose status
3. Confirm
4. Can undo within 24 hours

## 🎨 UI Tips

### Status Colors
- 🟢 Green = Attended
- 🔴 Red = Missed
- 🟡 Yellow = Cancelled
- 🔵 Blue = Scheduled

### Keyboard Navigation
- Tab to move between fields
- Enter to submit forms
- Esc to close modals

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
```

### Frontend won't start
```bash
# Check if port 5174 is in use
lsof -i :5174
# Kill the process if needed
kill -9 <PID>
```

### CSS not loading
```bash
cd client
rm -rf node_modules
npm install
npm run dev
```

### Database locked
```bash
# Stop all servers
# Delete .db-wal and .db-shm files
rm data/*.db-wal data/*.db-shm
# Restart
```

## 📱 Mobile Usage

The app is fully responsive:
- Tap instead of click
- Swipe-friendly navigation
- Optimized for small screens
- Works on iOS and Android browsers

## 🔐 Security Notes

- Passwords are hashed (bcrypt)
- JWT tokens expire after 30 days
- No data shared between users
- All data stored locally in SQLite

## 💾 Data Location

- Database: `data/attendance.db`
- Uploads: `uploads/` (for future AI features)
- Logs: Console output only

## 📤 Export Your Data

### CSV Export
1. Go to Analytics
2. Click "Export CSV"
3. Opens in new tab
4. Save the file

### Manual Database Backup
```bash
cp data/attendance.db data/attendance-backup-$(date +%Y%m%d).db
```

## 🎯 Best Practices

1. **Mark attendance daily** - Don't let it pile up
2. **Review analytics weekly** - Stay on track
3. **Backup before rebuilding** - Safety first
4. **Use descriptive course names** - Easy to identify
5. **Set realistic schedules** - Match your actual classes

## ⚡ Quick Commands

```bash
# Start everything
./start.sh

# Backend only
npm run dev

# Frontend only
cd client && npm run dev

# Install dependencies
npm install && cd client && npm install && cd ..

# Clean install
rm -rf node_modules client/node_modules
npm install && cd client && npm install && cd ..
```

## 📞 Need Help?

Check these files:
- `README.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- Design document - Original specifications

## 🎉 Pro Tips

1. **Color-code courses** - Makes calendar easier to read
2. **Add all holidays upfront** - Prevents wrong session counts
3. **Use bulk operations** - Save time on makeup classes
4. **Export regularly** - Keep external backups
5. **Check analytics** - Identify attendance patterns

---

**You're all set! Start tracking your attendance today.** 📚✨
