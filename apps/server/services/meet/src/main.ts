import { NestFactory } from '@nestjs/core';
import { MeetModule } from '@server/meet/meet.module';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // Create a standard HTTP application
  const app = await NestFactory.create(MeetModule);

  // Configure cookie parser
  app.use(cookieParser());

  // IMPORTANT: Keep raw body for LiveKit webhook verification.
  app.use(
    '/webhook',
    bodyParser.raw({
      type: '*/*',
      limit: '10mb',
    }),
  );

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
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Start HTTP API server on port 8080 (which matches the Gateway's old port)
  const port = 8080;
  await app.listen(port);
  console.log(`🚀 Meet Service HTTP Monolithic Server listening on port ${port}`);
}

bootstrap();
