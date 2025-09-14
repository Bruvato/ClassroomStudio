/**
 * AI Grading Results Display Component
 *
 * Shows AI analysis including score, feedback, weaknesses, and strengths
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Weakness {
  category: string;
  description: string;
  severity: "minor" | "moderate" | "major" | "critical";
  location?: string;
  suggestion: string;
}

interface Strength {
  category: string;
  description: string;
}

interface AIAnalysis {
  _id: string;
  submissionId: string;
  overallScore?: number;
  confidence: number;
  weaknesses: Weakness[];
  strengths: Strength[];
  summary: string;
  detailedFeedback: string;
  modelUsed: string;
  processingTime: number;
  analyzedAt: number;
}

interface GradingResultsProps {
  analysis: AIAnalysis;
  isTeacherView?: boolean;
  className?: string;
}

const severityConfig = {
  minor: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-200",
    icon: AlertCircle,
    label: "Minor",
  },
  moderate: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
    icon: AlertCircle,
    label: "Moderate",
  },
  major: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    icon: AlertCircle,
    label: "Major",
  },
  critical: {
    color: "text-red-800",
    bgColor: "bg-red-200",
    borderColor: "border-red-300",
    icon: AlertCircle,
    label: "Critical",
  },
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-yellow-600";
  if (score >= 60) return "text-orange-500";
  return "text-red-600";
};

const getScoreBackground = (score: number) => {
  if (score >= 90) return "bg-green-100";
  if (score >= 80) return "bg-green-50";
  if (score >= 70) return "bg-yellow-50";
  if (score >= 60) return "bg-orange-50";
  return "bg-red-50";
};

export function GradingResults({
  analysis,
  isTeacherView = false,
  className,
}: GradingResultsProps) {
  const hasScore = analysis.overallScore !== undefined;
  const score = analysis.overallScore || 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Score */}
      <Card className="border-2 border-main">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-main" />
              AI Grading Analysis
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {analysis.modelUsed}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Overall Score */}
            {hasScore && (
              <div
                className={cn(
                  "p-4 rounded-lg border-2",
                  getScoreBackground(score)
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground/70">
                    Overall Score
                  </span>
                  <Target className="w-4 h-4 text-foreground/50" />
                </div>
                <div className={cn("text-3xl font-bold", getScoreColor(score))}>
                  {score.toFixed(1)}%
                </div>
                <Progress value={score} className="mt-2" />
              </div>
            )}

            {/* Confidence */}
            <div className="p-4 rounded-lg border-2 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/70">
                  AI Confidence
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {(analysis.confidence * 100).toFixed(0)}%
              </div>
              <Progress value={analysis.confidence * 100} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <TrendingUp className="w-4 h-4" />
                Strengths ({analysis.strengths.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.strengths.map((strength, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-300 text-xs"
                      >
                        {strength.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed">
                      {strength.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <TrendingDown className="w-4 h-4" />
                Areas for Improvement ({analysis.weaknesses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.weaknesses.map((weakness, index) => {
                  const config = severityConfig[weakness.severity];
                  const Icon = config.icon;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-3 border rounded-lg",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              config.color,
                              config.borderColor
                            )}
                          >
                            {weakness.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              config.color,
                              config.borderColor
                            )}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      <p
                        className={cn(
                          "text-sm mb-2 leading-relaxed",
                          config.color
                        )}
                      >
                        <strong>Issue:</strong> {weakness.description}
                      </p>

                      {weakness.location && (
                        <p className={cn("text-xs mb-2", config.color)}>
                          <strong>Location:</strong> {weakness.location}
                        </p>
                      )}

                      <div
                        className={cn(
                          "text-sm p-2 rounded border",
                          config.bgColor,
                          config.borderColor
                        )}
                      >
                        <strong>Suggestion:</strong> {weakness.suggestion}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed">
              {analysis.detailedFeedback}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meta Information (for teachers) */}
      {isTeacherView && (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">
              Analysis Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Model:</span>
                <p className="font-medium">{analysis.modelUsed}</p>
              </div>
              <div>
                <span className="text-gray-500">Processing Time:</span>
                <p className="font-medium">
                  {analysis.processingTime.toFixed(0)}ms
                </p>
              </div>
              <div>
                <span className="text-gray-500">Analyzed:</span>
                <p className="font-medium">
                  {new Date(analysis.analyzedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>
                <p className="font-medium">
                  {(analysis.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GradingResults;
