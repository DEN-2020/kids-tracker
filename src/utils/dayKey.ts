type DateValue = Date | { toDate: () => Date } | string | null | undefined;

const pad = (value: number) => value.toString().padStart(2, '0');

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export const getLocalDayKey = (value: Date = new Date()): string => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const getLegacyUtcDayKey = (value: Date = new Date()): string => {
  return value.toISOString().slice(0, 10);
};

export const toDateValue = (value: DateValue): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : null;
  }

  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && isValidDate(parsed) ? parsed : null;
  }

  return null;
};

export const isRecordedToday = (
  dayKey: string | null | undefined,
  completedAt?: DateValue,
  reference: Date = new Date(),
): boolean => {
  const completedDate = toDateValue(completedAt);
  if (completedDate) {
    return getLocalDayKey(completedDate) === getLocalDayKey(reference);
  }

  if (!dayKey) return false;

  const normalizedDayKey = dayKey.trim().slice(0, 10);
  if (!normalizedDayKey) return false;

  if (normalizedDayKey === getLocalDayKey(reference)) {
    return true;
  }

  return normalizedDayKey === getLegacyUtcDayKey(reference);
};
