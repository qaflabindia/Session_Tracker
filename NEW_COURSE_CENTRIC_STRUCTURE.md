# New AI Extraction Structure - Course-Centric with Multiple Slots

## 🎯 Correct Data Structure

### Current (WRONG):
```json
{
  "courses": [
    { "name": "Professional Ethics", "code": "HSIR14", "slot": "A" }
  ],
  "schedules": [
    { "course_code": "HSIR14", "day_of_week": 1, "start_time": "08:30" }
  ]
}
```
**Problem**: Only 1 schedule per course!

### New (CORRECT):
```json
{
  "courses": [
    {
      "name": "Professional Ethics",
      "code": "HSIR14",
      "slot": "A",
      "professor": "Dr. Suryanarayana Gangolu",
      "color": "#f97316",
      "schedules": [
        {
          "day_of_week": 1,
          "start_time": "08:30",
          "end_time": "09:20",
          "location": "Room A"
        },
        {
          "day_of_week": 2,
          "start_time": "09:20",
          "end_time": "10:10",
          "location": "Room A"
        },
        {
          "day_of_week": 3,
          "start_time": "10:30",
          "end_time": "11:20",
          "location": "Room A"
        }
      ]
    }
  ]
}
```
**Solution**: Multiple schedules nested under each course!

## 📊 Complete Example

```json
{
  "semester": {
    "name": "January 2026 Session",
    "start_date": "2026-01-01",
    "end_date": "2026-05-31"
  },
  "courses": [
    {
      "name": "Professional Ethics",
      "code": "HSIR14",
      "slot": "A",
      "professor": "Dr. Suryanarayana Gangolu",
      "color": "#f97316",
      "schedules": [
        { "day_of_week": 1, "start_time": "08:30", "end_time": "09:20", "location": "" },
        { "day_of_week": 2, "start_time": "09:20", "end_time": "10:10", "location": "" },
        { "day_of_week": 3, "start_time": "10:30", "end_time": "11:20", "location": "" }
      ]
    },
    {
      "name": "Measurements & Instrumentation",
      "code": "EEPC23",
      "slot": "B",
      "professor": "Dr. Aneesa Farhan M A",
      "color": "#a855f7",
      "schedules": [
        { "day_of_week": 2, "start_time": "08:30", "end_time": "09:20", "location": "" },
        { "day_of_week": 3, "start_time": "09:20", "end_time": "10:10", "location": "" },
        { "day_of_week": 4, "start_time": "10:30", "end_time": "11:20", "location": "" }
      ]
    },
    {
      "name": "Reserved for Open Elective Course",
      "code": "OPEN-ELECTIVE",
      "slot": "G",
      "professor": "",
      "color": "#10b981",
      "schedules": [
        { "day_of_week": 1, "start_time": "14:20", "end_time": "15:20", "location": "" },
        { "day_of_week": 3, "start_time": "14:20", "end_time": "15:20", "location": "" },
        { "day_of_week": 5, "start_time": "14:20", "end_time": "15:20", "location": "" }
      ]
    },
    {
      "name": "Reserved for Minor Course",
      "code": "MINOR-COURSE",
      "slot": "M",
      "professor": "",
      "color": "#ec4899",
      "schedules": [
        { "day_of_week": 2, "start_time": "14:20", "end_time": "15:20", "location": "" },
        { "day_of_week": 3, "start_time": "15:20", "end_time": "16:10", "location": "" },
        { "day_of_week": 4, "start_time": "14:20", "end_time": "15:20", "location": "" }
      ]
    }
  ]
}
```

## 🎨 New UI Structure

### Step 1: Course Master (with Slot Reference)
```
Course 1                                    [Remove]
┌─────────────────────────────────────────────────┐
│ Name: Professional Ethics                       │
│ Code: HSIR14                                    │
│ Slot: A                                         │
│ Professor: Dr. Suryanarayana Gangolu            │
│ Color: [🟠]                                     │
│ Schedules: 3 time slots                         │
└─────────────────────────────────────────────────┘
```

### Step 2: Schedule Mapping (Grouped by Course)
```
Course: HSIR14 - Professional Ethics (Slot A)
┌─────────────────────────────────────────────────┐
│ Schedule 1                          [Remove]    │
│ Day: Monday    Time: 08:30-09:20   Location: A  │
├─────────────────────────────────────────────────┤
│ Schedule 2                          [Remove]    │
│ Day: Tuesday   Time: 09:20-10:10   Location: A  │
├─────────────────────────────────────────────────┤
│ Schedule 3                          [Remove]    │
│ Day: Wednesday Time: 10:30-11:20   Location: A  │
├─────────────────────────────────────────────────┤
│                    [+ Add Schedule]             │
└─────────────────────────────────────────────────┘

Course: EEPC23 - Measurements (Slot B)
┌─────────────────────────────────────────────────┐
│ Schedule 1                          [Remove]    │
│ Day: Tuesday   Time: 08:30-09:20   Location: B  │
├─────────────────────────────────────────────────┤
│ Schedule 2                          [Remove]    │
│ Day: Wednesday Time: 09:20-10:10   Location: B  │
├─────────────────────────────────────────────────┤
│                    [+ Add Schedule]             │
└─────────────────────────────────────────────────┘
```

## 🔧 Implementation Changes

### 1. AI Parser - New Structure
**File**: `server/services/aiParser.js`

**Change**: Return nested structure instead of flat schedules array

### 2. Frontend UI - Course-Centric View
**File**: `client/src/pages/AITimetableUpload.jsx`

**Changes**:
- Step 1: Show slot reference for each course
- Step 2: Group schedules by course
- Each course has expandable schedule list
- Add/Remove buttons per schedule row

### 3. Slot Reference Preservation
- Keep slot letters (A, B, C, etc.) throughout
- Use slot for correlation, not course code
- Display slot prominently in UI

---

**Status**: Ready for implementation
**Priority**: HIGH
**Impact**: Fixes the "only 1 schedule per course" bug
