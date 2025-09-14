/**
 * AI Grading Status Component
 *
 * Shows grading progress and allows manual triggering for testing
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface GradingStatusProps {
  submissionId: Id<"submissions">;
  status:
    | "draft"
    | "submitted"
    | "analyzing"
    | "analyzed"
    | "graded"
    | "returned";
  hasAnalysis?: boolean;
  hasSolutionFile?: boolean;
  isTeacherView?: boolean;
  className?: string;
}

const statusConfig = {
  draft: {
    label: "Draft",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: Clock,
    description: "Assignment saved as draft",
  },
  submitted: {
    label: "Submitted",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: CheckCircle2,
    description: "Assignment submitted, waiting for analysis",
  },
  analyzing: {
    label: "Analyzing",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: Loader2,
    description: "AI is analyzing your submission...",
  },
  analyzed: {
    label: "Analysis Complete",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
    description: "AI analysis completed",
  },
  graded: {
    label: "Graded",
    color: "text-main",
    bgColor: "bg-main/10",
    icon: CheckCircle2,
    description: "Assignment graded by instructor",
  },
  returned: {
    label: "Returned",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    icon: CheckCircle2,
    description: "Assignment returned with feedback",
  },
};

export function GradingStatus({
  submissionId,
  status,
  hasAnalysis = false,
  hasSolutionFile = true,
  isTeacherView = false,
  className,
}: GradingStatusProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const triggerGrading = useAction(api.grading.manualTriggerGrading);

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnalyzing = status === "analyzing";

  const handleTriggerGrading = async () => {
    console.log("🔴 [DEBUG] Trigger Analysis button clicked!");
    console.log("🔴 [DEBUG] submissionId:", submissionId);
    console.log("🔴 [DEBUG] hasSolutionFile:", hasSolutionFile);

    if (!hasSolutionFile) {
      alert("No solution file available for this assignment");
      return;
    }

    setIsTriggering(true);
    try {
      console.log("🔴 [DEBUG] Calling triggerGrading action...");
      const result = await triggerGrading({ submissionId });
      console.log("🔴 [DEBUG] triggerGrading result:", result);
    } catch (error) {
      console.error("🔴 [DEBUG] Failed to trigger grading:", error);
      alert("Failed to trigger grading. Please try again.");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-main" />
              AI Grading Status
            </div>
            <Badge
              variant="outline"
              className={cn("border-2", config.bgColor, config.color)}
            >
              <Icon
                className={cn("w-3 h-3 mr-1", isAnalyzing && "animate-spin")}
              />
              {config.label}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Status Description */}
            <p className="text-sm text-foreground/70">{config.description}</p>

            {/* No Solution File Warning */}
            {!hasSolutionFile && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No solution file has been uploaded for this assignment. AI
                  grading is not available.
                </AlertDescription>
              </Alert>
            )}

            {/* Analyzing Progress */}
            {isAnalyzing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Your submission is being analyzed by AI. This may take 1-3
                  minutes. You can close this page and check back later.
                </AlertDescription>
              </Alert>
            )}

            {/* Analysis Results Available */}
            {hasAnalysis && status === "analyzed" && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  AI analysis is complete! Scroll down to see your detailed
                  feedback, identified strengths, and areas for improvement.
                </AlertDescription>
              </Alert>
            )}

            {/* Manual Trigger (for testing/teacher view) */}
            {(isTeacherView || process.env.NODE_ENV === "development") &&
              hasSolutionFile && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={handleTriggerGrading}
                    disabled={isTriggering || isAnalyzing}
                    className="text-xs"
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Triggering...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        {hasAnalysis ? "Re-analyze" : "Trigger Analysis"}
                      </>
                    )}
                  </Button>
                  {(isTeacherView ||
                    process.env.NODE_ENV === "development") && (
                    <span className="text-xs text-foreground/50">
                      Manual trigger for testing
                    </span>
                  )}
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GradingStatus;
