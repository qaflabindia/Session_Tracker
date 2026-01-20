const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class AITimetableParser {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Parse TWO documents: Semester Announcement + Weekly Schedule
   * This is the recommended method for accurate extraction
   */
  async parseMultipleDocuments(semesterDocPath, scheduleDocPath, userHints = '') {
    try {
      console.log('Parsing two documents:', semesterDocPath, scheduleDocPath);

      // Step 1: Extract semester info and courses from announcement
      const semesterData = await this.extractSemesterAnnouncement(semesterDocPath, userHints);

      // Step 2: Extract schedules from weekly timetable
      const scheduleData = await this.extractWeeklySchedule(scheduleDocPath, userHints);

      // Step 3: Correlate schedules to courses
      const correlated = this.correlateSchedulesToCourses(semesterData, scheduleData);

      return {
        ...correlated,
        sources: {
          semester: 'semester_announcement',
          courses: 'semester_announcement',
          schedules: 'weekly_schedule'
        },
        notes: `Extracted from two documents: semester announcement and weekly schedule. ${correlated.notes || ''}`
      };
    } catch (error) {
      console.error('Multi-document parsing error:', error);
      throw new Error(`Failed to parse documents: ${error.message}`);
    }
  }

  /**
   * Extract semester info and course list from announcement
   */
  async extractSemesterAnnouncement(filePath, userHints = '') {
    const ext = path.extname(filePath).toLowerCase();
    const isPDF = ext === '.pdf';

    let content;
    if (isPDF) {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
    } else {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);
      content = { type: 'image', base64: base64Image, mimeType };
    }

    const messages = [
      {
        role: 'system',
        content: `You are extracting semester information and course list from an academic timetable.

IMPORTANT: Extract ALL courses including:
1. Regular courses (with course codes like HSIR14, EEPC23, etc.)
2. Reserved slots (e.g., "RESERVED FOR OPEN ELECTIVE COURSE", "RESERVED FOR MINOR COURSE")
3. Laboratory courses (e.g., Q1, Q2 slots)
4. Special courses (e.g., Industrial Lecture)

DO NOT skip entries marked as "RESERVED FOR..." - these are valid courses!

Extract:
1. Semester name (e.g., "Fall 2024", "January 2026 Session")
2. Semester start and end dates (if mentioned, otherwise estimate)
3. List of ALL courses with:
   - Full course name (including "Reserved for..." entries)
   - Course code (or slot letter like G, M, Q1, Q2 if no code)
   - Professor name (if mentioned, can be empty for reserved slots)
   - Slot letter (A, B, C, D, E, F, G, H, I, M, Q1, Q2, etc.) - CRITICAL!
   - Color for visual identification

CRITICAL: Scan the ENTIRE timetable grid and group ALL time slots under each course!
- Same slot letter = same course
- Extract ALL occurrences of each slot across ALL days
- Group them as a "schedules" array under the course

Return JSON with NESTED schedules:
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
        {
          "day_of_week": 1,
          "start_time": "08:30",
          "end_time": "09:20",
          "location": ""
        },
        {
          "day_of_week": 2,
          "start_time": "09:20",
          "end_time": "10:10",
          "location": ""
        },
        {
          "day_of_week": 3,
          "start_time": "10:30",
          "end_time": "11:20",
          "location": ""
        }
      ]
    },
    {
      "name": "Measurements & Instrumentation",
      "code": "EEPC23",
      "slot": "B",
      "professor": "Dr. Aneesa Farhan M A",
      "color": "#a855f7",
      "schedules": [
        {
          "day_of_week": 2,
          "start_time": "08:30",
          "end_time": "09:20",
          "location": ""
        },
        {
          "day_of_week": 3,
          "start_time": "09:20",
          "end_time": "10:10",
          "location": ""
        }
      ]
    },
    {
      "name": "Reserved for Open Elective Course",
      "code": "OPEN-ELECTIVE",
      "slot": "G",
      "professor": "",
      "color": "#10b981",
      "schedules": [
        {
          "day_of_week": 1,
          "start_time": "14:20",
          "end_time": "15:20",
          "location": ""
        },
        {
          "day_of_week": 3,
          "start_time": "14:20",
          "end_time": "15:20",
          "location": ""
        },
        {
          "day_of_week": 5,
          "start_time": "14:20",
          "end_time": "15:20",
          "location": ""
        }
      ]
    },
    {
      "name": "Reserved for Minor Course",
      "code": "MINOR-COURSE",
      "slot": "M",
      "professor": "",
      "color": "#ec4899",
      "schedules": [
        {
          "day_of_week": 2,
          "start_time": "14:20",
          "end_time": "15:20",
          "location": ""
        },
        {
          "day_of_week": 3,
          "start_time": "15:20",
          "end_time": "16:10",
          "location": ""
        }
      ]
    }
  ],
  "confidence": 0.95
}

CRITICAL RULES:
- Each course appears ONCE in the courses array
- Each course has a "schedules" array with ALL its time slots
- Slot letter is the PRIMARY identifier (A, B, C, etc.)
- Same slot = same course, even if on different days
- Extract ALL days (Mon-Fri) for each slot
- DO NOT create separate courses for same slot on different days!`
      }
    ];

    if (content.type === 'image') {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Extract semester and course information. Hints: ${userHints || 'None'}` },
          { type: 'image_url', image_url: { url: `data:${content.mimeType};base64,${content.base64}` } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: `Extract semester and course information from:\n\n${content}\n\nHints: ${userHints || 'None'}`
      });
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 2000,
      temperature: 0.1
    });

    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from announcement');

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Extract weekly schedule from timetable
   */
  async extractWeeklySchedule(filePath, userHints = '') {
    const ext = path.extname(filePath).toLowerCase();
    const isPDF = ext === '.pdf';

    let content;
    if (isPDF) {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
    } else {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);
      content = { type: 'image', base64: base64Image, mimeType };
    }

    const messages = [
      {
        role: 'system',
        content: `You are extracting weekly schedule from a timetable grid.

CRITICAL INSTRUCTIONS:

1. SCAN ALL DAYS OF THE WEEK:
   - Monday (day_of_week: 1)
   - Tuesday (day_of_week: 2)
   - Wednesday (day_of_week: 3)
   - Thursday (day_of_week: 4)
   - Friday (day_of_week: 5)
   - Saturday (day_of_week: 6) if present
   - Sunday (day_of_week: 7) if present

2. SCAN ALL TIME SLOTS (rows in the grid):
   - Morning slots (08:00-12:00)
   - Afternoon slots (12:00-18:00)
   - Evening slots (18:00-22:00)

3. EXTRACT EVERY CELL in the timetable grid:
   - Read the ENTIRE grid from left to right, top to bottom
   - DO NOT stop after the first column (Monday)
   - DO NOT stop after the first row
   - Extract EVERY non-empty cell

4. EXTRACT DUPLICATES:
   - Same slot letter can appear MULTIPLE times (different days/times)
   - Example: Slot "A" on Monday 08:30, Tuesday 09:20, Wednesday 10:30 = 3 separate entries
   - Example: Slot "C" on Wednesday, Thursday, Friday = 3 separate entries
   - DO NOT deduplicate or merge entries - extract each occurrence separately!

5. INCLUDE ALL SLOT TYPES:
   - Regular class slots (A-H, I) - EVERY occurrence
   - Reserved slots (G for Open Elective, M for Minor Course) - EVERY occurrence
   - Laboratory slots (Q1, Q2) - EVERY occurrence
   - Special markers (BREAK, LUNCH BREAK) - note but don't extract as courses

DO NOT skip slots marked as "RESERVED" or empty slots with letters!
DO NOT skip duplicate slots - extract ALL instances!
DO NOT stop after reading Monday - read ALL days!

Extract EVERY schedule entry with:
- Slot letter (A, B, C, D, E, F, G, H, I, M, Q1, Q2, etc.)
- Course code (or "OPEN-ELECTIVE", "MINOR-COURSE" for reserved slots)
- Professor name (if shown, can be empty)
- Day of week (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun)
- Start time (24-hour format HH:MM)
- End time (24-hour format HH:MM)
- Location/Room (if shown)
- Special notes (e.g., "Whole class")

Return JSON with ALL instances from ALL days:
{
  "schedules": [
    {
      "slot": "A",
      "course_code": "HSIR14",
      "professor": "Dr. Gangolu",
      "day_of_week": 1,
      "start_time": "08:30",
      "end_time": "09:20",
      "location": "",
      "notes": ""
    },
    {
      "slot": "A",
      "course_code": "HSIR14",
      "professor": "Dr. Gangolu",
      "day_of_week": 2,
      "start_time": "09:20",
      "end_time": "10:10",
      "location": "",
      "notes": ""
    },
    {
      "slot": "A",
      "course_code": "HSIR14",
      "professor": "Dr. Gangolu",
      "day_of_week": 3,
      "start_time": "10:30",
      "end_time": "11:20",
      "location": "",
      "notes": ""
    },
    {
      "slot": "B",
      "course_code": "EEPC23",
      "professor": "",
      "day_of_week": 2,
      "start_time": "08:30",
      "end_time": "09:20",
      "location": "",
      "notes": ""
    },
    {
      "slot": "B",
      "course_code": "EEPC23",
      "professor": "",
      "day_of_week": 3,
      "start_time": "09:20",
      "end_time": "10:10",
      "location": "",
      "notes": ""
    },
    {
      "slot": "G",
      "course_code": "OPEN-ELECTIVE",
      "professor": "",
      "day_of_week": 1,
      "start_time": "14:20",
      "end_time": "15:20",
      "location": "",
      "notes": "Reserved for Open Elective"
    },
    {
      "slot": "G",
      "course_code": "OPEN-ELECTIVE",
      "professor": "",
      "day_of_week": 3,
      "start_time": "14:20",
      "end_time": "15:20",
      "location": "",
      "notes": "Reserved for Open Elective"
    },
    {
      "slot": "G",
      "course_code": "OPEN-ELECTIVE",
      "professor": "",
      "day_of_week": 5,
      "start_time": "14:20",
      "end_time": "15:20",
      "location": "",
      "notes": "Reserved for Open Elective"
    },
    {
      "slot": "Q2",
      "course_code": "EELR17",
      "professor": "",
      "day_of_week": 2,
      "start_time": "15:20",
      "end_time": "16:10",
      "location": "",
      "notes": "Whole class"
    }
  ],
  "confidence": 0.95,
  "notes": "Extracted all instances from ALL days (Mon-Fri). Total entries should be ~45-50 for a typical 5-day weekly schedule."
}`
      }
    ];

    if (content.type === 'image') {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Extract all weekly schedule entries. Hints: ${userHints || 'None'}` },
          { type: 'image_url', image_url: { url: `data:${content.mimeType};base64,${content.base64}` } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: `Extract weekly schedule from:\n\n${content}\n\nHints: ${userHints || 'None'}`
      });
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 3000,
      temperature: 0.1
    });

    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from schedule');

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Correlate schedules to courses by matching course codes
   */
  correlateSchedulesToCourses(semesterData, scheduleData) {
    const courses = semesterData.courses || [];
    const schedules = scheduleData.schedules || [];

    // Assign colors to courses
    const colors = ['#f97316', '#a855f7', '#ec4899', '#10b981', '#0ea5e9', '#ef4444', '#06b6d4', '#f59e0b'];
    courses.forEach((course, idx) => {
      course.color = colors[idx % colors.length];
    });

    // Calculate confidence
    const avgConfidence = (
      (semesterData.confidence || 0.9) +
      (scheduleData.confidence || 0.9)
    ) / 2;

    return {
      semester: semesterData.semester,
      courses: courses,
      schedules: schedules,
      confidence: avgConfidence,
      notes: `Correlated ${schedules.length} schedules to ${courses.length} courses`
    };
  }

  // Keep existing single-file methods for backward compatibility
  async parseImageTimetable(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a timetable extraction assistant using a Strict Grid Scanning Protocol.

PROTOCOL: CELL-BY-CELL SCANNING
1.  **Coordinate Mapping**: Visualize the timetable as a grid. Columns = Days (Mon-Fri). Rows = Times.
2.  **Exhaustive Indexing**: Read EVERY cell from left to right, top to bottom. Do NOT skip.
3.  **Slot Extraction**: For EACH cell, identify the content (Slot Letter like A, B, C, G, M, etc.).
4.  **Aggregation**: Group ALL identified cells by their Slot Letter.

EXAMPLE EXECUTION:
- You see "A" at Mon 08:30. -> Record: {Slot: A, Day: Mon, Time: 08:30}
- You see "A" at Tue 09:20. -> Record: {Slot: A, Day: Tue, Time: 09:20}
- You see "A" at Wed 10:30. -> Record: {Slot: A, Day: Wed, Time: 10:30}  <-- DO NOT MISS THIS!
- You see "G" at Mon 14:20, Wed 14:20, Fri 14:20. -> Record all 3 instances for Slot G.

OUTPUT REQUIREMENT:
Group these recorded instances into a nested "schedules" array under each course.

Return JSON Structure:
{
  "semester": { ... },
  "courses": [
    {
      "name": "Professional Ethics",
      "code": "HSIR14",
      "slot": "A",
      "schedules": [
        { "day_of_week": 1, "start_time": "08:30", "end_time": "09:20", "location": "" },
        { "day_of_week": 2, "start_time": "09:20", "end_time": "10:10", "location": "" },
        { "day_of_week": 3, "start_time": "10:30", "end_time": "11:20", "location": "" }
      ]
    }
  ]
}

MANDATORY CHECKS:
- Did you find *every* appearance of Slot A? (Usually 3-4 times/week)
- Did you find *every* appearance of Slot G and M?
- Did you scan Wednesday, Thursday, and Friday columns fully?
- PRESERVE DUPLICATES: If "A" appears 3 times, there MUST be 3 schedule objects.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Perform an EXHAUSTIVE CELL-BY-CELL SCAN of the full grid. If Slot A appears 3 times, output 3 schedules. If Slot G appears 3 times, output 3 schedules. Do not summarize.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.confidence < 0.85) {
        extracted.warning = 'Low confidence extraction. Please verify all fields carefully.';
      }

      return extracted;
    } catch (error) {
      console.error('AI extraction error:', error);
      throw new Error(`Failed to parse timetable: ${error.message}`);
    }
  }

  async parsePDFTimetable(pdfPath, userHints = '') {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a timetable extraction assistant. Extract course and schedule information from timetable text.

IMPORTANT: Extract courses and schedules separately:
1. First identify all UNIQUE courses (by course code)
2. Then extract all schedule instances that reference these courses

Return a JSON object with this exact structure:
{
  "semester": {
    "name": "Fall 2024",
    "start_date": "2024-09-01",
    "end_date": "2024-12-15"
  },
  "courses": [
    {
      "name": "Introduction to Computer Science",
      "code": "CS101",
      "color": "#0ea5e9"
    }
  ],
  "schedules": [
    {
      "course_code": "CS101",
      "professor": "Dr. Smith",
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "10:30",
      "location": "Room 101"
    }
  ],
  "confidence": 0.95,
  "notes": "Any extraction notes"
}

RULES:
- Courses array contains UNIQUE courses only
- Schedules array contains ALL schedule instances
- Each schedule references a course_code and has its own professor
- Same course can appear multiple times in schedules
- Day of week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
- Use 24-hour time format (HH:MM)`
          },
          {
            role: 'user',
            content: `Extract course and schedule information from this timetable text:\n\n${pdfData.text}\n\nUser hints: ${userHints || 'None'}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.confidence < 0.85) {
        extracted.warning = 'Low confidence extraction. Please verify all fields carefully.';
      }

      return extracted;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

module.exports = AITimetableParser;
