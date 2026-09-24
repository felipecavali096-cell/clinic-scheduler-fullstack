# Clinic Scheduler

Mini sistema full stack de agendamento para uma clínica, desenvolvido como teste técnico para uma vaga de Estagiário Full Stack.

## Tecnologias

- React, TypeScript e Vite
- Node.js, Express e TypeScript
- PostgreSQL
- Zod
- Nager.Date para feriados nacionais do Brasil

## Arquitetura

```text
React
  ↓
REST API / Express ── Nager.Date
  ↓
PostgreSQL
```

O frontend nunca acessa a API de feriados diretamente. O backend consulta e mantém um cache em memória por ano.

## Estrutura

- `backend/`: API REST, regras de negócio e persistência.
- `frontend/`: interface responsiva de agendamento.

## Configuração

### PostgreSQL

Crie um banco PostgreSQL e execute `backend/schema.sql` nele, por exemplo:

```bash
createdb clinic_scheduler
psql clinic_scheduler < backend/schema.sql
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run typecheck
npm run build
npm run dev
```

Variáveis: `DATABASE_URL`, `PORT` (padrão `3333`), `FRONTEND_URL` (padrão `http://localhost:5173`).

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run typecheck
npm run build
npm run dev
```

`VITE_API_URL` deve apontar para a API, por exemplo `http://localhost:3333`.

## API

### `GET /available?date=2026-02-10`

```json
{"date":"2026-02-10","timezone":"America/Sao_Paulo","available":["08:00","09:00"]}
```

Datas inválidas, finais de semana e feriados retornam `400` com uma mensagem explicativa.

### `POST /appointments`

```json
{"patientName":"Felipe Cavali","patientEmail":"email@exemplo.com","date":"2026-02-10","time":"09:00"}
```

O backend valida nome, e-mail, data, horário, feriado, fim de semana e conflito antes de inserir. Conflitos simultâneos também são protegidos pela constraint única do banco.

### `GET /appointments`

Retorna os agendamentos em ordem cronológica.

## Regras de negócio

Atendimento de segunda a sexta, das 08:00 às 18:00, em blocos de uma hora. Feriados nacionais são obtidos exclusivamente pelo backend em `https://date.nager.at/api/v3/PublicHolidays/{ano}/BR`. O timezone apresentado é `America/Sao_Paulo`.

## Decisões técnicas

- Regras críticas ficam no backend porque o cliente não é uma fronteira de confiança.
- A constraint `UNIQUE (appointment_date, appointment_time)` evita corrida entre requisições.
- A API externa é consumida pelo backend para proteger a arquitetura e centralizar tratamento de falhas.
- O cache por ano reduz chamadas desnecessárias à Nager.Date.

## Produção

Execute `npm run build` em ambos os diretórios e sirva `frontend/dist` por um servidor web. Configure `VITE_API_URL`, `DATABASE_URL` e `FRONTEND_URL` no ambiente de execução. Nenhum arquivo `.env` real deve ser versionado.
