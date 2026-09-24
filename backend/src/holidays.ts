const cache = new Map<number, Set<string>>();
const names = new Map<string, string>();
const timeoutMs = 5000;

export async function loadHolidays(year: number): Promise<Set<string>> {
  const cached = cache.get(year);
  if (cached) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`, { signal: controller.signal });
    if (!response.ok) throw new Error('Serviço de feriados indisponível.');
    const data = await response.json() as Array<{ date: string; localName?: string; name?: string }>;
    const dates = new Set(data.map((holiday) => { names.set(holiday.date, holiday.localName ?? holiday.name ?? ''); return holiday.date; }));
    cache.set(year, dates);
    return dates;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Serviço de feriados excedeu o tempo limite.');
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Serviço de feriados excedeu o tempo limite.');
    throw error instanceof Error ? error : new Error('Não foi possível consultar os feriados.');
  } finally { clearTimeout(timeout); }
}

export async function isHoliday(date: string): Promise<boolean> { return (await loadHolidays(Number(date.slice(0, 4)))).has(date); }
export function holidayName(date: string): string { return names.get(date) ?? ''; }
