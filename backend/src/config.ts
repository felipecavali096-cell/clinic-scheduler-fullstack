import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL não foi configurada.'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  FRONTEND_URL: z.string().trim().min(1).default('http://localhost:5173')
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse({
    DATABASE_URL: env.DATABASE_URL,
    PORT: env.PORT ?? 3333,
    FRONTEND_URL: env.FRONTEND_URL ?? 'http://localhost:5173'
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Configuração inválida. Verifique: ${fields}.`);
  }

  return result.data;
}
