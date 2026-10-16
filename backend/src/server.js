import express from 'express';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { helmetMiddleware, corsMiddleware, hppMiddleware, sanitizeBody } from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import studentRoutes from './routes/student.routes.js';
import lecturerRoutes from './routes/lecturer.routes.js';
import adminRoutes from './routes/admin.routes.js';
import affiliateRoutes from './routes/affiliate.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { startBankCacheScheduler } from './services/bankCache.service.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(hppMiddleware);
app.use(sanitizeBody);
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[server] TechGrind API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Populates bank_list_cache immediately on boot, then refreshes it from Flutterwave every
// 24h in the background. Failures are logged and swallowed — see bankCache.service.js.
startBankCacheScheduler();
