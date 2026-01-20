# AI Import - Two-Input System Implementation Plan

## 🎯 Objective
Redesign AI import to accept TWO separate inputs:
1. **Semester Announcement** - Contains semester info and course list
2. **Weekly Course Schedule** - Contains the weekly timetable

The system will correlate both documents to extract complete course and schedule information.

## 📋 Implementation Steps

### Step 1: Update AI Parser Service ✅
**File**: `server/services/aiParser.js`
**Changes**:
- Add new method: `parseMultipleDocuments(semesterDoc, scheduleDoc)`
- First pass: Extract courses from semester announcement
- Second pass: Extract schedules from weekly timetable
- Correlate courses by name/code matching
- Return unified structure

**Estimated Time**: 30 minutes

### Step 2: Update API Routes ✅
**File**: `server/routes/aiExtraction.js`
**Changes**:
- Modify `/api/ai/parse` to accept TWO files
- Update multer config for multiple file upload
- Handle both image and PDF for each input
- Pass both files to new parser method

**Estimated Time**: 20 minutes

### Step 3: Update Frontend Upload UI ✅
**File**: `client/src/pages/AITimetableUpload.jsx`
**Changes**:
- Add TWO separate file upload zones:
  - "Semester Announcement" upload
  - "Weekly Schedule" upload
- Update state to track both files
- Update upload handler to send both files
- Add validation (both files required)

**Estimated Time**: 30 minutes

### Step 4: Update Verification Workflow ✅
**File**: `client/src/pages/AITimetableUpload.jsx`
**Changes**:
- Keep existing two-step verification:
  - Step 1: Course Master (from semester announcement)
  - Step 2: Schedule Mapping (from weekly schedule)
- Add source indicators showing which document data came from
- Maintain existing edit/validation capabilities

**Estimated Time**: 20 minutes

### Step 5: Update Documentation ✅
**Files**: 
- `AI_FEATURES.md`
- `AI_TWO_STEP_WORKFLOW.md`
**Changes**:
- Document two-input requirement
- Update workflow diagrams
- Add example scenarios
- Update API documentation

**Estimated Time**: 15 minutes

### Step 6: Testing ✅
**Actions**:
- Test with sample semester announcement
- Test with sample weekly schedule
- Verify course correlation works
- Test validation and import flow
- Verify calendar propagation

**Estimated Time**: 30 minutes

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS                              │
├─────────────────────────────────────────────────────────────┤
│  Input 1: Semester Announcement (PDF/Image)                 │
│  - Semester name, dates                                      │
│  - List of courses (names, codes, professors)               │
│                                                              │
│  Input 2: Weekly Schedule (PDF/Image)                       │
│  - Weekly timetable grid                                     │
│  - Course codes, days, times, locations                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI EXTRACTION                               │
├─────────────────────────────────────────────────────────────┤
│  Pass 1: Extract from Semester Announcement                 │
│  {                                                           │
│    semester: { name, start_date, end_date },                │
│    courses: [                                                │
│      { name: "Prof Ethics", code: "HSIR14", ... }          │
│    ]                                                         │
│  }                                                           │
│                                                              │
│  Pass 2: Extract from Weekly Schedule                       │
│  {                                                           │
│    schedules: [                                              │
│      { course_code: "HSIR14", day: 1, time: "08:30", ... } │
│    ]                                                         │
│  }                                                           │
│                                                              │
│  Correlation: Match schedules to courses by code            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              USER VALIDATION (2 Steps)                       │
├─────────────────────────────────────────────────────────────┤
│  Step 1: Review Course Master                               │
│  - Verify course names, codes, colors                       │
│  - Edit as needed                                            │
│  - See which came from semester announcement                │
│                                                              │
│  Step 2: Review Schedule Mapping                            │
│  - Verify day, time, location for each schedule            │
│  - Map to correct course                                     │
│  - See which came from weekly schedule                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  IMPORT TO DATABASE                          │
├─────────────────────────────────────────────────────────────┤
│  1. Create courses in database                              │
│  2. Create weekly schedules                                  │
│  3. Trigger schedule propagation                            │
│  4. Generate sessions in calendar                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Technical Details

### API Endpoint Update
```javascript
POST /api/ai/parse
Content-Type: multipart/form-data

Fields:
- semesterAnnouncement: File (required)
- weeklySchedule: File (required)
- hints: String (optional)

Response:
{
  semester: { ... },
  courses: [ ... ],
  schedules: [ ... ],
  confidence: 0.95,
  sources: {
    semester: "from_announcement",
    courses: "from_announcement",
    schedules: "from_weekly_schedule"
  }
}
```

### AI Prompts

**Prompt 1 - Semester Announcement**:
```
Extract semester information and course list from this announcement.
Return:
- Semester name, start date, end date
- List of unique courses with names, codes, professors
```

**Prompt 2 - Weekly Schedule**:
```
Extract weekly schedule from this timetable.
Return:
- All schedule instances with course codes, days, times, locations
```

## ✅ Success Criteria

1. ✅ User can upload two separate files
2. ✅ AI extracts courses from semester announcement
3. ✅ AI extracts schedules from weekly timetable
4. ✅ System correlates schedules to courses
5. ✅ User validates in two-step workflow
6. ✅ Import creates courses and schedules
7. ✅ Schedule propagation generates calendar sessions
8. ✅ No disruption to existing working features

## 🚫 Non-Breaking Changes

- Existing single-file upload still works (backward compatible)
- Two-step validation workflow remains unchanged
- Database schema unchanged
- Calendar propagation unchanged
- All existing features continue to work

## 📝 Testing Scenarios

### Scenario 1: Standard University Timetable
- Input 1: Semester announcement PDF with course list
- Input 2: Weekly schedule grid image
- Expected: All courses extracted, schedules mapped correctly

### Scenario 2: Partial Information
- Input 1: Announcement missing some professor names
- Input 2: Schedule with all details
- Expected: Courses created, schedules fill in missing info

### Scenario 3: Mismatched Course Codes
- Input 1: Course code "CS101"
- Input 2: Schedule shows "CS-101"
- Expected: AI attempts fuzzy matching, user can correct in validation

## 🎯 Deliverables

1. ✅ Updated AI parser with two-input support
2. ✅ Modified API endpoint for dual file upload
3. ✅ Enhanced frontend with two upload zones
4. ✅ Updated documentation
5. ✅ Testing verification
6. ✅ No breaking changes to existing functionality

## ⏱️ Total Estimated Time
**2 hours 25 minutes**

---

**Status**: Ready for implementation
**Priority**: High
**Risk Level**: Low (non-breaking changes)
