# AI-Assisted Timetable Import - Feature Documentation

## ✨ Overview

The Session Tracker now includes **AI-powered timetable extraction** using OpenAI's GPT-4 Vision model. Upload an image or PDF of your timetable, and the AI will automatically extract:

- Semester information (name, start/end dates)
- Course details (name, code, professor)
- Weekly schedules (day, time, location)

**Human verification is mandatory** - all AI extractions must be reviewed and approved before importing.

## 🔐 Security: API Key Vault

### Encrypted Storage
- Your OpenAI API key is **encrypted** using AES-256-CBC
- Stored securely in your user settings
- Never exposed in API responses
- Only decrypted server-side when needed

### Setting Your API Key

1. Navigate to any semester setup page
2. Click "AI Import" button
3. Click "Configure API Key"
4. Enter your OpenAI API key (starts with `sk-`)
5. Click "Save Key"

Your key is now securely stored and ready to use!

### API Endpoints

```
POST /api/api-keys/set
GET /api/api-keys/status
DELETE /api/api-keys
```

## 📤 Upload & Extract

### Supported Formats
- **Images**: PNG, JPG, GIF, WebP
- **Documents**: PDF
- **Size Limit**: 10MB

### Extraction Process

1. **Upload File**
   - Drag & drop or click to select
   - Optionally add hints (e.g., "Semester starts Sept 1")

2. **AI Processing**
   - GPT-4 Vision analyzes the image/PDF
   - Extracts structured data
   - Assigns confidence score (0-1)

3. **Human Verification**
   - Review all extracted fields
   - Edit any incorrect information
   - Add/remove courses or schedules
   - Verify dates and times

4. **Import**
   - Click "Import Timetable"
   - Data is saved to your semester
   - Ready for schedule propagation

### API Endpoints

```
POST /api/ai/parse (multipart/form-data)
GET /api/ai/extraction/:extractionId
DELETE /api/ai/extraction/:extractionId
```

## 🎯 Confidence Scoring

The AI provides a confidence score for each extraction:

- **≥ 85%**: High confidence (green indicator)
- **< 85%**: Low confidence (yellow warning)

**Low confidence extractions** require extra careful verification!

## 📋 Extraction Format

The AI returns data in this structure:

```json
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
      "professor": "Dr. Smith",
      "color": "#0ea5e9",
      "schedules": [
        {
          "day_of_week": 1,
          "start_time": "09:00",
          "end_time": "10:30",
          "location": "Room 101"
        }
      ]
    }
  ],
  "confidence": 0.95,
  "notes": "Extraction notes"
}
```

## ✏️ Human Verification UI

### Editable Fields

**Semester:**
- Name
- Start date
- End date

**Per Course:**
- Course name
- Course code
- Professor name
- Color

**Per Schedule:**
- Day of week
- Start time
- End time
- Location

### Actions Available
- ✅ Edit any field
- ➕ Add courses/schedules
- ❌ Remove courses/schedules
- 🔄 Start over (re-upload)
- ✓ Import (save to database)

## 🚀 Usage Flow

### Quick Start

1. **Go to Semester Setup**
   ```
   Dashboard → Semester → Setup → AI Import
   ```

2. **Configure API Key** (one-time)
   - Enter your OpenAI API key
   - Save securely

3. **Upload Timetable**
   - Select image or PDF
   - Add optional hints
   - Click "Extract with AI"

4. **Verify & Edit**
   - Review extracted data
   - Fix any errors
   - Adjust as needed

5. **Import**
   - Click "Import Timetable"
   - Courses and schedules are created
   - Continue to schedule propagation

## 🎨 UI Components

### API Key Configuration
- Secure password input
- Save/cancel buttons
- Status indicator (key configured ✓)

### File Upload
- Drag & drop zone
- File type validation
- Size limit enforcement
- Preview of selected file

### Hints Input
- Optional text area
- Helps AI with context
- Examples provided

### Verification Interface
- Confidence badge
- Editable form fields
- Add/remove buttons
- Color pickers for courses
- Time pickers for schedules

### Import Confirmation
- Review summary
- Start over option
- Import button with loading state

## 🔧 Technical Implementation

### Backend

**Services:**
- `AITimetableParser` class
  - `parseImageTimetable(imagePath)`
  - `parsePDFTimetable(pdfPath, hints)`

**Routes:**
- `/api/api-keys/*` - Key management
- `/api/ai/parse` - Upload & extract
- `/api/ai/extraction/:id` - Get results

**Storage:**
- Uploaded files: `server/uploads/`
- Extraction results: `server/uploads/extraction-*.json`
- Temporary storage (cleaned after import)

### Frontend

**Pages:**
- `AITimetableUpload.jsx` - Main upload & verification UI

**API Client:**
- `apiKeys.set(key)` - Save API key
- `apiKeys.getStatus()` - Check if key exists
- `aiExtraction.parseTimetable(formData)` - Upload & extract

## 📊 Example Prompts

The AI is instructed to:

1. **Extract all visible courses** from the timetable
2. **Identify patterns** (recurring schedules)
3. **Infer semester dates** from context
4. **Assign distinct colors** to each course
5. **Use 24-hour time format**
6. **Map day names** to numeric values (1=Monday)

## ⚠️ Important Notes

### Mandatory Human Verification
- **AI output never writes directly to database**
- All extractions must be reviewed
- User has final authority

### Confidence Threshold
- Extractions below 85% show warning
- Still usable, but requires extra care
- User can always edit/correct

### Data Privacy
- API key encrypted at rest
- Uploaded files deleted after extraction
- Extraction results temporary
- No data sent to OpenAI except during extraction

### Cost Considerations
- Uses OpenAI API (paid service)
- Each extraction costs ~$0.01-0.05
- User provides their own API key
- No markup or additional fees

## 🎯 Best Practices

1. **Clear Timetable Images**
   - High resolution
   - Good lighting
   - Minimal glare
   - Text readable

2. **Provide Hints**
   - Semester dates if not visible
   - Professor names if abbreviated
   - Any special context

3. **Always Verify**
   - Check all dates
   - Verify times (AM/PM)
   - Confirm professor names
   - Review locations

4. **Test First**
   - Try with one course
   - Verify accuracy
   - Then upload full timetable

## 🐛 Troubleshooting

### "OpenAI API key not configured"
- Go to AI Import page
- Click "Configure API Key"
- Enter valid key (starts with `sk-`)

### "Failed to parse timetable"
- Check file format (PNG, JPG, PDF)
- Ensure file size < 10MB
- Try adding hints
- Verify API key is valid

### Low confidence score
- Image may be unclear
- Try higher resolution
- Add more hints
- Manually verify all fields

### Incorrect extraction
- Edit fields in verification UI
- Add/remove courses as needed
- Don't rely solely on AI

## 📈 Future Enhancements

Potential improvements:

- [ ] Batch upload (multiple timetables)
- [ ] Template learning (remember patterns)
- [ ] Auto-detect semester dates
- [ ] Support for more file formats
- [ ] OCR fallback for poor images
- [ ] Extraction history/logs

## 🎉 Success Metrics

Target accuracy:
- **Field-level accuracy**: >85%
- **Course detection**: >90%
- **Time extraction**: >95%
- **User satisfaction**: Saves 10+ minutes per semester

---

**The AI is your assistant, but you're always in control!** 🤖✨
