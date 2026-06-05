import { format, isAfter, addMinutes, differenceInSeconds, formatDistanceToNow, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatInTimeZone } from "date-fns-tz"

/**
 * Format date time with timezone support
 */
export function formatTimeZone(date: Date | string | number | undefined | null, formatStr: string, timeZone: string = "Asia/Ho_Chi_Minh"): string {
    if (!date) return "--"
    try {
        return formatInTimeZone(new Date(date), timeZone, formatStr, { locale: vi });
    } catch (e) {
        return "--"
    }
}

/**
 * Format date time to standard format: HH:mm dd/MM/yyyy
 * @param date Date string or object
 * @returns Formatted date string
 */
export function formatDateTime(date: Date | string | number | undefined | null, formatStr: string = "HH:mm dd/MM/yyyy"): string {
    return formatTimeZone(date, formatStr, "Asia/Ho_Chi_Minh")
}

/**
 * Format date to standard format: dd/MM/yyyy
 */
export function formatDate(date: Date | string | number | undefined | null, formatStr: string = "dd/MM/yyyy"): string {
    return formatDateTime(date, formatStr)
}

/**
 * Format relative time (e.g., "vừa xong", "2 giờ trước")
 */
export function formatRelativeTime(date: Date | string | number | undefined | null): string {
    if (!date) return "--"
    try {
        const d = new Date(date)
        return formatDistanceToNow(d, { addSuffix: true, locale: vi })
    } catch (e) {
        return "--"
    }
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date | string | number, amount: number): Date {
    return subDays(new Date(date), amount);
}

/**
 * Check if a date is within a certain number of minutes from now
 * @param createdAt Creation date
 * @param minutes Threshold in minutes
 * @returns boolean
 */
export const isWithinGracePeriod = (createdAt: string | Date, minutes: number = 15) => {
    if (!createdAt) return false;
    try {
        const expirationTime = addMinutes(new Date(createdAt), minutes);
        return isAfter(expirationTime, new Date());
    } catch (error) {
        return false;
    }
};

/**
 * Get remaining time in seconds
 * @param createdAt Creation date
 * @param minutes Threshold in minutes
 * @returns number of seconds remaining
 */
export const getRemainingSeconds = (createdAt: string | Date, minutes: number = 15) => {
    if (!createdAt) return 0;
    try {
        const expirationTime = addMinutes(new Date(createdAt), minutes);
        const seconds = differenceInSeconds(expirationTime, new Date());
        return Math.max(0, seconds);
    } catch (error) {
        return 0;
    }
};

/**
 * Format seconds to mm:ss
 * @param seconds number of seconds
 * @returns string mm:ss
 */
export const formatRemainingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format currency to VND
 */
export function formatCurrency(amount: number | string | undefined | null): string {
    if (amount === undefined || amount === null) return "0 ₫"

    const value = typeof amount === "string" ? parseFloat(amount) : amount

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value)
}

export function formatNumber(value: number | string | undefined | null): string {
    if (value === undefined || value === null) return "0"
    const num = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("vi-VN").format(num)
}

/**
 * Generate slug from text
 */
export const generateSlug = (text: string | undefined): string => {
    if (!text) return '';

    return text.toString().toLowerCase()
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
        .replace(/ì|í|ị|ỉ|ĩ/g, "i")
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
        .replace(/đ/g, "d")
        .replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, " ")
        .replace(/ + /g, " ")
        .trim()
        .replace(/ /g, "-")
        .replace(/--/g, "-");
};

/**
 * Get greeting based on current time
 */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}
