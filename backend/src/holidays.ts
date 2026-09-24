const cache = new Map<number, Set<string>>();
const names = new Map<string, string>();
export async function loadHolidays(year: number): Promise<Set<string>> { const cached = cache.get(year); if (cached) return cached; const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`); if (!response.ok) throw new Error('Não foi possível consultar os feriados.'); const data = await response.json() as Array<{ date: string; localName?: string; name?: string }>; const dates = new Set(data.map((holiday) => { names.set(holiday.date, holiday.localName ?? holiday.name ?? ''); return holiday.date; })); cache.set(year, dates); return dates; }
export async function isHoliday(date: string): Promise<boolean> { return (await loadHolidays(Number(date.slice(0, 4)))).has(date); }
export function holidayName(date: string): string { return names.get(date) ?? ''; }
