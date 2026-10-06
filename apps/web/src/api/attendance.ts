// Attendance mutations — same signatures as the former server actions, now calling the API.
import { apiSend } from "@/lib/api";
import type { AttendanceStatus } from "@onet/shared";

export type AttendanceInput = { contextKey: string; date: string; entries: { memberId: string; status: AttendanceStatus; note?: string }[] };

/** Upserts the roll call; guardians are notified server-side for new absences. */
export const saveAttendance = (input: AttendanceInput) => apiSend<{ saved: number; notified: number }>("POST", "/attendance", input);
