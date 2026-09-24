# Clinic Scheduler

Sistema full stack de agendamento para uma clínica, desenvolvido como teste técnico.

## Requisitos

- Node.js `>=18` (o projeto inclui `.nvmrc` com a versão 18)
- PostgreSQL

## Tecnologias e arquitetura

React + TypeScript + Vite → REST API Express + TypeScript → PostgreSQL

O backend consulta a Nager.Date para feriados brasileiros e mantém cache em memória por ano. O frontend nunca acessa a API externa diretamente.

## Configuração

Crie o banco e aplique o schema:

```bash
createdb clinic_scheduler
psql clinic_scheduler < backend/schema.sql
```

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run typecheck
npm run build
npm run dev
```

Variáveis do backend:

```dotenv
DATABASE_URL=postgresql://usuario:senha@localhost:5432/clinic_scheduler
PORT=3333
FRONTEND_URL=http://localhost:5173
```

Variável do frontend:

```dotenv
VITE_API_URL=http://localhost:3333
```

Nunca publique arquivos `.env` reais.

## Endpoints

### `GET /available?date=2026-02-10`

Resposta disponível:

```json
{"date":"2026-02-10","timezone":"America/Sao_Paulo","available":["08:00","09:00"]}
```

Data indisponível:

```json
{"available":[],"reason":"weekend","message":"Não há atendimento aos finais de semana."}
```

Também são usados `holiday`, `past_date` e `no_availability`.

### `POST /appointments`

```json
{"patientName":"Felipe Cavali","patientEmail":"email@exemplo.com","date":"2026-02-10","time":"09:00"}
```

O backend valida o payload, data passada, fim de semana, feriado, horário permitido e conflito. A constraint `UNIQUE (appointment_date, appointment_time)` é a garantia final contra concorrência.

### `GET /appointments`

Retorna os agendamentos em ordem cronológica.

## Regras de negócio

Atendimento de segunda a sexta, das 08:00 às 18:00, em intervalos de uma hora: 08:00 a 17:00. Feriados são consultados exclusivamente pelo backend em `https://date.nager.at/api/v3/PublicHolidays/{ano}/BR`. O timezone apresentado é `America/Sao_Paulo`.

## Testes e validação

A suíte objetiva em `backend/test/scheduling.test.ts` cobre fim de semana, data passada, feriado, horário ocupado, criação válida e duplicidade na camada de regras. Execute:

```bash
cd backend
npm test
```

Os comandos `typecheck`, `test` e `build` devem ser executados no ambiente local; este README não afirma resultados que não tenham sido executados.

## Decisões técnicas

- Regras críticas ficam no backend porque o navegador não é uma fronteira de confiança.
- A constraint única evita duplicidades mesmo em requisições concorrentes.
- A API externa é consumida pelo backend para centralizar segurança e tratamento de falhas.
- O cache por ano reduz chamadas desnecessárias à Nager.Date.
- O frontend cancela consultas de disponibilidade antigas com `AbortController`.

## Segurança

`.env`, `node_modules` e `dist` estão no `.gitignore`. Não há credenciais reais no repositório.
