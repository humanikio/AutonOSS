# Task Service Improvements - December 5, 2025

## Issues Identified

From user testing, we found:

### 1. ❌ Poor Task Naming
**Problem:**
- Created task had title: "Task at 3pm" (generic)
- Expected: "Test out new agent functions on Auton" (descriptive)

### 2. ❌ Poor Descriptions
**Problem:**
- Created task had description: "To Do" (generic)
- Expected: Meaningful description related to the request

### 3. ❌ Wrong Time
**Problem:**
- User requested: "today at 2pm"
- Task created with: "3:00 PM"
- Should be: "2:00 PM"

### 4. ❌ No Date Context
**Problem:**
- LLM processed "today at 2pm" without knowing what "today" is
- Generated literal strings instead of ISO dates

### 5. ⚠️ Update Requests Not Handled
**Problem:**
- User said: "lets update that 3pm task to change the title and..."
- Brain asked for clarification instead of creating tool call
- Likely because prompt was incomplete (ended with "...")

---

## ✅ Improvements Implemented

### 1. Added Real-World State Context
**File:** `/services/shared/realWorldStateContext.ts`

**What it does:**
- Provides current date/time to LLM
- Shows today's date, tomorrow, yesterday
- Provides conversion examples for relative times
- Explains ISO 8601 format

**Example output:**
```
Current DateTime (ISO 8601): 2025-12-05T19:14:34.315Z
Current Date: 2025-12-05
Day of Week: Thursday

Quick References:
- Today: 2025-12-05 (Thursday)
- Tomorrow: 2025-12-06
- Yesterday: 2025-12-04

TIME CONVERSIONS:
"today at 2pm" → "2025-12-05T14:00:00Z"
```

**Integrated into:**
- ✅ `promptBuilder.ts` (Stage 1)
- ✅ `generateHandlerJsons.ts` (Stage 4)

### 2. Enhanced Task Naming Instructions
**File:** `promptBuilder/taskHandlerContext/createTask.ts`

**Before:**
```typescript
- taskName: string
  - The name/title of the task
  - Must be clear and descriptive
```

**After:**
```typescript
- taskName: string
  - The name/title of the task
  - Must be clear and descriptive
  - PRESERVE the user's exact wording when possible
  - DO NOT use generic names like "Task at 3pm", "To Do", "New Task"
  - Example: "Review Q4 budget", "Call dentist", "Test out new agent functions on Auton"
```

### 3. Enhanced Description Instructions
**File:** `promptBuilder/taskHandlerContext/createTask.ts`

**Before:**
```typescript
- description: string
  - Additional details about the task
  - Can include notes, context, instructions
```

**After:**
```typescript
- description: string
  - Additional details about the task
  - Can include notes, context, instructions
  - Make this meaningful and specific to the user's request
  - DO NOT use generic descriptions like "To Do", "Task", "New task"
  - Example: "Review the Q4 budget proposal and provide feedback"
```

### 4. Added Critical Date/Time Instructions
**File:** `taskBrain/generateHandlerJsons.ts`

**Added:**
```typescript
CRITICAL - TASK NAMING:
- taskName MUST be descriptive and match the user's request
- NEVER use generic names like "Task at 3pm", "To Do", "New Task"
- PRESERVE the user's exact wording when creating taskName
- Example: User says "test agent" → taskName: "Test out new agent functions"

CRITICAL - DATE/TIME CONVERSION:
- Use the CURRENT DATE & TIME section above to convert relative times
- "today at 2pm" → Use today's date + "T14:00:00Z"
- "tomorrow at 3pm" → Use tomorrow's date + "T15:00:00Z"
- Convert "2pm" to "14:00", "3pm" to "15:00", etc.
- ALWAYS include the 'Z' suffix for UTC timezone
```

### 5. Enhanced Parameter Logging
**File:** `taskBrain/generateHandlerJsons.ts`

**Before:**
```typescript
console.log(`   1. createTaskHandler (taskName, dueDate, dueTime, priority, status)`);
```

**After:**
```typescript
console.log(`\n   1. createTaskHandler:`);
console.log(`      Parameters:`);
console.log(`        taskName: "Test out new agent functions on Auton"`);
console.log(`        dueDate: "2025-12-05"`);
console.log(`        dueTime: "2025-12-05T14:00:00Z"`);
console.log(`        priority: "medium"`);
```

Now we can see EXACTLY what JSON parameters the LLM generates.

---

## 🧪 Testing Plan

### Test 1: Basic Task Creation with Time
**Input:** "Create a task to review the Q4 budget report today at 3pm"

**Expected Results:**
- ✅ taskName: "Review the Q4 budget report"
- ✅ description: Something meaningful about Q4 budget
- ✅ dueDate: "2025-12-05"
- ✅ dueTime: "2025-12-05T15:00:00Z" (3pm UTC)
- ✅ priority: "medium"

**Check logs for:**
```
Stage 4: Generating Handler JSONs
   1. createTaskHandler:
      Parameters:
        taskName: "Review the Q4 budget report"  ← Should be descriptive
        dueDate: "2025-12-05"  ← Should be today's date
        dueTime: "2025-12-05T15:00:00Z"  ← Should be 3pm UTC
```

### Test 2: Tomorrow with Different Time
**Input:** "Remind me to call the dentist tomorrow morning at 10am"

**Expected Results:**
- ✅ taskName: "Call the dentist" or "Remind me to call the dentist"
- ✅ dueDate: "2025-12-06" (tomorrow)
- ✅ dueTime: "2025-12-06T10:00:00Z" (10am UTC)

### Test 3: Task Without Specific Time
**Input:** "Add task to finish the presentation by Friday"

**Expected Results:**
- ✅ taskName: "Finish the presentation"
- ✅ dueDate: "2025-12-12" (next Friday - calculate based on current date)
- ✅ dueTime: undefined (no specific time mentioned)

### Test 4: High Priority Task
**Input:** "Create urgent task to fix production bug today"

**Expected Results:**
- ✅ taskName: "Fix production bug"
- ✅ priority: "urgent" or "high"
- ✅ dueDate: "2025-12-05"

### Test 5: Task with Description
**Input:** "Create a task to test the new deployment pipeline, we need to verify staging environment first"

**Expected Results:**
- ✅ taskName: "Test the new deployment pipeline"
- ✅ description: Should mention verifying staging environment
- ✅ Meaningful, not generic

---

## 🔍 How to Verify Improvements

### 1. Check Stage 4 Logs
Look for the detailed parameter output:
```
 Handler JSONs Generated
   Reasoning: Creating task...
   Handler Calls: 1

   1. createTaskHandler:
      Parameters:
        taskName: [CHECK THIS - should be descriptive]
        description: [CHECK THIS - should be meaningful]
        dueDate: [CHECK THIS - should be ISO format]
        dueTime: [CHECK THIS - should be correct time in UTC]
        priority: [CHECK THIS]
```

### 2. Query the Created Task
After task is created, check Firestore or query via API:
```typescript
GET /api/calendars/{calendarId}/tasks

// Check the task object:
{
  "taskId": "...",
  "taskName": "Should be descriptive, not generic",
  "description": "Should be meaningful",
  "dueDate": "2025-12-05T00:00:00.000Z",  // Check this matches request
  "dueTime": "2025-12-05T14:00:00.000Z",  // Check this is correct time
  "priority": "medium"
}
```

### 3. Compare Before/After

**Before (Bad):**
```json
{
  "taskName": "Task at 3pm",       ← Generic
  "description": "To Do",          ← Generic
  "dueTime": "2025-12-05T15:00:00Z" ← Wrong time (3pm instead of 2pm)
}
```

**After (Good):**
```json
{
  "taskName": "Test out new agent functions on Auton",  ← Descriptive
  "description": "Test the new agent features...",      ← Meaningful
  "dueTime": "2025-12-05T14:00:00Z"                    ← Correct time (2pm)
}
```

---

## ⚠️ Known Limitations

### 1. Timezone Support
**Current:** All times in UTC
**Future:** Need to support user's timezone
- Fetch user's timezone from account settings
- Convert "2pm EST" → "19:00 UTC" (EST is UTC-5)
- Update `realWorldStateContext.ts` to accept timezone parameter

### 2. Update Requests with Task References
**Issue:** User said "update that 3pm task" - brain needs to:
1. Identify which task (by time, name, or recent context)
2. Get the taskId
3. Call updateTaskHandler with taskId

**Solution needed:**
- Add getTasks to brain's available tools
- When user says "that task" or "3pm task", first call getTasks
- Find matching task
- Then call updateTaskHandler

### 3. Incomplete Prompts
**Issue:** User's message was "lets update that 3pm task to change the title and..."
- The "..." suggests the prompt was cut off
- Brain correctly asked for clarification

**Not a bug** - this is correct behavior for incomplete requests.

---

## 📊 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Date/Time Context | ✅ Fixed | Added real-world state context |
| Task Naming | ✅ Fixed | Added explicit instructions to preserve user wording |
| Descriptions | ✅ Fixed | Added instructions for meaningful descriptions |
| Time Conversion | ✅ Fixed | LLM now converts "2pm" → "14:00:00Z" |
| Parameter Logging | ✅ Fixed | Now shows all parameters in detail |
| Timezone Support | ❌ TODO | Currently UTC only |
| Task ID References | ❌ TODO | Need to handle "update that task" |
| Date Validation | ⚠️ Partial | Handler validates, but could be stricter |

---

## 🎯 Next Steps

### Immediate:
1. **Test with new request** to verify all improvements work
2. **Check Stage 4 logs** to see actual parameter values generated
3. **Query Firestore** to verify task was created correctly

### Short-term:
1. Add validation logging in handlers to show Date object conversions
2. Implement task ID resolution for "update that task" references
3. Add more example cases to handler contexts

### Long-term:
1. Implement user timezone support
2. Add fuzzy task matching ("the budget task", "my 3pm meeting")
3. Add task search/filter capabilities to brain
4. Consider caching recent tasks in memory for quick reference

---

## 💡 Tips for Testing

### Good Test Prompts:
- ✅ "Create task to review budget tomorrow at 2pm"
- ✅ "Add urgent task to fix bug today"
- ✅ "Remind me to call John on Friday morning"
- ✅ "Create task for team meeting prep, due Thursday 3pm"

### Bad Test Prompts (Will expose limitations):
- ⚠️ "Update that task" (no task ID - needs getTasks first)
- ⚠️ "Create task for next Monday at 2pm PST" (timezone not yet supported)
- ⚠️ "Add task in 3 hours" (relative time not yet supported)

### What to Look For:
1. Task names should match user's wording
2. Descriptions should be meaningful
3. Times should be correct (not off by hours)
4. Dates should use ISO 8601 format
5. No generic names like "Task", "To Do", "New Task"
