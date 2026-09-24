export const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'] as const;
export type Time = typeof TIMES[number];
export type UnavailableReason = 'weekend' | 'holiday' | 'past_date';

export function validDate(date: string): Date {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Data inválida.');
  }
  return parsed;
}

export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export function unavailableReason(date: string, today = todayInSaoPaulo()): UnavailableReason | null {
  const day = validDate(date).getUTCDay();
  if (day === 0 || day === 6) return 'weekend';
  if (date < today) return 'past_date';
  return null;
}

export function availableTimes(occupied: Iterable<string>): string[] {
  const busy = new Set(occupied);
  return TIMES.filter((time) => !busy.has(time));
}
