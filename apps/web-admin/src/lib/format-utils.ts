import { formatDistanceToNow, subDays } from "date-fns"
import { vi } from "date-fns/locale"
import { formatInTimeZone } from "date-fns-tz"
export { vi }

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

export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

export function formatCurrency(amount: number | string | undefined | null): string {
    if (amount === undefined || amount === null) return "0 ₫"

    const value = typeof amount === "string" ? parseFloat(amount) : amount

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value)
}

export function formatTimeZone(date: Date | string | number | undefined | null, formatStr: string, timeZone: string = "Asia/Ho_Chi_Minh"): string {
    if (!date) return "--"
    try {
        return formatInTimeZone(date, timeZone, formatStr, { locale: vi });
    } catch (e) {
        return "--"
    }
}

export function formatDateTime(date: Date | string | number | undefined | null, formatStr: string = "HH:mm dd/MM/yyyy"): string {
    return formatTimeZone(date, formatStr, "Asia/Ho_Chi_Minh")
}

export function formatDate(date: Date | string | number | undefined | null, formatStr: string = "dd/MM/yyyy"): string {
    return formatDateTime(date, formatStr)
}

export function formatRelativeTime(date: Date | string | number | undefined | null): string {
    if (!date) return "--"
    try {
        const d = new Date(date)
        return formatDistanceToNow(d, { addSuffix: true, locale: vi })
    } catch (e) {
        return "--"
    }
}

export function subtractDays(date: Date | string | number, amount: number): Date {
    return subDays(new Date(date), amount);
}

export function formatNumber(value: number | string | undefined | null): string {
    if (value === undefined || value === null) return "0"
    const num = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("vi-VN").format(num)
}

export function formatTimeToNow(date: Date | string | number | undefined | null): string {
    if (!date) return "--";
    try {
        const d = new Date(date);
        return formatDistanceToNow(d, { addSuffix: true, locale: vi });
    } catch (e) {
        return "--";
    }
}

export function formatForDateTimeLocal(date: Date | string | number | undefined | null): string {
    if (!date) return "";
    try {
        const d = new Date(date);
        const pad = (num: number) => String(num).padStart(2, '0');
        
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        return "";
    }
}

