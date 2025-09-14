/**
 * Convex functions for AI grading integration
 *
 * This module handles:
 * - Triggering AI grading requests to the backend
 * - Processing webhook responses from the backend
 * - Managing grading status and results
 */

import { v } from "convex/values";
import {
  action,
  httpAction,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * HTTP Action: Trigger AI grading for a submission
 * Called when a student submits an assignment
 */
export const triggerGrading = httpAction(async (ctx, request) => {
  const { submissionId } = await request.json();

  if (!submissionId) {
    return new Response(JSON.stringify({ error: "Missing submissionId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get submission details
    const submission = await ctx.runQuery(api.submissions.getSubmission, {
      submissionId,
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get assignment and solution file info
    const assignment = submission.assignment;
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Get full assignment data to access solutionFileId
    const assignmentData = await ctx.runQuery(api.assignments.getAssignment, {
      assignmentId: assignment._id,
    });

    if (!assignmentData || !assignmentData.solutionFileId) {
      throw new Error("Assignment or solution file not found");
    }

    // Get file URLs for both submission and solution
    const submissionFileUrl = await ctx.runQuery(
      api.submissions.getSubmissionFileUrl,
      {
        submissionId,
      }
    );

    const solutionFileUrl = await ctx.runQuery(api.files.getFileUrl, {
      fileMetadataId: assignmentData.solutionFileId,
    });

    // Check that URLs are available
    if (!submissionFileUrl.url || !solutionFileUrl.url) {
      throw new Error("Could not generate file URLs");
    }

    // Mark submission as analyzing
    await ctx.runMutation(api.submissions.markAsAnalyzing, { submissionId });

    // Trigger backend processing
    await ctx.runAction(internal.grading.callBackendGrading, {
      submissionId,
      studentPdfUrl: submissionFileUrl.url,
      solutionPdfUrl: solutionFileUrl.url,
      assignmentContext: {
        title: assignment.title,
        description: assignment.description,
        total_points: assignment.totalPoints,
        subject: "General", // Could be made dynamic
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Grading started",
        submissionId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error triggering grading:", error);

    // Try to mark submission as failed
    try {
      await ctx.runMutation(api.submissions.markAsAnalyzed, { submissionId });
    } catch {}

    return new Response(
      JSON.stringify({
        error: "Failed to trigger grading",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Internal Action: Trigger grading (called by scheduler)
 */
export const triggerGradingInternal = internalAction({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const { submissionId } = args;

    console.log(
      `🔧 [DEBUG] triggerGradingInternal called for submission ${submissionId}`
    );

    try {
      console.log(`🔧 [DEBUG] Getting submission details...`);
      // Get submission details
      const submission = await ctx.runQuery(api.submissions.getSubmission, {
        submissionId,
      });

      if (!submission) {
        console.log(`🔧 [DEBUG] Submission not found: ${submissionId}`);
        throw new Error("Submission not found");
      }

      console.log(`🔧 [DEBUG] Found submission:`, {
        id: submission._id,
        status: submission.status,
      });

      // Get assignment and get solution file info
      const assignment = submission.assignment;
      if (!assignment) {
        console.log(
          `🔧 [DEBUG] No assignment found for submission ${submissionId}, skipping AI grading`
        );
        return;
      }

      console.log(`🔧 [DEBUG] Found assignment:`, {
        id: assignment._id,
        title: assignment.title,
      });

      // Check if assignment has a solution file
      const assignmentData = await ctx.runQuery(api.assignments.getAssignment, {
        assignmentId: assignment._id,
      });

      if (!assignmentData || !assignmentData.solutionFileId) {
        console.log(
          `🔧 [DEBUG] No solution file for assignment ${assignment._id}, skipping AI grading`
        );
        return;
      }

      console.log(`🔧 [DEBUG] Assignment has solution file:`, {
        solutionFileId: assignmentData.solutionFileId,
      });

      // Get file URLs for both submission and solution
      console.log(`🔧 [DEBUG] Getting file URLs...`);
      const submissionFileUrl = await ctx.runQuery(
        api.submissions.getSubmissionFileUrl,
        {
          submissionId,
        }
      );

      const solutionFileUrl = await ctx.runQuery(api.files.getFileUrl, {
        fileMetadataId: assignmentData.solutionFileId,
      });

      console.log(`🔧 [DEBUG] File URLs retrieved:`, {
        submissionUrl: submissionFileUrl.url ? "✓" : "✗",
        solutionUrl: solutionFileUrl.url ? "✓" : "✗",
      });

      // Check that URLs are available
      if (!submissionFileUrl.url || !solutionFileUrl.url) {
        throw new Error("Could not generate file URLs");
      }

      // Mark submission as analyzing
      console.log(`🔧 [DEBUG] Marking submission as analyzing...`);
      await ctx.runMutation(api.submissions.markAsAnalyzing, { submissionId });

      // Call backend grading
      console.log(`🔧 [DEBUG] Calling backend grading action...`);
      await ctx.runAction(internal.grading.callBackendGrading, {
        submissionId,
        studentPdfUrl: submissionFileUrl.url,
        solutionPdfUrl: solutionFileUrl.url,
        assignmentContext: {
          title: assignment.title,
          description: assignment.description,
          total_points: assignment.totalPoints,
          subject: "General",
        },
      });

      console.log(
        `🔧 [DEBUG] ✅ AI grading triggered for submission ${submissionId}`
      );

      // Return success result
      return {
        success: true,
        message: "Internal grading action completed",
        submissionId: submissionId,
      };
    } catch (error) {
      console.error(
        `🔧 [DEBUG] ❌ Error in triggerGradingInternal for submission ${submissionId}:`,
        error
      );
      console.error(`🔧 [DEBUG] Error details:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        error,
      });

      // Mark as analyzed (failed)
      await ctx.runMutation(internal.grading.handleGradingError, {
        submissionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return error result
      return {
        success: false,
        message: "Internal grading action failed",
        error: error instanceof Error ? error.message : "Unknown error",
        submissionId: submissionId,
      };
    }
  },
});

/**
 * Internal Action: Call the backend grading service
 */
export const callBackendGrading = internalAction({
  args: {
    submissionId: v.id("submissions"),
    studentPdfUrl: v.string(),
    solutionPdfUrl: v.string(),
    assignmentContext: v.object({
      title: v.string(),
      description: v.string(),
      total_points: v.number(),
      subject: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { submissionId, studentPdfUrl, solutionPdfUrl, assignmentContext } =
      args;

    console.log(
      `🚀 [DEBUG] callBackendGrading called for submission ${submissionId}`
    );

    // Backend URL - make this configurable
    const backendUrl =
      process.env.GRADING_BACKEND_URL || "http://localhost:8000";

    console.log(`🚀 [DEBUG] Backend URL: ${backendUrl}`);
    console.log(
      `🚀 [DEBUG] GRADING_BACKEND_URL env var:`,
      process.env.GRADING_BACKEND_URL
    );

    // Webhook URL for backend to call back with results
    const convexSiteUrl = process.env.CONVEX_SITE_URL;
    const webhookUrl = convexSiteUrl
      ? `${convexSiteUrl}/grading/webhook`
      : "http://localhost:3000/api/grading/webhook"; // Fallback for dev

    console.log(`🚀 [DEBUG] Webhook URL: ${webhookUrl}`);
    console.log(
      `🚀 [DEBUG] CONVEX_SITE_URL env var:`,
      process.env.CONVEX_SITE_URL
    );

    const requestBody = {
      submission_id: submissionId,
      student_pdf_url: studentPdfUrl,
      solution_pdf_url: solutionPdfUrl,
      assignment_context: assignmentContext,
      max_pages: 10, // Limit for development
      webhook_url: webhookUrl,
    };

    console.log(
      `🚀 [DEBUG] Calling backend API for submission ${submissionId}:`,
      {
        backendUrl,
        endpoint: "/api/grading/grade-submission",
        submissionId,
        webhookUrl,
        requestBody,
      }
    );

    try {
      console.log(
        `🚀 [DEBUG] Making fetch request to: ${backendUrl}/api/grading/grade-submission`
      );
      const response = await fetch(
        `${backendUrl}/api/grading/grade-submission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log(
        `📡 Backend API response status: ${response.status} for submission ${submissionId}`
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error(
          `❌ Backend API error for submission ${submissionId}:`,
          errorData
        );
        throw new Error(
          `Backend request failed: ${response.status} ${errorData}`
        );
      }

      const result = await response.json();
      console.log(
        `✅ Backend grading started successfully for submission ${submissionId}:`,
        result
      );

      return result;
    } catch (error) {
      console.error("Error calling backend:", error);

      // Mark submission as failed
      await ctx.runMutation(internal.grading.handleGradingError, {
        submissionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  },
});

/**
 * HTTP Action: Webhook endpoint for backend results
 */
export const webhook = httpAction(async (ctx, request) => {
  try {
    const data = await request.json();

    if (data.status === "error") {
      await ctx.runMutation(internal.grading.handleGradingError, {
        submissionId: data.submission_id,
        error: data.error,
      });
    } else {
      await ctx.runMutation(internal.grading.storeGradingResults, data);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return new Response(
      JSON.stringify({
        error: "Webhook processing failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Internal Mutation: Store grading results from backend
 */
export const storeGradingResults = internalMutation({
  args: {
    submission_id: v.id("submissions"),
    overall_score: v.optional(v.number()),
    confidence: v.number(),
    weaknesses: v.array(v.any()),
    strengths: v.array(v.any()),
    summary: v.string(),
    detailed_feedback: v.string(),
    criteria_scores: v.any(),
    processing_time_ms: v.number(),
    model_used: v.string(),
    analyzed_at: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      submission_id,
      overall_score,
      confidence,
      weaknesses,
      strengths,
      summary,
      detailed_feedback,
      criteria_scores,
      processing_time_ms,
      model_used,
      analyzed_at,
    } = args;

    // Store in aiAnalyses table
    await ctx.db.insert("aiAnalyses", {
      submissionId: submission_id,
      overallScore: overall_score,
      confidence,
      weaknesses: weaknesses.map((w: any) => ({
        category: w.category,
        description: w.description,
        severity: w.severity,
        location: w.location || undefined,
        suggestion: w.suggestion,
      })),
      strengths: strengths.map((s: any) => ({
        category: s.category,
        description: s.description,
      })),
      summary,
      detailedFeedback: detailed_feedback,
      modelUsed: model_used,
      processingTime: processing_time_ms,
      analyzedAt: new Date(analyzed_at).getTime(),
    });

    // Mark submission as analyzed
    await ctx.db.patch(submission_id, {
      status: "analyzed",
    });

    console.log(
      `Stored AI analysis for submission ${submission_id}: ${overall_score}/100`
    );
  },
});

/**
 * Internal Mutation: Handle grading errors
 */
export const handleGradingError = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const { submissionId, error } = args;

    // Mark submission as analyzed (so it's not stuck in "analyzing" state)
    await ctx.db.patch(submissionId, {
      status: "submitted", // Reset to submitted state
    });

    // Could also store error information in a separate table if needed
    console.error(`Grading failed for submission ${submissionId}: ${error}`);
  },
});

/**
 * Query: Get AI analysis for a submission
 */
export const getSubmissionAnalysis = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const analysis = await ctx.db
      .query("aiAnalyses")
      .withIndex("submission", (q) => q.eq("submissionId", args.submissionId))
      .first();

    return analysis;
  },
});

/**
 * Query: Get AI analyses for all submissions in an assignment
 */
export const getAssignmentAnalyses = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    // Get all submissions for this assignment
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("assignmentStudent", (q) =>
        q.eq("assignmentId", args.assignmentId)
      )
      .collect();

    // Get analyses for each submission
    const analyses = await Promise.all(
      submissions.map(async (submission) => {
        const analysis = await ctx.db
          .query("aiAnalyses")
          .withIndex("submission", (q) => q.eq("submissionId", submission._id))
          .first();

        return {
          submissionId: submission._id,
          studentId: submission.studentId,
          analysis,
        };
      })
    );

    return analyses.filter((a) => a.analysis !== null);
  },
});

/**
 * Internal Action: Simple test to verify internal action logging
 */
export const testInternalAction = internalAction({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    console.log(
      `🧪 [TEST] Internal action called for submission ${args.submissionId}`
    );
    console.log(
      `🧪 [TEST] This should appear in logs if internal actions log properly`
    );

    return {
      success: true,
      message: "Test internal action completed",
      submissionId: args.submissionId,
    };
  },
});

/**
 * Action: Manually trigger grading for a submission (for testing)
 * Using action instead of mutation to call internal action directly
 */
export const manualTriggerGrading = action({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    console.log(
      `🔧 Manual grading trigger requested for submission ${args.submissionId}`
    );

    try {
      // First test if internal actions log properly
      console.log(`🔧 [DEBUG] Testing internal action logging...`);
      const testResult = await ctx.runAction(
        internal.grading.testInternalAction,
        {
          submissionId: args.submissionId,
        }
      );
      console.log(`🔧 [DEBUG] testInternalAction returned:`, testResult);

      console.log(
        `🔧 [DEBUG] About to call triggerGradingInternal for submission ${args.submissionId}...`
      );

      // Call the internal grading function directly (no scheduler)
      const result = await ctx.runAction(
        internal.grading.triggerGradingInternal,
        {
          submissionId: args.submissionId,
        }
      );

      console.log(`🔧 [DEBUG] triggerGradingInternal returned:`, result);

      console.log(
        `✅ Manual grading trigger completed for submission ${args.submissionId}`
      );

      return {
        success: true,
        message: "Grading trigger completed",
        submissionId: args.submissionId,
      };
    } catch (error) {
      console.error(
        `❌ Failed to trigger manual grading for submission ${args.submissionId}:`,
        error
      );
      throw new Error(
        `Failed to trigger grading: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
});

/**
 * Query: Get grading statistics for an assignment
 */
export const getGradingStats = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    // Call getAssignmentAnalyses logic directly to avoid circular dependency
    // Get all submissions for this assignment
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("assignmentStudent", (q) =>
        q.eq("assignmentId", args.assignmentId)
      )
      .collect();

    // Get analyses for each submission
    const analyses = await Promise.all(
      submissions.map(async (submission) => {
        const analysis = await ctx.db
          .query("aiAnalyses")
          .withIndex("submission", (q) => q.eq("submissionId", submission._id))
          .first();

        return {
          submissionId: submission._id,
          studentId: submission.studentId,
          analysis,
        };
      })
    );

    // Filter out submissions without analysis
    const filteredAnalyses = analyses.filter((a) => a.analysis !== null);

    if (filteredAnalyses.length === 0) {
      return null;
    }

    const scores: number[] = filteredAnalyses
      .filter((a: any) => a.analysis?.overallScore !== undefined)
      .map((a: any) => a.analysis!.overallScore!);

    const averageScore: number =
      scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : 0;

    // Collect common weaknesses
    const allWeaknesses: any[] = filteredAnalyses.flatMap(
      (a: any) => a.analysis?.weaknesses || []
    );
    const weaknessFrequency: Record<string, number> = {};

    allWeaknesses.forEach((w: any) => {
      const key = `${w.category}: ${w.description}`;
      weaknessFrequency[key] = (weaknessFrequency[key] || 0) + 1;
    });

    const commonWeaknesses = Object.entries(weaknessFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([weakness, count]) => ({ weakness, count }));

    return {
      totalAnalyzed: filteredAnalyses.length,
      averageScore,
      scoreDistribution: {
        above90: scores.filter((s: number) => s >= 90).length,
        above80: scores.filter((s: number) => s >= 80 && s < 90).length,
        above70: scores.filter((s: number) => s >= 70 && s < 80).length,
        below70: scores.filter((s: number) => s < 70).length,
      },
      commonWeaknesses,
    };
  },
});
