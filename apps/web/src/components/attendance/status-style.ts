import type { AttendanceStatus } from "@onet/shared";

/** One color per attendance status (charts, heatmaps, roster buttons). */
export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#2BB673",
  LATE: "#FFB400",
  EXCUSED: "#1E9BD7",
  ABSENT: "#12924A",
};

/**
 * Darker variants (≥ 4.5:1 against white) for status-coloured text and for solid backgrounds
 * carrying white labels; ATTENDANCE_COLORS stays for charts, bars, dots and heatmap cells.
 */
export const ATTENDANCE_TEXT_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#18794E",
  LATE: "#A15C00",
  EXCUSED: "#0A6EA3",
  ABSENT: "#12924A",
};

export const attended = (s: string) => s === "PRESENT" || s === "LATE";
