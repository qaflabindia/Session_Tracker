# IMPLEMENTATION PLAN: Course-Centric Nested Structure

## 🎯 Problem Statement

**Current Issue**: Each course only gets 1 schedule slot, but courses have multiple time slots across the week.

**Root Cause**: The data structure separates courses and schedules into flat arrays, and the frontend only shows the first schedule per course.

## ✅ Solution: Nest Schedules Under Each Course

### Current Structure (WRONG):
```json
{
  "courses": [
    { "name": "Professional Ethics", "code": "HSIR14", "slot": "A" }
  ],
  "schedules": [
    { "course_code": "HSIR14", "day_of_week": 1, "start_time": "08:30" },
    { "course_code": "HSIR14", "day_of_week": 2, "start_time": "09:20" },
    { "course_code": "HSIR14", "day_of_week": 3, "start_time": "10:30" }
  ]
}
```
**Problem**: Schedules are separate, frontend only picks first one.

### New Structure (CORRECT):
```json
{
  "courses": [
    {
      "name": "Professional Ethics",
      "code": "HSIR14",
      "slot": "A",
      "professor": "Dr. Gangolu",
      "color": "#f97316",
      "schedules": [
        { "day_of_week": 1, "start_time": "08:30", "end_time": "09:20", "location": "" },
        { "day_of_week": 2, "start_time": "09:20", "end_time": "10:10", "location": "" },
        { "day_of_week": 3, "start_time": "10:30", "end_time": "11:20", "location": "" }
      ]
    }
  ]
}
```
**Solution**: Schedules nested under course, all time slots preserved.

## 📋 Implementation Steps

### 1. Update AI Parser (Backend)
**File**: `server/services/aiParser.js`

**Methods to Update**:
- ✅ `extractSemesterAnnouncement()` - DONE
- ⏳ `parseImageTimetable()` - TODO
- ⏳ `parsePDFTimetable()` - TODO

**Changes**:
- Return nested structure with `schedules` array under each course
- Add `slot` field to each course
- Group all time slots by slot letter

### 2. Update Frontend UI
**File**: `client/src/pages/AITimetableUpload.jsx`

**Step 1: Course Master**
- Show slot reference for each course
- Display schedule count (e.g., "3 time slots")
- Keep existing edit fields

**Step 2: Schedule Mapping (NEW DESIGN)**
- Group schedules by course
- Show course header with slot reference
- List all schedules under each course
- Add/Remove buttons per schedule
- Expandable/collapsible per course

### 3. Update Import Logic
**File**: `client/src/pages/AITimetableUpload.jsx` - `handleImportAll()`

**Changes**:
- Iterate through courses
- For each course, iterate through its nested schedules
- Create course once, create multiple schedule entries

## 🎨 New UI Mockup

### Step 2: Schedule Mapping (Course-Centric View)

```
┌─────────────────────────────────────────────────────────────┐
│ Course: HSIR14 - Professional Ethics (Slot A)         [▼]  │
├─────────────────────────────────────────────────────────────┤
│  Schedule 1                                      [Remove]   │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │ Monday   │ 08:30 AM │ 09:20 AM │ Room A   │           │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
│                                                              │
│  Schedule 2                                      [Remove]   │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │ Tuesday  │ 09:20 AM │ 10:10 AM │ Room A   │           │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
│                                                              │
│  Schedule 3                                      [Remove]   │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │Wednesday │ 10:30 AM │ 11:20 AM │ Room A   │           │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
│                                                              │
│  [+ Add Schedule]                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Course: EEPC23 - Measurements (Slot B)            [▼]      │
├─────────────────────────────────────────────────────────────┤
│  Schedule 1                                      [Remove]   │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │ Tuesday  │ 08:30 AM │ 09:20 AM │ Room B   │           │ │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘ │
│                                                              │
│  [+ Add Schedule]                                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Code Changes Required

### Backend: parseImageTimetable()

```javascript
// OLD PROMPT
"Extract courses and schedules separately"
"courses": [...],
"schedules": [...]

// NEW PROMPT
"Group ALL time slots under each course"
"courses": [
  {
    "name": "...",
    "slot": "A",
    "schedules": [...]
  }
]
```

### Frontend: Step 2 Rendering

```javascript
// OLD (flat schedules)
{editingSchedules.map((schedule, idx) => (
  <div key={idx}>
    <select value={schedule.course_code}>...</select>
    <input value={schedule.day_of_week} />
  </div>
))}

// NEW (grouped by course)
{editingCourses.map((course, courseIdx) => (
  <div key={courseIdx} className="course-group">
    <h3>{course.code} - {course.name} (Slot {course.slot})</h3>
    {course.schedules.map((schedule, schedIdx) => (
      <div key={schedIdx} className="schedule-row">
        <select value={schedule.day_of_week}>...</select>
        <input value={schedule.start_time} />
        <button onClick={() => removeScheduleFromCourse(courseIdx, schedIdx)}>
          Remove
        </button>
      </div>
    ))}
    <button onClick={() => addScheduleToCourse(courseIdx)}>
      + Add Schedule
    </button>
  </div>
))}
```

### Frontend: Import Logic

```javascript
// OLD (separate arrays)
for (const course of editingCourses) {
  const courseRes = await coursesAPI.create({...});
  courseMap[course.code] = courseRes.data.id;
}
for (const schedule of editingSchedules) {
  await schedulesAPI.create({
    course_id: courseMap[schedule.course_code],
    ...
  });
}

// NEW (nested schedules)
for (const course of editingCourses) {
  const courseRes = await coursesAPI.create({
    semester_id: id,
    name: course.name,
    code: course.code,
    color: course.color
  });
  
  // Create all schedules for this course
  for (const schedule of course.schedules) {
    await schedulesAPI.create({
      course_id: courseRes.data.id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location: schedule.location || ''
    });
  }
}
```

## ✅ Expected Results

### Before Fix:
- 11 courses ✅
- 11 schedules (1 per course) ❌
- Total schedule entries: 11

### After Fix:
- 13 courses (including G, M) ✅
- ~45-50 schedules (multiple per course) ✅
- Total schedule entries: ~45-50

### Example: Professional Ethics (Slot A)
- Before: 1 schedule (Monday only)
- After: 3 schedules (Monday, Tuesday, Wednesday)

---

**Status**: Ready for implementation
**Priority**: CRITICAL
**Estimated Time**: 2-3 hours
