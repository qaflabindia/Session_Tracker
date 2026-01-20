# 🧠 AI Extraction Logic Enhanced: Strict Grid Scanning

## 🚨 The Issue
You correctly noticed that **Course HSIR14 (Slot A)** was missing its **Wednesday slot**.
- Extracted: Monday 08:30, Tuesday 09:20
- Missing: Wednesday 10:30

## 🛠️ The Fix: "Cell-by-Cell" Scanning Protocol

I have completely rewritten the AI's instruction set in `server/services/aiParser.js`.

### 1. New Methodology
Instead of asking the AI to "extract schedules" (which leads to glancing and summarizing), I have enforced a **Strict Grid Scanning Protocol**:

1.  **Coordinate Mapping**: It must visualize columns (Days) and Rows (Times).
2.  **Exhaustive Indexing**: It must read **EVERY** cell from left-to-right, top-to-bottom.
3.  **No skipping**: It is explicitly forbidden from skipping cells.

### 2. Specific Instructions Added
```
PROTOCOL: CELL-BY-CELL SCANNING
...
- You see "A" at Mon 08:30. -> Record: {Slot: A...}
- You see "A" at Tue 09:20. -> Record: {Slot: A...}
- You see "A" at Wed 10:30. -> Record: {Slot: A...}  <-- DO NOT MISS THIS!
...
MANDATORY CHECKS:
- Did you find *every* appearance of Slot A? (Usually 3-4 times/week)
```

## 🚀 Ready to Test
The backend server has been restarted with the new intelligence.

**Please try uploading the image again.** The AI should now strictly find all 3 occurrences of Slot A (and others).
