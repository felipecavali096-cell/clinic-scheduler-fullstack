import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { z } from 'zod';
import { loadConfig } from './config';
import { isHoliday, holidayName } from './holidays';
import { TIMES, availableTimes, unavailableReason, validDate } from './rules';
import { createAppointment, SchedulingError } from './scheduling';

let config;
try { config = loadConfig(); } catch (error) { console.error(error instanceof Error ? error.message : 'Configuração inválida.'); process.exit(1); }
const app = express();
const pool = new Pool({ connectionString: config!.DATABASE_URL });
const timezone = 'America/Sao_Paulo';
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data no formato YYYY-MM-DD');
const appointmentSchema = z.object({ patientName: z.string().trim().min(2).max(120), patientEmail: z.string().trim().email().max(254).optional().or(z.literal('')), date: dateSchema, time: z.enum(TIMES) });
app.use(cors({ origin: config!.FRONTEND_URL.split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: '100kb' }));

async function occupied(date: string): Promise<string[]> {
  const result = await pool.query<{ appointment_time: string }>('SELECT to_char(appointment_time, \'HH24:MI\') appointment_time FROM appointments WHERE appointment_date = $1', [date]);
  return result.rows.map((row) => row.appointment_time);
}

function unavailableResponse(reason: string, message: string) { return { available: [], reason, message }; }

app.get('/available', async (req, res) => {
  const parsed = dateSchema.safeParse(req.query.date);
  if (!parsed.success) return res.status(400).json(unavailableResponse('invalid_date', 'Informe uma data válida.'));
  try {
    const date = parsed.data;
    validDate(date);
    const reason = unavailableReason(date);
    if (reason === 'weekend') return res.status(400).json(unavailableResponse(reason, 'Não há atendimento aos finais de semana.'));
    if (reason === 'past_date') return res.status(400).json(unavailableResponse(reason, 'Não é possível agendar em uma data passada.'));
    if (await isHoliday(date)) return res.status(400).json(unavailableResponse('holiday', holidayName(date) ? `A clínica não realiza atendimentos neste feriado: ${holidayName(date)}.` : 'A clínica não realiza atendimentos neste feriado.'));
    return res.json({ date, timezone, available: availableTimes(await occupied(date)) });
  } catch { return res.status(503).json({ available: [], reason: 'holiday_service_unavailable', message: 'Não foi possível consultar a disponibilidade no momento.' }); }
});

app.post('/appointments', async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors });
  try {
    const { patientName, patientEmail, date, time } = parsed.data;
    const result = await createAppointment({ date, time }, { isHoliday, getOccupied: occupied, insert: async () => (await pool.query('INSERT INTO appointments (patient_name, patient_email, appointment_date, appointment_time) VALUES ($1,$2,$3,$4) RETURNING id, patient_name, patient_email, appointment_date, to_char(appointment_time, \'HH24:MI\') appointment_time, created_at', [patientName, patientEmail || null, date, time])).rows[0] });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof SchedulingError) return res.status(error.status).json({ error: error.message, reason: error.reason });
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return res.status(409).json({ error: 'Este horário não está mais disponível.', reason: 'no_availability' });
    return res.status(500).json({ error: 'Não foi possível criar o agendamento.' });
  }
});

app.get('/appointments', async (_req, res) => {
  try { const result = await pool.query('SELECT id, patient_name, patient_email, appointment_date, to_char(appointment_time, \'HH24:MI\') appointment_time, created_at FROM appointments ORDER BY appointment_date, appointment_time'); return res.json(result.rows); }
  catch { return res.status(500).json({ error: 'Não foi possível carregar os agendamentos.' }); }
});

if (require.main === module) app.listen(config!.PORT, () => console.log(`Clinic Scheduler API running on port ${config!.PORT}`));
export { app };
