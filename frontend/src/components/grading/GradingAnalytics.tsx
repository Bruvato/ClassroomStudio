/**
 * Assignment Grading Analytics Component
 *
 * Shows class-wide grading statistics and common patterns for teachers
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertCircle,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GradingStats {
  totalAnalyzed: number;
  averageScore: number;
  scoreDistribution: {
    above90: number;
    above80: number;
    above70: number;
    below70: number;
  };
  commonWeaknesses: Array<{
    weakness: string;
    count: number;
  }>;
}

interface GradingAnalyticsProps {
  stats: GradingStats | null;
  totalStudents: number;
  className?: string;
}

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

export function GradingAnalytics({
  stats,
  totalStudents,
  className,
}: GradingAnalyticsProps) {
  if (!stats || stats.totalAnalyzed === 0) {
    return (
      <Card className={cn("border-2 border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No AI Analysis Data Yet
          </h3>
          <p className="text-foreground/60">
            AI grading analytics will appear here once students submit
            assignments and the analysis is complete.
          </p>
        </CardContent>
      </Card>
    );
  }

  const analysisRate = (stats.totalAnalyzed / totalStudents) * 100;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Header */}
      <Card className="border-2 border-main">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-main" />
            Class Grading Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Students Analyzed */}
            <div className="p-4 rounded-lg border-2 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/70">
                  Students Analyzed
                </span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalAnalyzed} / {totalStudents}
              </div>
              <Progress value={analysisRate} className="mt-2" />
              <div className="text-xs text-blue-600 mt-1">
                {analysisRate.toFixed(1)}% completed
              </div>
            </div>

            {/* Average Score */}
            <div
              className={cn(
                "p-4 rounded-lg border-2",
                getScoreBackground(stats.averageScore)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/70">
                  Average Score
                </span>
                <Target className="w-4 h-4 text-foreground/50" />
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  getScoreColor(stats.averageScore)
                )}
              >
                {stats.averageScore.toFixed(1)}%
              </div>
              <Progress value={stats.averageScore} className="mt-2" />
            </div>

            {/* Top Issues */}
            <div className="p-4 rounded-lg border-2 bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground/70">
                  Common Issues
                </span>
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.commonWeaknesses.length}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                patterns identified
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 90-100% */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm font-medium">
                    90-100% (Excellent)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-600">
                    {stats.scoreDistribution.above90}
                  </span>
                  <div className="w-24">
                    <Progress
                      value={
                        (stats.scoreDistribution.above90 /
                          stats.totalAnalyzed) *
                        100
                      }
                      className="bg-green-100"
                    />
                  </div>
                </div>
              </div>

              {/* 80-89% */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm font-medium">80-89% (Good)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-600">
                    {stats.scoreDistribution.above80}
                  </span>
                  <div className="w-24">
                    <Progress
                      value={
                        (stats.scoreDistribution.above80 /
                          stats.totalAnalyzed) *
                        100
                      }
                      className="bg-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* 70-79% */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm font-medium">70-79% (Fair)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-yellow-600">
                    {stats.scoreDistribution.above70}
                  </span>
                  <div className="w-24">
                    <Progress
                      value={
                        (stats.scoreDistribution.above70 /
                          stats.totalAnalyzed) *
                        100
                      }
                      className="bg-yellow-100"
                    />
                  </div>
                </div>
              </div>

              {/* Below 70% */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm font-medium">
                    Below 70% (Needs Help)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">
                    {stats.scoreDistribution.below70}
                  </span>
                  <div className="w-24">
                    <Progress
                      value={
                        (stats.scoreDistribution.below70 /
                          stats.totalAnalyzed) *
                        100
                      }
                      className="bg-red-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.commonWeaknesses.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-sm text-foreground/60">
                  No common weaknesses identified yet. Great job!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.commonWeaknesses.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800">
                        {item.weakness}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-orange-700 border-orange-300"
                      >
                        {item.count} student{item.count !== 1 ? "s" : ""}
                      </Badge>
                      <div className="w-16">
                        <Progress
                          value={(item.count / stats.totalAnalyzed) * 100}
                          className="bg-orange-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {stats.commonWeaknesses.length === 5 && (
                  <p className="text-xs text-foreground/50 text-center pt-2">
                    Showing top 5 most common issues
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {stats.commonWeaknesses.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">
              📚 Teaching Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-blue-800">
                Based on the analysis, consider reviewing these topics in class:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 ml-4">
                {stats.commonWeaknesses.slice(0, 3).map((item, index) => (
                  <li key={index}>
                    {item.weakness} ({item.count} students need help)
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GradingAnalytics;
