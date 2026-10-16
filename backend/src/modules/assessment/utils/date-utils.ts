export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export function parseCivilDate(dateStr: string): CivilDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }

  const parts = dateStr.split('-');
  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];

  if (!yearStr || !monthStr || !dayStr) {
    return null;
  }

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return null;
  }

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function calculateExactAge(dateOfBirth: string, referenceDate: Date = new Date()): number {
  const parsed = parseCivilDate(dateOfBirth);
  if (!parsed) {
    throw new Error(`Data de nascimento inválida: "${dateOfBirth}"`);
  }

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth() + 1;
  const refDay = referenceDate.getUTCDate();

  let age = refYear - parsed.year;
  if (refMonth < parsed.month || (refMonth === parsed.month && refDay < parsed.day)) {
    age -= 1;
  }

  return age;
}
