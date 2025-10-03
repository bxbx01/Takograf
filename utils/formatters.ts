import { MINUTE, HOUR, DAY } from "../constants";

/**
 * Formats milliseconds into a "Xs Yd" (hours, minutes) string.
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string.
 */
export const formatDuration = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / MINUTE);
  if (totalMinutes === 0) return "0d";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let result = '';
  if (hours > 0) result += `${hours}s `;
  if (minutes > 0) result += `${minutes}d`;
  
  return result.trim() || "0d";
};

/**
 * Formats milliseconds into a "Xg Ys Zd" (days, hours, minutes) string.
 * @param ms - Duration in milliseconds.
 * @returns Formatted full duration string.
 */
export const formatFullDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const totalMinutes = Math.floor(ms / MINUTE);
    if (totalMinutes === 0) return "0d";

    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    
    let result = '';
    if (days > 0) result += `${days}g `;
    if (hours > 0) result += `${hours}s `;
    if (minutes > 0) result += `${minutes}d`;
    
    return result.trim() || "0d";
};

/**
 * Formats a Date object to a localized date and time string.
 * @param date - The date to format.
 * @returns Formatted string e.g., "15.05.2024 14:30".
 */
export const formatDateTime = (date: Date): string => {
    return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
};