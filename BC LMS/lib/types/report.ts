// Report types for admin and manager reports

export interface ProgressReportRow {
  userId: string;
  email: string;
  name: string;
  school: string | null;
  enrollmentCount: number;
  completedCount: number;
  completionRate: number; // 0-100
}

export interface CompletionReportRow {
  courseId: string;
  title: string;
  programName: string;
  enrollmentCount: number;
  completedCount: number;
  completionRate: number; // 0-100
}

export interface ActivityReportRow {
  userId: string;
  email: string;
  name: string;
  lastLogin: Date | null;
}

export interface ReportFilters {
  dateRange?: { from: string; to: string };
  school?: string;
  programId?: string;
}
