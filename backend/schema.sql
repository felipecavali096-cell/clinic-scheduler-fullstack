CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_name VARCHAR(120) NOT NULL,
  patient_email VARCHAR(254),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_date_time_unique UNIQUE (appointment_date, appointment_time)
);
CREATE INDEX IF NOT EXISTS appointments_chronology_idx ON appointments (appointment_date, appointment_time);
