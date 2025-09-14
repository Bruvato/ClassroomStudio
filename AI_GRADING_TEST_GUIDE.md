# 🤖 AI Grading System - Complete Test Guide

## 📋 **Quick Test Checklist**

### ✅ **Prerequisites**

- [ ] Backend running: `export GOOGLE_AI_API_KEY="your_key" && cd backend && uv run fastapi dev`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Convex deployed: `npx convex dev` (should compile without errors)

### 🎯 **Test Flow: Student Submission → AI Grading**

#### **Step 1: Create Assignment with Solution**

1. **Go to Classwork** → Create Assignment
2. **Upload Solution PDF** - This is CRITICAL for AI grading to work
3. **Publish Assignment** - Make sure it's accepting submissions

#### **Step 2: Submit as Student**

1. **Switch to student account** (or use incognito)
2. **Go to the assignment** page
3. **Submit a PDF** - Upload a test assignment
4. **Watch the magic happen!** ✨

### 📊 **What You Should See**

#### **Immediate Feedback (Logs)**

Check your browser console and Convex dashboard for these logs:

```
🔧 Triggering AI grading for new submission ${submissionId}
✅ AI grading scheduled for new submission ${submissionId}
🚀 Calling backend API for submission ${submissionId}
📡 Backend API response status: 200 for submission ${submissionId}
✅ Backend grading started successfully for submission ${submissionId}
```

#### **UI Changes**

1. **"AI Grading" tab** appears on assignment page
2. **Status shows "Analyzing..."** with spinner
3. **After 1-3 minutes**: Status changes to "Analysis Complete"
4. **Rich results display**: Scores, strengths, weaknesses, detailed feedback

#### **Teacher View**

- **Class Analytics**: Score distributions, common patterns
- **Manual Controls**: "Trigger Analysis" button for testing

### 🛠️ **Manual Testing Options**

#### **Option 1: Use UI Button**

- In development mode, you'll see "Trigger Analysis" button
- Click it to manually trigger grading for any submission

#### **Option 2: Browser Console**

```javascript
// Manually trigger grading for a submission
const triggerGrading = convex.mutation(api.grading.manualTriggerGrading);
await triggerGrading({ submissionId: "your_submission_id_here" });
```

#### **Option 3: Direct Backend Test**

```bash
# Test backend PDF processing
curl -X POST "http://localhost:8000/api/grading/test-pdf-processing?pdf_url=YOUR_PDF_URL&max_pages=2"

# Check backend health
curl "http://localhost:8000/api/grading/health"
```

### 🐛 **Troubleshooting Guide**

#### **No "AI Grading" tab**

- ✅ Assignment has solution PDF uploaded
- ✅ Student has submitted assignment
- ✅ Check browser console for errors

#### **Stuck on "Analyzing..."**

- ✅ Backend is running and healthy
- ✅ `GOOGLE_AI_API_KEY` is set correctly
- ✅ Check backend logs for API errors
- ✅ Verify PDF URLs are accessible

#### **No Results After Analysis**

- ✅ Check Convex function logs
- ✅ Verify webhook URL is correct
- ✅ Backend can reach Convex webhook endpoint

#### **Backend API Not Called**

- ✅ Check Convex logs: Should see "Triggering AI grading..." messages
- ✅ Verify assignment has `solutionFileId` in database
- ✅ Check scheduler is working (Convex dashboard)

### 📈 **Expected Log Flow**

#### **1. Student Submits**

```
Console: "Triggering AI grading for new submission abc123"
Console: "AI grading scheduled for new submission abc123"
```

#### **2. Scheduler Executes**

```
Convex: "AI grading triggered for submission abc123"
Console: "🚀 Calling backend API for submission abc123"
```

#### **3. Backend Processing**

```
Backend: "Starting grading request for submission abc123"
Backend: "Processing student PDF: 2 pages"
Backend: "Processing solution PDF: 3 pages"
Backend: "AI analysis completed: 85.5/100"
```

#### **4. Results Return**

```
Convex: "Webhook received for submission abc123"
Console: "Stored AI analysis for submission abc123: 85.5/100"
UI: Status changes to "Analysis Complete"
```

### 🎯 **Success Criteria**

Your AI grading system is working correctly when:

- [x] **Submissions automatically trigger grading** (no manual intervention)
- [x] **Backend API gets called** with correct PDF URLs
- [x] **Students see real-time status** ("Analyzing..." → "Complete")
- [x] **Rich feedback displays** (scores, strengths, weaknesses)
- [x] **Teachers get analytics** (class stats, common patterns)
- [x] **Error handling works** (graceful failures, helpful messages)

### 🚀 **Advanced Testing**

#### **Load Testing**

- Submit multiple assignments simultaneously
- Verify queue handling and rate limiting

#### **Error Scenarios**

- Invalid PDF files
- Missing solution files
- Network connectivity issues
- API key problems

#### **Edge Cases**

- Very large PDF files
- Multi-page documents
- Different file formats

---

## 🎉 **You're All Set!**

Your AI grading system should now automatically process student submissions and provide rich, detailed feedback. The complete flow from submission to results should work seamlessly!

**Need help?** Check the logs at each step using the troubleshooting guide above.
