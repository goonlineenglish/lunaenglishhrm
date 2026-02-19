import { format, formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: vi });
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: vi });
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), {
    addSuffix: true,
    locale: vi,
  });
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
