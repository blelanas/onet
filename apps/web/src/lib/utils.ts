import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { initials, fullName, ageFrom, colorFor, slugify, toInt } from "@onet/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
