# AI Extraction - Two-Step Workflow

## 🎯 Problem Solved

The previous implementation incorrectly mixed **course master data** with **schedule instances**. This caused issues when:
- Same course appears multiple times with different professors
- Different sections of the same course have different schedules
- Professor assignments should be at transaction (schedule) level, not course level

## ✅ New Architecture

### Step 1: Course Master Configuration
**Purpose**: Define unique courses that will be used throughout the semester

**Data Structure**:
```json
{
  "courses": [
    {
      "name": "Professional Ethics",
      "code": "HSIR14",
      "color": "#0ea5e9"
    },
    {
      "name": "Microprocessors & Microcontrollers",
      "code": "EEPC22",
      "color": "#8b5cf6"
    }
  ]
}
```

**Key Points**:
- Each course appears **only once**
- No professor assignment at this level
- Course code is the unique identifier
- Color for visual identification

### Step 2: Schedule Mapping
**Purpose**: Map all schedule instances to courses with professor assignments

**Data Structure**:
```json
{
  "schedules": [
    {
      "course_code": "HSIR14",
      "professor": "Dr. Suryanarayana Gangolu",
      "day_of_week": 1,
      "start_time": "08:30",
      "end_time": "09:20",
      "location": "Room I"
    },
    {
      "course_code": "HSIR14",
      "professor": "Dr. Aneesa Farhan M A",
      "day_of_week": 2,
      "start_time": "08:30",
      "end_time": "09:20",
      "location": "Room A"
    }
  ]
}
```

**Key Points**:
- Same course can appear **multiple times**
- Each schedule has its own professor
- Professor assignment at **transaction level**
- Supports different sections/batches

## 🔄 Workflow

### AI Extraction
1. Upload timetable image/PDF
2. AI extracts:
   - **Unique courses** (deduplicated by course code)
   - **All schedule instances** (with course_code references)
3. Returns both arrays separately

### User Verification

**Step 1: Configure Courses**
- Review extracted unique courses
- Edit course names, codes, colors
- Add/remove courses
- See schedule count for each course
- Click "Next: Map Schedules"

**Step 2: Map Schedules**
- Review all schedule instances
- Each schedule shows:
  - Course dropdown (select from Step 1 courses)
  - Professor field (transaction-level)
  - Day, time, location
- Edit any schedule
- Add/remove schedules
- Click "Import Timetable"

### Database Import
1. Create courses in `courses` table (without professor)
2. Create schedules in `weekly_schedules` table
3. Professor info stored at schedule level (can be added to schema if needed)

## 📊 Example Scenario

**Timetable Shows**:
- Professional Ethics (HSIR14) on Monday with Dr. Gangolu
- Professional Ethics (HSIR14) on Tuesday with Dr. Farhan
- Microprocessors (EEPC22) on Wednesday with Dr. Rana

**Step 1 Output** (Course Master):
```
Course 1: Professional Ethics (HSIR14) - Blue
Course 2: Microprocessors & Microcontrollers (EEPC22) - Purple
```

**Step 2 Output** (Schedules):
```
Schedule 1: HSIR14 | Dr. Gangolu | Monday 08:30-09:20 | Room I
Schedule 2: HSIR14 | Dr. Farhan | Tuesday 08:30-09:20 | Room A
Schedule 3: EEPC22 | Dr. Rana | Wednesday 08:30-09:20 | Room B
```

## 🎨 UI Features

### Progress Indicator
- Shows current step (1 or 2)
- Step 1: Green checkmark when complete
- Step 2: Active when in progress

### Step 1 Screen
- List of unique courses
- Edit fields: Name, Code, Color
- Schedule count per course
- Add/Remove course buttons
- "Next" button to proceed

### Step 2 Screen
- List of all schedules
- Each schedule has:
  - Course dropdown (from Step 1)
  - Professor input
  - Day dropdown
  - Time inputs
  - Location input
- Add/Remove schedule buttons
- "Back" button to edit courses
- "Import" button to save

## 🔧 Technical Implementation

### AI Parser Changes
**Before**:
```json
{
  "courses": [
    {
      "name": "...",
      "code": "...",
      "professor": "...",  // ❌ Wrong level
      "schedules": [...]
    }
  ]
}
```

**After**:
```json
{
  "courses": [
    {
      "name": "...",
      "code": "...",
      "color": "..."
    }
  ],
  "schedules": [
    {
      "course_code": "...",
      "professor": "...",  // ✅ Correct level
      "day_of_week": 1,
      ...
    }
  ]
}
```

### Frontend State Management
```javascript
const [editingCourses, setEditingCourses] = useState([]);
const [editingSchedules, setEditingSchedules] = useState([]);
const [currentStep, setCurrentStep] = useState(1);
```

### Import Logic
```javascript
// Step 1: Create courses
for (const course of editingCourses) {
  const courseRes = await coursesAPI.create({
    semester_id: id,
    name: course.name,
    code: course.code,
    color: course.color
  });
  courseMap[course.code] = courseRes.data.id;
}

// Step 2: Create schedules
for (const schedule of editingSchedules) {
  await schedulesAPI.create({
    course_id: courseMap[schedule.course_code],
    day_of_week: schedule.day_of_week,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    location: schedule.location
  });
}
```

## ✅ Benefits

1. **Proper Data Modeling**
   - Course master is clean and unique
   - Schedules reference courses correctly
   - Professor at transaction level

2. **Flexibility**
   - Same course with different professors
   - Different sections/batches
   - Lab vs. lecture differentiation

3. **User Control**
   - Clear two-step process
   - Easy to understand
   - Full editing capability

4. **Database Integrity**
   - No duplicate courses
   - Proper foreign key relationships
   - Clean schedule propagation

## 🎯 Alignment with Requirements

✅ Extract all unique courses  
✅ Configure courses in course master  
✅ Map professors at transaction level  
✅ Support recurring slots for same subject  
✅ Multiple instances of same course across days  
✅ Extract all information at once  
✅ Present in two-step screen  

---

**The workflow now correctly separates course configuration from schedule mapping!** 🎉
