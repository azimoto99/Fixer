import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { User } from "@fixer/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  if (!name) return "";

  const names = name.trim().split(" ");
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (
    names[0].charAt(0) + names[names.length - 1].charAt(0)
  ).toUpperCase();
}

export function getFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function getUserInitials(user: User): string {
  return getInitials(getFullName(user));
}
