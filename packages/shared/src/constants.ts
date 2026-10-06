// Enum-like value sets shared by the database layer (validation) and the UI (labels via i18n).
// Labels live in messages/<locale>/common.json under "enums.<SetName>.<VALUE>".

export const MEMBER_TYPES = ["CHILD", "PARENT", "MONITOR", "MEMBER", "STAFF"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export const MEMBERSHIP_STATUSES = ["ACTIVE", "PENDING", "INACTIVE", "SUSPENDED"] as const;
export const GENDERS = ["M", "F"] as const;
export const GUARDIAN_RELATIONS = ["FATHER", "MOTHER", "GUARDIAN", "PARENT"] as const;

export const ACTIVITY_CATEGORIES = [
  "SPORTS",
  "MUSIC",
  "SONGS",
  "EDUCATIONAL",
  "GAMES",
  "WORKSHOP",
  "CULTURAL",
  "CREATIVE",
  "OUTDOOR",
] as const;
export const ACTIVITY_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const;

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const EVENT_CATEGORIES = ["CULTURAL", "CHILDREN", "COMPETITION", "CELEBRATION", "WORKSHOP", "PUBLIC", "MEETING"] as const;
export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"] as const;

export const TRIP_CATEGORIES = ["EDUCATIONAL", "CAMPING", "CULTURAL", "OUTDOOR", "EXCURSION", "REGIONAL"] as const;
export const TRIP_STATUSES = ["DRAFT", "OPEN", "FULL", "CLOSED", "COMPLETED", "CANCELLED"] as const;

export const REGISTRATION_STATUSES = ["PENDING", "CONFIRMED", "WAITLIST", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const DOCUMENTS_STATUSES = ["MISSING", "PARTIAL", "COMPLETE"] as const;

export const SONG_CATEGORIES = ["ANTHEM", "CHILDREN", "EDUCATIONAL", "FOLK", "CAMP", "CELEBRATION"] as const;
export const GAME_CATEGORIES = ["OUTDOOR", "INDOOR", "TEAM", "EDUCATIONAL", "ICEBREAKER", "ENERGIZER"] as const;
export const CONFERENCE_CATEGORIES = [
  "EDUCATION",
  "HEALTH",
  "PARENTING",
  "CHILD_RIGHTS",
  "ENVIRONMENT",
  "CULTURE",
  "TECHNOLOGY",
] as const;
export const RESOURCE_TYPES = ["PDF", "IMAGE", "VIDEO", "DOCUMENT", "LINK"] as const;
export const AGE_GROUPS = ["ALL", "4-7", "8-12", "13-17"] as const;
export const AUDIENCES = ["ALL", "PARENTS", "MONITORS", "KIDS", "STAFF", "GROUP"] as const;

export const INVOICE_STATUSES = ["DRAFT", "PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED", "OVERDUE"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "ONLINE", "CHECK", "OTHER"] as const;
export const PAYMENT_STATUSES = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"] as const;
export const EXPENSE_CATEGORIES = [
  "TRANSPORT",
  "FOOD",
  "MATERIALS",
  "ACCOMMODATION",
  "RENT",
  "UTILITIES",
  "EQUIPMENT",
  "COMMUNICATION",
  "OTHER",
] as const;

export const NOTIFICATION_TYPES = [
  "EVENT_NEW",
  "TRIP_REGISTRATION",
  "PAYMENT_REMINDER",
  "PAYMENT_CONFIRMED",
  "ACTIVITY",
  "EVENT_REMINDER",
  "ATTENDANCE",
  "MESSAGE",
  "ANNOUNCEMENT",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const ANNOUNCEMENT_PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT"] as const;

export const DOCUMENT_CATEGORIES = ["MEDICAL", "ID", "AUTHORIZATION", "INVOICE", "REPORT", "PHOTO", "OTHER"] as const;
export const DOCUMENT_ENTITY_TYPES = ["GENERAL", "MEMBER", "EVENT", "TRIP", "INVOICE", "ACTIVITY"] as const;

export const CALENDAR_ENTRY_TYPES = ["MEETING", "HOLIDAY", "IMPORTANT", "OTHER"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

/** Upload policy (validated server-side in src/lib/uploads.ts). */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ALLOWED_MIME: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  document: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  audio: ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/x-wav", "audio/wave", "audio/x-m4a", "audio/mp4"],
  video: ["video/mp4", "video/webm"],
};

/** Colors used for category chips/cards — tuned to the ONET palette. */
export const CATEGORY_COLORS: Record<string, string> = {
  SPORTS: "#1E9BD7",
  MUSIC: "#7C4DFF",
  SONGS: "#E8457C",
  EDUCATIONAL: "#2BB673",
  GAMES: "#FFB400",
  WORKSHOP: "#FF6B4A",
  CULTURAL: "#E30613",
  CREATIVE: "#00A3A3",
  OUTDOOR: "#5CAE2E",
  CHILDREN: "#FFB400",
  COMPETITION: "#1E9BD7",
  CELEBRATION: "#E8457C",
  PUBLIC: "#2BB673",
  MEETING: "#64748B",
  CAMPING: "#5CAE2E",
  EXCURSION: "#1E9BD7",
  REGIONAL: "#7C4DFF",
  ANTHEM: "#E30613",
  FOLK: "#FF6B4A",
  CAMP: "#5CAE2E",
  INDOOR: "#7C4DFF",
  TEAM: "#1E9BD7",
  ICEBREAKER: "#00A3A3",
  ENERGIZER: "#FF6B4A",
  EDUCATION: "#2BB673",
  HEALTH: "#E8457C",
  PARENTING: "#FFB400",
  CHILD_RIGHTS: "#E30613",
  ENVIRONMENT: "#5CAE2E",
  CULTURE: "#7C4DFF",
  TECHNOLOGY: "#1E9BD7",
};
