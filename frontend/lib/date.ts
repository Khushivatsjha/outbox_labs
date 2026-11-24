/**
 * Formats an ISO timestamp into a readable date and time string in the user's local timezone.
 */
export const formatLocalDateTime = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Returns the user's detected IANA timezone name (e.g. "Asia/Kolkata", "America/New_York").
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Helper to get default date and time values for the schedule picker (e.g. 10 minutes in future)
 */
export const getDefaultScheduleTime = (offsetMinutes = 10): { date: string; time: string } => {
  const future = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const year = future.getFullYear();
  const month = String(future.getMonth() + 1).padStart(2, '0');
  const day = String(future.getDate()).padStart(2, '0');
  const hours = String(future.getHours()).padStart(2, '0');
  const minutes = String(future.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

/**
 * Combines local date ("YYYY-MM-DD") and time ("HH:mm") into a precise UTC ISO timestamp.
 */
export const toUtcIsoTimestamp = (dateStr: string, timeStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Creates a date interpreted in local user timezone
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return localDate.toISOString();
};
