import type { StudentStatus } from "@/lib/types/users";

export interface StudentStatusConfig {
  id: StudentStatus;
  label: string;
  className: string;
  /** Color dot for dropdowns */
  dotColor: string;
}

export const STUDENT_STATUSES: StudentStatusConfig[] = [
  {
    id: "active",
    label: "Đang học",
    className: "bg-green-100 text-green-800 border-green-200",
    dotColor: "bg-green-500",
  },
  {
    id: "paused",
    label: "Bảo lưu",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  {
    id: "graduated",
    label: "Tốt nghiệp",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
  },
  {
    id: "dropped",
    label: "Nghỉ",
    className: "bg-red-100 text-red-800 border-red-200",
    dotColor: "bg-red-500",
  },
];

/** Valid transitions from each status */
export const VALID_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  active: ["paused", "graduated", "dropped"],
  paused: ["active"],
  graduated: [],
  dropped: [],
};

/** Statuses that require a reason when transitioning to */
export const NEEDS_REASON_STATUSES: StudentStatus[] = ["paused", "dropped"];

export function getStudentStatusConfig(
  statusId: StudentStatus
): StudentStatusConfig | undefined {
  return STUDENT_STATUSES.find((s) => s.id === statusId);
}

export function getValidTransitions(currentStatus: StudentStatus): StudentStatusConfig[] {
  const validIds = VALID_TRANSITIONS[currentStatus] ?? [];
  return STUDENT_STATUSES.filter((s) => validIds.includes(s.id));
}
