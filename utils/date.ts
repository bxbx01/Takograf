import { DAY } from "../constants";

/**
 * Gets the ISO 8601 week number for a given date.
 * @param d The date.
 * @returns The week number as a string in "YYYY-W##" format.
 */
export const getWeekNumber = (d: Date): string => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

/**
 * Gets the end of the ISO week (Sunday 23:59:59) for a given date.
 * @param d The date.
 * @returns The date of the end of the week.
 */
export const getWeekEnd = (d: Date): Date => {
    const date = new Date(d.getTime());
    const day = date.getUTCDay() || 7;
    date.setDate(date.getDate() + (7 - day));
    date.setHours(23, 59, 59, 999);
    return date;
};

/**
 * Gets the date of the Monday of a given ISO week and year.
 * @param w Week number.
 * @param y Year.
 * @returns The date of the Monday of that week.
 */
const getDateOfISOWeek = (w: number, y: number): Date => {
    const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
    const dow = simple.getUTCDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
        ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    } else {
        ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    }
    return ISOweekStart;
};

/**
 * Generates an array of all week keys (e.g., "2025-W40") between a start and end key.
 * @param startKey The starting week key.
 * @param endKey The ending week key.
 * @returns An array of week keys.
 */
export const getAllWeeksInRange = (startKey: string, endKey: string): string[] => {
    const weeks: string[] = [];
    if (!startKey || !endKey) return [];
    const [startYear, startWeek] = startKey.split('-W').map(Number);
    
    let currentDate = getDateOfISOWeek(startWeek, startYear);
    
    while (true) {
        const weekKey = getWeekNumber(currentDate);
        weeks.push(weekKey);
        
        if (weekKey === endKey) break;

        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
        if (weeks.length > 208) break; // Safety break
    }
    return weeks;
};

/**
 * Formats a Date object into "YYYY-MM-DDTHH:mm" format for datetime-local input.
 * @param date The date to format.
 * @returns The formatted string.
 */
export const toDateTimeLocal = (date: Date | null): string => {
    if (!date) return '';
    const ten = (i: number) => (i < 10 ? '0' : '') + i;
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    const HH = ten(date.getHours());
    const II = ten(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${II}`;
};

/**
 * Formats a Date object into "YYYY-MM-DD" format for date input.
 * @param date The date to format.
 * @returns The formatted string.
 */
export const toDateInputFormat = (date: Date): string => {
    const ten = (i: number) => (i < 10 ? '0' : '') + i;
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    return `${YYYY}-${MM}-${DD}`;
};