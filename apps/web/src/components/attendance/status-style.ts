import type { AttendanceStatus } from "@onet/shared";

/** One color per attendance status (charts, heatmaps, roster buttons). */
export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#2BB673",
  LATE: "#FFB400",
  EXCUSED: "#1E9BD7",
  ABSENT: "#E30613",
};

export const attended = (s: string) => s === "PRESENT" || s === "LATE";
