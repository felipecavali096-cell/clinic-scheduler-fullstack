import { TIMES, availableTimes, unavailableReason, validDate } from './rules';

export class SchedulingError extends Error {
  constructor(public readonly status: number, public readonly reason: string, message: string) {
    super(message);
  }
}

type CreateInput = { date: string; time: string };
type Dependencies = {
  isHoliday: (date: string) => Promise<boolean>;
  getOccupied: (date: string) => Promise<string[]>;
  insert: (input: CreateInput) => Promise<unknown>;
};

export async function createAppointment(input: CreateInput, deps: Dependencies): Promise<unknown> {
  try { validDate(input.date); } catch { throw new SchedulingError(400, 'invalid_date', 'Data inválida.'); }
  const reason = unavailableReason(input.date);
  if (reason === 'past_date') throw new SchedulingError(400, reason, 'Não é possível agendar em uma data passada.');
  if (reason === 'weekend') throw new SchedulingError(400, reason, 'Não há atendimento aos finais de semana.');
  if (await deps.isHoliday(input.date)) throw new SchedulingError(400, 'holiday', 'A clínica não realiza atendimentos neste feriado.');
  const available = availableTimes(await deps.getOccupied(input.date));
  if (!TIMES.includes(input.time as typeof TIMES[number]) || !available.includes(input.time)) {
    throw new SchedulingError(409, 'no_availability', 'Este horário não está mais disponível.');
  }
  return deps.insert(input);
}
