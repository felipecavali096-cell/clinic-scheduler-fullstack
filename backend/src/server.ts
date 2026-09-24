import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { z } from 'zod';
import { isHoliday, holidayName } from './holidays';

const app = express();
const port = Number(process.env.PORT ?? 3333);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const timezone = 'America/Sao_Paulo';
const times = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato YYYY-MM-DD');
const appointmentSchema = z.object({ patientName: z.string().trim().min(2).max(120), patientEmail: z.string().trim().email().max(254).optional().or(z.literal('')), date: dateSchema, time: z.enum(times as [string, ...string[]]) });
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',').map((v) => v.trim()) ?? true }));
app.use(express.json());
function validDate(date: string): Date { const parsed = new Date(`${date}T12:00:00Z`); if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) throw new Error('Data inválida.'); return parsed; }
function unavailableMessage(date: string): string | null { const day = validDate(date).getUTCDay(); if (day === 0 || day === 6) return 'Não há atendimento aos finais de semana.'; return null; }
async function available(date: string) { validDate(date); const weekend = unavailableMessage(date); if (weekend) return []; if (await isHoliday(date)) return []; const result = await pool.query<{ appointment_time: string }>('SELECT to_char(appointment_time, \'HH24:MI\') appointment_time FROM appointments WHERE appointment_date = $1', [date]); const busy = new Set(result.rows.map((row) => row.appointment_time)); return times.filter((time) => !busy.has(time)); }
app.get('/available', async (req, res) => { try { const parsed = dateSchema.safeParse(req.query.date); if (!parsed.success) return res.status(400).json({ error: 'Informe uma data válida.' }); const date = parsed.data; const weekend = unavailableMessage(date); if (weekend) return res.status(400).json({ error: weekend, reason: 'weekend' }); if (await isHoliday(date)) return res.status(400).json({ error: `A clínica não realiza atendimentos neste feriado${holidayName(date) ? `: ${holidayName(date)}` : '.'}`, reason: 'holiday' }); return res.json({ date, timezone, available: await available(date) }); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível consultar a disponibilidade.' }); } });
app.post('/appointments', async (req, res) => { const parsed = appointmentSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors }); try { const { patientName, patientEmail, date, time } = parsed.data; validDate(date); const weekend = unavailableMessage(date); if (weekend) return res.status(400).json({ error: weekend }); if (await isHoliday(date)) return res.status(400).json({ error: 'A clínica não realiza atendimentos neste feriado.' }); if (!(await available(date)).includes(time)) return res.status(409).json({ error: 'Este horário não está mais disponível.' }); const result = await pool.query('INSERT INTO appointments (patient_name, patient_email, appointment_date, appointment_time) VALUES ($1,$2,$3,$4) RETURNING id, patient_name, patient_email, appointment_date, to_char(appointment_time, \'HH24:MI\') appointment_time, created_at', [patientName, patientEmail || null, date, time]); return res.status(201).json(result.rows[0]); } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return res.status(409).json({ error: 'Este horário acabou de ser ocupado.' }); return res.status(500).json({ error: 'Não foi possível criar o agendamento.' }); } });
app.get('/appointments', async (_req, res) => { try { const result = await pool.query('SELECT id, patient_name, patient_email, appointment_date, to_char(appointment_time, \'HH24:MI\') appointment_time, created_at FROM appointments ORDER BY appointment_date, appointment_time'); return res.json(result.rows); } catch { return res.status(500).json({ error: 'Não foi possível carregar os agendamentos.' }); } });
app.listen(port, () => console.log(`Clinic Scheduler API running on port ${port}`));
