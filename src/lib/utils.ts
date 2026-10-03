import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const zar = (n: number, dp = 0) =>
  "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const num = (n: number, dp = 0) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: dp, maximumFractionDigits: dp });
