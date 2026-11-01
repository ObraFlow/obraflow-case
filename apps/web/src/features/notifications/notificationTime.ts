/** Local calendar-day bucket used to section the inbox. */
export function dayGroup(value: string, now = new Date()) {
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const age = Math.round((day(now).getTime() - day(new Date(value)).getTime()) / 86400000);
  if (age <= 0) return "Hoje";
  if (age === 1) return "Ontem";
  return "Anteriores";
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** Short "há 5 minutos" label, or null once older than a week (callers fall back to the full timestamp). */
export function relativeTime(value: string, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "agora";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 7) return relative.format(Math.round(seconds / 86400), "day");
  return null;
}
