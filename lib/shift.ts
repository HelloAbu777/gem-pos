/**
 * Smena logikasi — GEM POS
 *
 * Smena: 08:00 dan keyungi kuni 07:59 gacha
 *
 * Misol:
 *   - Bugungi smena: bugun 08:00 → ertaga 07:59
 *   - Kechagi smena: kecha 08:00 → bugun 07:59
 *
 * Agar hozirgi vaqt 00:00–07:59 oralig'ida bo'lsa:
 *   "Bugun" = kecha 08:00 → bugun 07:59 (tungi smena kecha hisoblanadi)
 */

const SHIFT_START_HOUR = 8; // 08:00

/**
 * Berilgan sana uchun smena boshlanish va tugash vaqtlarini qaytaradi
 * @param offsetDays 0 = joriy smena, -1 = oldingi smena
 */
export function getShiftRange(offsetDays = 0): { start: Date; end: Date } {
  const now = new Date();

  // Agar hozir 00:00–07:59 bo'lsa — biz hali kechagi smenadamiz
  const isBeforeShiftStart = now.getHours() < SHIFT_START_HOUR;

  // Smena boshlanish kunini hisoblash
  const baseDate = new Date(now);
  if (isBeforeShiftStart) {
    // Hali kechagi smena — base 1 kun orqaga
    baseDate.setDate(baseDate.getDate() - 1);
  }
  // offsetDays qo'shish
  baseDate.setDate(baseDate.getDate() + offsetDays);

  // Smena boshi: baseDate kuni soat 08:00:00
  const start = new Date(baseDate);
  start.setHours(SHIFT_START_HOUR, 0, 0, 0);

  // Smena oxiri: baseDate + 1 kun soat 07:59:59
  const end = new Date(baseDate);
  end.setDate(end.getDate() + 1);
  end.setHours(SHIFT_START_HOUR - 1, 59, 59, 999);

  return { start, end };
}

/**
 * ISO sana stringi qaytaradi (YYYY-MM-DD)
 */
export function getShiftDateLabel(offsetDays = 0): string {
  const { start } = getShiftRange(offsetDays);
  return start.toISOString().split('T')[0];
}

/**
 * Dashboard uchun: 'today' | 'yesterday' → { startDate, endDate } ISO strings
 */
export function getShiftDates(range: 'today' | 'yesterday'): {
  startDate: string;
  endDate:   string;
  startISO:  string;
  endISO:    string;
} {
  const offsetDays = range === 'today' ? 0 : -1;
  const { start, end } = getShiftRange(offsetDays);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate:   end.toISOString().split('T')[0],
    startISO:  start.toISOString(),
    endISO:    end.toISOString(),
  };
}
