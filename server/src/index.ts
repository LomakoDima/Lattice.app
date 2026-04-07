import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import passport from 'passport';
import { env, getNormalizedFrontendOrigin, getOAuthCallbackUrl, isOAuthConfigured } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { authRouter } from './routes/auth.js';
import { goalsRouter } from './routes/goals.js';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { registerPassportStrategies } from './passport/registerStrategies.js';

registerPassportStrategies();

if (env.NODE_ENV === 'development') {
  if (isOAuthConfigured('google')) {
    const uri = getOAuthCallbackUrl('google');
    console.log(
      '[auth] Google OAuth redirect_uri (must match Google Cloud → Authorized redirect URIs):',
      uri
    );
    if (env.GOOGLE_CALLBACK_URL && env.GOOGLE_CALLBACK_URL !== uri) {
      console.warn(
        '[auth] GOOGLE_CALLBACK_URL in .env is ignored; redirect_uri is derived from FRONTEND_ORIGIN. Remove GOOGLE_CALLBACK_URL or align FRONTEND_ORIGIN.'
      );
    }
  }
  if (isOAuthConfigured('github')) {
    const uri = getOAuthCallbackUrl('github');
    console.log('[auth] GitHub OAuth redirect_uri:', uri);
    if (env.GITHUB_CALLBACK_URL && env.GITHUB_CALLBACK_URL !== uri) {
      console.warn(
        '[auth] GITHUB_CALLBACK_URL in .env is ignored; redirect_uri is derived from FRONTEND_ORIGIN.'
      );
    }
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: getNormalizedFrontendOrigin(), credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use('/api', csrfProtection);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'lattice-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/tasks', tasksRouter);
app.use(errorHandler);

async function start() {
  await runMigrations();
  app.listen(env.PORT, () => {
    console.log(`Lattice API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
