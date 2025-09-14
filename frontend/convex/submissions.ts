import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import {
  getAuthenticatedMember,
  requireStudent,
  requireTeacher,
  requireOwnership,
} from "./permissions";

// Get submissions for a student
export const getStudentSubmissions = query({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const { userId } = await getAuthenticatedMember(ctx, args.classroomId);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("studentSubmissions", (q) => q.eq("studentId", userId))
      .filter((q) => q.eq(q.field("classroomId"), args.classroomId))
      .collect();

    // Get assignment details for each submission
    const submissionsWithDetails = await Promise.all(
      submissions.map(async (submission) => {
        const assignment = await ctx.db.get(submission.assignmentId);
        if (!assignment) return null;

        // Get AI analysis if available
        const aiAnalysis = await ctx.db
          .query("aiAnalyses")
          .withIndex("submission", (q) => q.eq("submissionId", submission._id))
          .first();

        return {
          ...submission,
          assignment: {
            _id: assignment._id,
            title: assignment.title,
            totalPoints: assignment.totalPoints,
            dueDate: assignment.dueDate,
          },
          aiAnalysis,
        };
      })
    );

    return submissionsWithDetails
      .filter(Boolean)
      .sort((a, b) => b!.submittedAt - a!.submittedAt);
  },
});

// Get a specific submission
export const getSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { userId, role } = await getAuthenticatedMember(
      ctx,
      submission.classroomId
    );

    // Students can only see their own submissions
    if (role === "student" && submission.studentId !== userId) {
      throw new Error("Not authorized to view this submission");
    }

    const assignment = await ctx.db.get(submission.assignmentId);
    const student = await ctx.db.get(submission.studentId);

    // Get AI analysis
    const aiAnalysis = await ctx.db
      .query("aiAnalyses")
      .withIndex("submission", (q) => q.eq("submissionId", submission._id))
      .first();

    return {
      ...submission,
      assignment: assignment
        ? {
            _id: assignment._id,
            title: assignment.title,
            description: assignment.description,
            totalPoints: assignment.totalPoints,
            dueDate: assignment.dueDate,
          }
        : null,
      student: student
        ? {
            _id: student._id,
            name: student.name,
            email: student.email,
          }
        : null,
      aiAnalysis,
    };
  },
});

// Submit an assignment
export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    fileMetadataId: v.id("fileMetadata"),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (!assignment.isPublished || !assignment.acceptSubmissions) {
      throw new Error("Assignment is not accepting submissions");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireStudent(ctx, assignment.classroomId, userId);

    // Get file metadata
    const fileMetadata = await ctx.db.get(args.fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    // Verify file belongs to the student
    if (fileMetadata.uploadedBy !== userId) {
      throw new Error("Not authorized to submit this file");
    }

    // Check if assignment is past due (allow late submissions if enabled)
    const now = Date.now();
    const isLate = assignment.dueDate ? now > assignment.dueDate : false;

    // Get classroom settings to check if late submissions are allowed
    const classroom = await ctx.db.get(assignment.classroomId);
    if (isLate && !classroom?.settings?.allowLateSubmissions) {
      throw new Error("Late submissions are not allowed for this assignment");
    }

    // Check if student already has a submission
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("assignmentStudent", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", userId)
      )
      .first();

    let attemptNumber = 1;
    if (existingSubmission) {
      // Update existing submission with new attempt
      attemptNumber = existingSubmission.attemptNumber + 1;

      await ctx.db.patch(existingSubmission._id, {
        fileId: fileMetadata.storageId,
        fileName: fileMetadata.fileName,
        fileType: fileMetadata.mimeType,
        submittedAt: now,
        isLate,
        attemptNumber,
        status: "submitted",
        // Reset grading fields
        pointsEarned: undefined,
        teacherFeedback: undefined,
        gradedBy: undefined,
        gradedAt: undefined,
      });

      // Trigger AI grading - check for solution file
      try {
        // Get full assignment data to check for solution file
        const fullAssignment = await ctx.db.get(args.assignmentId);
        if (fullAssignment && fullAssignment.solutionFileId) {
          console.log(
            `Triggering AI grading for submission ${existingSubmission._id}`
          );

          // Schedule grading trigger (non-blocking)
          await ctx.scheduler.runAfter(
            0,
            internal.grading.triggerGradingInternal,
            {
              submissionId: existingSubmission._id,
            }
          );

          console.log(
            `AI grading scheduled for submission ${existingSubmission._id}`
          );
        } else {
          console.log(
            `No solution file for assignment ${args.assignmentId}, skipping AI grading`
          );
        }
      } catch (error) {
        console.error(
          `Error scheduling AI grading for submission ${existingSubmission._id}:`,
          error
        );
        // Don't throw - submission should succeed even if grading scheduling fails
      }

      return existingSubmission._id;
    } else {
      // Create new submission
      const submissionId = await ctx.db.insert("submissions", {
        assignmentId: args.assignmentId,
        studentId: userId,
        classroomId: assignment.classroomId,
        fileId: fileMetadata.storageId,
        fileName: fileMetadata.fileName,
        fileType: fileMetadata.mimeType,
        submittedAt: now,
        isLate,
        attemptNumber,
        status: "submitted",
      });

      // Trigger AI grading - check for solution file
      try {
        // Get full assignment data to check for solution file
        const fullAssignment = await ctx.db.get(args.assignmentId);
        if (fullAssignment && fullAssignment.solutionFileId) {
          console.log(
            `Triggering AI grading for new submission ${submissionId}`
          );

          // Schedule grading trigger (non-blocking)
          await ctx.scheduler.runAfter(
            0,
            internal.grading.triggerGradingInternal,
            {
              submissionId,
            }
          );

          console.log(
            `AI grading scheduled for new submission ${submissionId}`
          );
        } else {
          console.log(
            `No solution file for assignment ${args.assignmentId}, skipping AI grading`
          );
        }
      } catch (error) {
        console.error(
          `Error scheduling AI grading for submission ${submissionId}:`,
          error
        );
        // Don't throw - submission should succeed even if grading scheduling fails
      }

      return submissionId;
    }
  },
});

// Save draft submission (without submitting)
export const saveDraft = mutation({
  args: {
    assignmentId: v.id("assignments"),
    fileMetadataId: v.id("fileMetadata"),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireStudent(ctx, assignment.classroomId, userId);

    // Get file metadata
    const fileMetadata = await ctx.db.get(args.fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    // Verify file belongs to the student
    if (fileMetadata.uploadedBy !== userId) {
      throw new Error("Not authorized to submit this file");
    }

    // Check if student already has a submission
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("assignmentStudent", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", userId)
      )
      .first();

    const now = Date.now();

    if (existingSubmission) {
      // Update existing draft
      await ctx.db.patch(existingSubmission._id, {
        fileId: fileMetadata.storageId,
        fileName: fileMetadata.fileName,
        fileType: fileMetadata.mimeType,
        status: "draft",
        // Keep original submission time if it was already submitted
        ...(existingSubmission.status === "draft" && { submittedAt: now }),
      });

      return existingSubmission._id;
    } else {
      // Create new draft
      const submissionId = await ctx.db.insert("submissions", {
        assignmentId: args.assignmentId,
        studentId: userId,
        classroomId: assignment.classroomId,
        fileId: fileMetadata.storageId,
        fileName: fileMetadata.fileName,
        fileType: fileMetadata.mimeType,
        submittedAt: now,
        isLate: false,
        attemptNumber: 1,
        status: "draft",
      });

      return submissionId;
    }
  },
});

// Withdraw a submission (mark as draft)
export const withdrawSubmission = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Only student can withdraw their own submission
    await requireOwnership(ctx, submission, userId);

    if (submission.status === "graded" || submission.status === "returned") {
      throw new Error("Cannot withdraw a graded submission");
    }

    await ctx.db.patch(args.submissionId, {
      status: "draft",
    });
  },
});

// Delete a submission (only drafts)
export const deleteSubmission = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Only student can delete their own submission, or teachers
    const { role } = await getAuthenticatedMember(ctx, submission.classroomId);

    if (role === "student") {
      await requireOwnership(ctx, submission, userId);

      if (submission.status !== "draft") {
        throw new Error("Can only delete draft submissions");
      }
    } else {
      // Teachers can delete any submission
      await requireTeacher(ctx, submission.classroomId, userId);
    }

    // Delete AI analysis if exists
    const aiAnalysis = await ctx.db
      .query("aiAnalyses")
      .withIndex("submission", (q) => q.eq("submissionId", submission._id))
      .first();

    if (aiAnalysis) {
      await ctx.db.delete(aiAnalysis._id);
    }

    // Delete the submission
    await ctx.db.delete(args.submissionId);
  },
});

// Mark submission as analyzing (for AI processing)
export const markAsAnalyzing = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    await ctx.db.patch(args.submissionId, {
      status: "analyzing",
    });
  },
});

// Mark submission as analyzed (after AI processing)
export const markAsAnalyzed = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    await ctx.db.patch(args.submissionId, {
      status: "analyzed",
    });
  },
});

// Get student's own submission for an assignment
export const getMySubmission = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireStudent(ctx, assignment.classroomId, userId);

    const submission = await ctx.db
      .query("submissions")
      .withIndex("assignmentStudent", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", userId)
      )
      .first();

    if (!submission) {
      return null;
    }

    return {
      _id: submission._id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      isLate: submission.isLate,
      attemptNumber: submission.attemptNumber,
      fileName: submission.fileName,
      fileType: submission.fileType,
      pointsEarned: submission.pointsEarned,
      teacherFeedback: submission.teacherFeedback,
      gradedAt: submission.gradedAt,
    };
  },
});

// Get submission file URL (for teachers and submission owner)
export const getSubmissionFileUrl = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { userId, role } = await getAuthenticatedMember(
      ctx,
      submission.classroomId
    );

    // Students can only access their own submissions
    if (role === "student" && submission.studentId !== userId) {
      throw new Error("Not authorized to access this submission");
    }

    // Generate file URL
    const fileUrl = await ctx.storage.getUrl(submission.fileId);

    return {
      url: fileUrl,
      fileName: submission.fileName,
      fileType: submission.fileType,
    };
  },
});
