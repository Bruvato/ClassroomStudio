"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDisplay } from "@/components/ui/file-display";
import { EditAssignmentModal } from "@/components/classroom/EditAssignmentModal";
import { SubmissionModal } from "@/components/classroom/SubmissionModal";
import { GradingResults } from "@/components/grading/GradingResults";
import { GradingStatus } from "@/components/grading/GradingStatus";
import { GradingAnalytics } from "@/components/grading/GradingAnalytics";
import {
  Calendar,
  Clock,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trophy,
  BookOpen,
  Target,
  ArrowLeft,
  Upload,
  MessageSquare,
  GraduationCap,
  Eye,
  Brain,
} from "lucide-react";
import { formatDistanceToNow, format, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AssignmentPageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default function AssignmentPage({ params }: AssignmentPageProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const resolvedParams = use(params);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "instructions" | "submissions" | "grades" | "grading"
  >("instructions");

  const classroomId = resolvedParams.id as Id<"classrooms">;
  const assignmentId = resolvedParams.assignmentId as Id<"assignments">;

  const classroom = useQuery(
    api.classrooms.getClassroom,
    !isAuthenticated ? "skip" : { classroomId }
  );

  const assignment = useQuery(
    api.assignments.getAssignment,
    !isAuthenticated ? "skip" : { assignmentId }
  );

  const memberStats = useQuery(
    api.members.getMemberStats,
    !isAuthenticated || !classroom ? "skip" : { classroomId }
  );

  const solutionFile = useQuery(
    api.files.getFileMetadata,
    !isAuthenticated || !assignment?.solutionFileId
      ? "skip"
      : { fileMetadataId: assignment.solutionFileId }
  );

  const submissions = useQuery(
    api.assignments.getAssignmentSubmissions,
    !isAuthenticated || !assignment || classroom?.userRole === "student"
      ? "skip"
      : { assignmentId }
  );

  const mySubmission = useQuery(
    api.submissions.getMySubmission,
    !isAuthenticated || !assignment || classroom?.userRole !== "student"
      ? "skip"
      : { assignmentId }
  );

  // AI Grading queries - must be before early return to maintain hook order
  const myAnalysis = useQuery(
    api.grading.getSubmissionAnalysis,
    !isAuthenticated || !mySubmission
      ? "skip"
      : { submissionId: mySubmission._id }
  );

  const gradingStats = useQuery(
    api.grading.getGradingStats,
    !isAuthenticated ||
      !assignment ||
      (classroom?.userRole !== "instructor" && classroom?.userRole !== "ta")
      ? "skip"
      : { assignmentId }
  );

  if (!classroom || !assignment) {
    return <Loading message="Loading assignment..." size="lg" showCard />;
  }

  const isTeacher =
    classroom.userRole === "instructor" || classroom.userRole === "ta";
  const hasValidDueDate = assignment.dueDate && assignment.dueDate !== 0; // Any valid timestamp
  const isOverdue = hasValidDueDate
    ? isAfter(new Date(), new Date(assignment.dueDate))
    : false;
  const isDraft = !assignment.isPublished;
  const totalStudents = memberStats?.students || 0;
  const submissionCount = assignment.totalSubmissions || 0;
  const submissionRate =
    totalStudents > 0 ? submissionCount / totalStudents : 0;

  const getStatusInfo = () => {
    if (isDraft) {
      return {
        icon: Edit,
        text: "Draft",
        color: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
      };
    }

    if (submissionCount === totalStudents && totalStudents > 0) {
      return {
        icon: CheckCircle2,
        text: "All Submitted",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
      };
    } else if (isOverdue) {
      return {
        icon: AlertCircle,
        text: "Overdue",
        color: "text-red-600",
        bgColor: "bg-red-50 border-red-200",
      };
    } else {
      return {
        icon: Clock,
        text: "Active",
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-200",
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleBack = () => {
    router.push(`/classrooms/${resolvedParams.id}/classwork`);
  };

  const tabs = isTeacher
    ? [
        { id: "instructions" as const, label: "Instructions", icon: BookOpen },
        { id: "submissions" as const, label: "Submissions", icon: Upload },
        { id: "grading" as const, label: "AI Grading", icon: Brain },
        { id: "grades" as const, label: "Grades", icon: GraduationCap },
      ]
    : [
        { id: "instructions" as const, label: "Instructions", icon: BookOpen },
        ...(mySubmission
          ? [{ id: "grading" as const, label: "AI Grading", icon: Brain }]
          : []),
      ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-foreground/70 hover:text-foreground"
              >
                <ArrowLeft size={16} />
                Back to Classwork
              </Button>
            </div>

            {isTeacher && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit size={16} />
                Edit Assignment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Assignment Header */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-base bg-main border-2 border-border shadow-shadow flex items-center justify-center">
                      <FileText size={28} className="text-main-foreground" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-heading text-foreground mb-2">
                        {assignment.title}
                      </h1>
                      <div className="flex items-center gap-4 text-base text-foreground/80">
                        <span>{assignment.category || "Uncategorized"}</span>
                        <span>•</span>
                        <span>{assignment.totalPoints} points</span>
                        {hasValidDueDate && (
                          <>
                            <span>•</span>
                            <span className={cn(isOverdue && "text-red-600")}>
                              Due{" "}
                              {format(
                                new Date(assignment.dueDate),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "px-4 py-2 text-sm font-medium",
                      statusInfo.bgColor,
                      statusInfo.color
                    )}
                  >
                    <StatusIcon size={16} className="mr-2" />
                    {statusInfo.text}
                  </Badge>
                </div>

                {/* Assignment Description */}
                <div className="space-y-4">
                  <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === tab.id
                          ? "border-main text-main"
                          : "border-transparent text-foreground/60 hover:text-foreground hover:border-foreground/30"
                      )}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {tab.id === "submissions" && isTeacher && (
                        <Badge
                          variant="outline"
                          className="ml-1 font-mono text-xs"
                        >
                          {submissionCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === "instructions" && (
                <div className="space-y-6">
                  {/* Instructions */}
                  {assignment.instructions && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                          <BookOpen size={20} />
                          Instructions
                        </h3>
                        <div className="prose max-w-none">
                          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                            {assignment.instructions}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Solution File (Teachers Only) */}
                  {isTeacher && solutionFile && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                          <Target size={20} />
                          Solution File
                        </h3>
                        <FileDisplay
                          fileMetadataId={solutionFile._id}
                          showDownload={true}
                          showDelete={false}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Grading Rubric */}
                  {assignment.rubric &&
                    assignment.rubric.criteria.length > 0 && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                            <CheckCircle2 size={20} />
                            Grading Rubric
                          </h3>
                          <div className="space-y-4">
                            {assignment.rubric.criteria.map(
                              (criterion, index) => (
                                <div
                                  key={index}
                                  className="border border-border rounded-base p-4 bg-secondary-background"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-foreground">
                                      {criterion.name}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="font-mono"
                                    >
                                      {criterion.points} pts
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-foreground/80">
                                    {criterion.description}
                                  </p>
                                </div>
                              )
                            )}
                            <Separator />
                            <div className="flex justify-between items-center font-medium">
                              <span className="text-foreground/70">
                                Total Points:
                              </span>
                              <span className="text-foreground text-lg">
                                {assignment.totalPoints} pts
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              )}

              {activeTab === "submissions" && isTeacher && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                      <Upload size={20} />
                      Student Submissions
                    </h3>
                    {!submissions ? (
                      <Loading message="Loading submissions..." />
                    ) : submissions.length === 0 ? (
                      <div className="text-center py-8">
                        <Upload
                          size={48}
                          className="text-foreground/40 mx-auto mb-4"
                        />
                        <p className="text-foreground/80">No submissions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {submissions.map((submission) => (
                          <div
                            key={submission._id}
                            className="flex items-center justify-between p-4 border border-border rounded-base hover:bg-secondary-background transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-main/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-main">
                                  {submission.student?.name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {submission.student?.name ||
                                    "Unknown Student"}
                                </p>
                                <p className="text-sm text-foreground/60">
                                  {submission.fileName} •{" "}
                                  {format(
                                    new Date(submission.submittedAt),
                                    "MMM d, h:mm a"
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  submission.status === "graded" &&
                                    "bg-green-50 text-green-600 border-green-200",
                                  submission.status === "submitted" &&
                                    "bg-blue-50 text-blue-600 border-blue-200"
                                )}
                              >
                                {submission.status}
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <Eye size={16} />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "grading" && (
                <div className="space-y-6">
                  {/* Teacher View: Class Analytics */}
                  {isTeacher && (
                    <GradingAnalytics
                      stats={gradingStats}
                      totalStudents={totalStudents}
                    />
                  )}

                  {/* Student View: Individual Grading Status and Results */}
                  {!isTeacher && mySubmission && (
                    <>
                      <GradingStatus
                        submissionId={mySubmission._id}
                        status={mySubmission.status}
                        hasAnalysis={!!myAnalysis}
                        hasSolutionFile={!!assignment.solutionFileId}
                        isTeacherView={false}
                      />

                      {myAnalysis && (
                        <GradingResults
                          analysis={myAnalysis}
                          isTeacherView={false}
                        />
                      )}
                    </>
                  )}

                  {/* No submission yet */}
                  {!isTeacher && !mySubmission && (
                    <Card className="border-2 border-dashed">
                      <CardContent className="p-8 text-center">
                        <Brain className="w-12 h-12 text-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Submission Yet
                        </h3>
                        <p className="text-foreground/60 mb-4">
                          Submit your assignment to see AI grading and feedback.
                        </p>
                        <Button onClick={() => setSubmissionModalOpen(true)}>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Assignment
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === "grades" && isTeacher && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-heading text-foreground mb-4 flex items-center gap-2">
                      <GraduationCap size={20} />
                      Grade Summary
                    </h3>
                    <div className="text-center py-8">
                      <GraduationCap
                        size={48}
                        className="text-foreground/40 mx-auto mb-4"
                      />
                      <p className="text-foreground/80">
                        Grade summary coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Assignment Stats */}
            {isTeacher && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading text-foreground mb-4">
                    Assignment Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">
                        Total Students
                      </span>
                      <span className="font-medium text-foreground">
                        {totalStudents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">
                        Submissions
                      </span>
                      <span className="font-medium text-foreground">
                        {submissionCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">
                        Submission Rate
                      </span>
                      <span className="font-medium text-foreground">
                        {Math.round(submissionRate * 100)}%
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">Points</span>
                      <span className="font-medium text-foreground">
                        {assignment.totalPoints}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Due Date Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={20} className="text-foreground/60" />
                  <h3 className="text-lg font-heading text-foreground">
                    Due Date
                  </h3>
                </div>
                {hasValidDueDate ? (
                  <div>
                    <p
                      className={cn(
                        "text-lg font-medium mb-1",
                        isOverdue ? "text-red-600" : "text-foreground"
                      )}
                    >
                      {format(new Date(assignment.dueDate), "EEEE, MMM d")}
                    </p>
                    <p
                      className={cn(
                        "text-sm mb-2",
                        isOverdue ? "text-red-600" : "text-foreground/70"
                      )}
                    >
                      {format(new Date(assignment.dueDate), "h:mm a")}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {formatDistanceToNow(new Date(assignment.dueDate), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-foreground/80">No due date set</p>
                )}
              </CardContent>
            </Card>

            {/* Student Actions */}
            {!isTeacher && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-heading text-foreground mb-4">
                    Your Work
                  </h3>
                  <div className="space-y-3">
                    {mySubmission ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary-background rounded-base border-2 border-border">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-base flex items-center justify-center",
                                mySubmission.status === "submitted"
                                  ? "bg-main text-main-foreground"
                                  : mySubmission.status === "graded"
                                  ? "bg-green-600 text-white"
                                  : "bg-secondary text-foreground/60"
                              )}
                            >
                              {mySubmission.status === "submitted" ? (
                                <CheckCircle2 size={16} />
                              ) : mySubmission.status === "graded" ? (
                                <Trophy size={16} />
                              ) : (
                                <FileText size={16} />
                              )}
                            </div>
                            <div>
                              <p className="font-base text-foreground">
                                {mySubmission.status === "submitted" &&
                                  "Turned in"}
                                {mySubmission.status === "draft" &&
                                  "Draft saved"}
                                {mySubmission.status === "graded" &&
                                  `Graded: ${mySubmission.pointsEarned}/${assignment.totalPoints} points`}
                                {mySubmission.isLate && " (Late)"}
                              </p>
                              <p className="text-sm text-foreground/60">
                                {mySubmission.fileName} •{" "}
                                {formatDistanceToNow(
                                  new Date(mySubmission.submittedAt),
                                  { addSuffix: true }
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSubmissionModalOpen(true)}
                          >
                            <Eye size={16} />
                            View
                          </Button>
                        </div>
                        {mySubmission.status !== "graded" && (
                          <Button
                            className="w-full justify-start"
                            size="sm"
                            onClick={() => setSubmissionModalOpen(true)}
                          >
                            <Upload size={16} />
                            {mySubmission.status === "draft"
                              ? "Complete Submission"
                              : "Resubmit"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => setSubmissionModalOpen(true)}
                      >
                        <Upload size={16} />
                        Turn in Assignment
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <MessageSquare size={16} />
                      Add Comment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <EditAssignmentModal
          assignmentId={assignmentId}
          classroomId={classroomId}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
        />
      )}

      {/* Submission Modal */}
      {submissionModalOpen && (
        <SubmissionModal
          isOpen={submissionModalOpen}
          onClose={() => setSubmissionModalOpen(false)}
          assignmentId={assignmentId}
          assignmentTitle={assignment.title}
          dueDate={assignment.dueDate}
          acceptSubmissions={assignment.acceptSubmissions}
          totalPoints={assignment.totalPoints}
        />
      )}
    </div>
  );
}
