import { GlobalExceptionsFilter, loadConfig } from '@server/shared';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// Trigger restart to pick up schema changes
async function bootstrap() {
  const config = loadConfig();
  // Create app with custom body parser
  const app = await NestFactory.create(GatewayModule);

  // Configure cookie parser
  app.use(cookieParser());

  // IMPORTANT: Keep raw body for LiveKit webhook verification.
  // If we JSON-parse and then JSON.stringify again, sha256(body) may differ
  // from what LiveKit used to generate the webhook token.
  app.use(
    '/webhook',
    bodyParser.raw({
      type: '*/*',
      limit: '10mb',
    }),
  );

  // Debug middleware for raw request inspection
  app.use((req, res, next) => {
    // console.log(`[Request] ${req.method} ${req.url} Content-Type: ${req.headers['content-type']}`);
    if (req.url.includes('breakoutRoom')) {
      // console.log('Breakout req headers:', req.headers);
    }
    next();
  });

  app.use(
    bodyParser.json({
      type: (req) => {
        // Don't let json parser touch /webhook (raw body is already set above)
        if (req.url && (req.url === '/webhook' || req.url.startsWith('/webhook?'))) {
          return false;
        }
        const ct = req.headers['content-type'];
        return ct === 'application/json' || ct === 'application/webhook+json';
      },
    }),
  );
  // Configure body parser to accept urlencoded (for typical RTMP webhooks)
  app.use(bodyParser.urlencoded({ extended: true }));
  // Accept binary protobuf
  app.use(
    bodyParser.raw({
      type: (req) => {
        // Always parse body for breakoutRoom requests to ensure we capture the data
        if (req.url && req.url.includes('breakoutRoom')) return true;

        const type = req.headers['content-type'];
        return (
          type === 'application/protobuf' || type === 'application/octet-stream'
        );
      },
      limit: '10mb',
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: true, // Allow dynamic origin for development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.startAllMicroservices();
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionsFilter());

  await app.listen(config.server.port);
  console.log(`🚀 Gateway listening on port ${config.server.port}`);
}
bootstrap();
