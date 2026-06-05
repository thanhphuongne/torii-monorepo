# Meet & WebRTC — Phát triển, triển khai và lộ trình Monolith

Tài liệu **duy nhất** cho luồng Torii Meet: phát triển local, deploy production (frontend + backend), LiveKit/TURN (4G/VPN), và hướng **gộp NestJS thành monolith chỉ Meet** (bỏ microservice không cần).

| Phần | Nội dung |
|------|----------|
| [A](#a-hướng-dẫn-phát-triển-local) | Chạy dev trên máy (hiện trạng microservices tối thiểu) |
| [B](#b-lộ-trình-monolith-meet-only) | Gộp Gateway + Meet → một app NestJS |
| [C](#c-triển-khai-production) | Deploy VPS: Docker, config, frontend, Nginx |
| [D](#d-livekit-turn--4gvpn) | SSL TURN, firewall, Certbot (từ DEPLOY_MEET cũ) |
| [E](#e-kiểm-tra--xử-lý-sự-cố) | Test E2E, checklist, troubleshooting |

Kiến trúc runtime chi tiết: [`apps/meet/docs/MEET_WEBRTC_FLOW.md`](../../apps/meet/docs/MEET_WEBRTC_FLOW.md).

---

## Tổng quan kiến trúc

Meet dùng **hai kênh song song**:

| Kênh | Công nghệ | Vai trò |
|------|-----------|---------|
| Signaling & dữ liệu phòng | NATS (WebSocket + JetStream) | Chat, whiteboard, metadata, renew token |
| Media | LiveKit (`livekit-client`) | Mic, camera, screen — WebRTC SFU |

### Hiện trạng (microservices)

```text
[Meet SPA] --HTTPS--> [Gateway :8080] --NATS req/res--> [Meet worker]
                              |                              |
                              +---------- NATS WS <-----------+ (browser)
                              |
                              +--> LiveKit API / webhook
```

### Mục tiêu (monolith Meet-only)

```text
[Meet SPA] --HTTPS--> [Meet API monolith :8080]
                              |
                              +-- HTTP controllers (từ Gateway/meet)
                              +-- NATS handlers + auth callout (từ Meet service)
                              +-- LiveKit SDK / webhook
```

**Vẫn giữ NATS** cho trình duyệt (client Meet đã gắn `@nats-io`). Monolith chỉ **bỏ NATS nội bộ Gateway↔Meet**, không bỏ NATS phía client.

---

# A. Hướng dẫn phát triển (local)

## A.1. Yêu cầu

| Công cụ | Phiên bản gợi ý |
|---------|------------------|
| Node.js | 20.x |
| pnpm | 9+ (corepack) |
| Docker | Compose v2 |
| Git | — |

## A.2. Clone & cài dependency

```bash
git clone <repo-url> torii-monorepo
cd torii-monorepo
corepack enable
pnpm install
```

Build package dùng chung (bắt buộc trước khi chạy server/meet):

```bash
pnpm --filter @workspace/protocol run generate
pnpm --filter @workspace/protocol run build
pnpm --filter @workspace/schemas run build
```

## A.3. Hạ tầng local (Docker)

Chỉ bật stack Meet — **không cần** identity/academy/agents:

```bash
# Từ root repo
docker compose up -d postgres redis nats livekit
```

Development LiveKit: có thể mount `livekit_development.yaml` thay `livekit.yaml` (webhook → `host.docker.internal:8080`).

Database lần đầu:

```bash
cd apps/server
cp ../.env.example ../../.env   # nếu chưa có
# Tạo config.yaml (mục A.4)
export DATABASE_URL="postgresql://postgres:123456789@localhost:5432/wajlc"
npx prisma generate
npx prisma db push
```

## A.4. Cấu hình backend dev

```bash
mkdir -p apps/server/config
# Tạo/sửa apps/server/config/config.yaml
```

Giá trị **local** tối thiểu:

```yaml
server:
  port: 8080
  apiUrl: "http://localhost:8080"
  nodeEnv: development

database:
  url: "postgresql://postgres:123456789@localhost:5432/wajlc"

redis:
  host: localhost
  port: 6379

nats:
  url: "nats://localhost:4222"
  wsUrls:
    - "ws://localhost:8222"
  accountName: "PNM"
  # subjects: giữ default trong schema

livekit:
  apiUrl: "http://localhost:7880"
  wsUrl: "ws://localhost:7880"
  apiKey: "<trùng keys trong livekit_development.yaml>"
  apiSecret: "<trùng keys trong livekit_development.yaml>"

livekitRoleplay:
  apiUrl: "http://localhost:7880"
  wsUrl: "ws://localhost:7880"
  apiKey: "<cùng livekit dev>"
  apiSecret: "<cùng livekit dev>"

security:
  jwt:
    secret: "dev-jwt-secret-change-in-prod"
  encryptionKey: "dev-encryption-key-32-chars-min!!"
  wajlc:
    apiKey: "dev-wajlc-key"
    apiSecret: "dev-wajlc-secret"
```

Đồng bộ `nats_server.conf` với seed (issuer, nkey, xkey):

```bash
node scripts/verify-nats-config.js
```

## A.5. Chạy backend (chế độ microservices tối thiểu)

Cần **hai process** Nest:

```bash
cd apps/server

# Terminal 1 — HTTP API (verifyToken, auth/room/*, webhook, …)
pnpm run dev:gateway

# Terminal 2 — NATS worker (phòng, user, LiveKit token, auth callout)
pnpm run dev:meet
```

Hoặc một terminal:

```bash
pnpm run dev:gateway & pnpm run dev:meet
```

**Không cần** `dev:identity`, `dev:academy`, `dev:agents` để test Meet qua màn login.

## A.6. Chạy frontend Meet

```bash
cp apps/meet/.env.example apps/meet/.env
```

`apps/meet/.env`:

```env
VITE_API_URL=http://localhost:8080
VITE_MEET_LOGIN_API_KEY=dev-wajlc-key
VITE_MEET_LOGIN_API_SECRET=dev-wajlc-secret
```

```bash
pnpm --filter meet run dev
# Mặc định http://localhost:5180
```

## A.7. Luồng test nhanh

1. Mở `http://localhost:5180` → form login dev.  
2. Tạo `room-id` → **Vào phòng** → URL có `?access_token=...`.  
3. Mở tab thứ hai cùng phòng → kiểm tra NATS + LiveKit.  
4. Log gateway/meet nếu lỗi; LiveKit: `docker logs -f torii-livekit`.

**Lưu ý:** Meet production yêu cầu HTTPS (trừ `localhost`). Dev dùng `http://localhost` là được.

## A.8. Lệnh hữu ích khi dev

```bash
# Chỉ rebuild protocol sau đổi .proto
pnpm --filter @workspace/protocol run generate && pnpm --filter @workspace/protocol run build

# Lint meet frontend
pnpm --filter meet run lint

# Xem NATS monitoring (nếu bật)
open http://localhost:8222
```

---

# B. Lộ trình Monolith (Meet-only)

Mục tiêu: **một process NestJS**, **một container Docker**, không chạy identity/academy/agents; vẫn deploy `apps/meet` + NATS + LiveKit.

## B.1. Vì sao gộp?

| Microservices (hiện tại) | Monolith Meet |
|--------------------------|---------------|
| Gateway + Meet + phụ thuộc identity/academy trong compose | Chỉ 1 API server |
| Mỗi lần debug 2+ process | Một breakpoint, một log stream |
| NATS round-trip cho mọi `natsClient.send` từ Gateway | Gọi thẳng service class |
| Image/build 5 entry `nest build *` | `nest build meet-monolith` (tên tùy chọn) |

**Không gộp:** NATS JetStream + WS cho browser, LiveKit, Postgres, Redis — vẫn là infrastructure riêng.

## B.2. Kiến trúc đích

```text
apps/server/services/meet-monolith/   (tên gợi ý)
├── main.ts                 # HTTP listen + connect NATS microservice trong cùng app
├── meet-monolith.module.ts
├── http/                   # Controllers copy từ gateway/modules/meet
└── imports:
    └── MeetModule          # services/meet (giữ nguyên business + NATS consumers)
```

`main.ts` mẫu ý tưởng:

```typescript
// Pseudo-code — chưa có trong repo, hướng implement
const app = await NestFactory.create(MeetMonolithModule);
app.connectMicroservice(createNatsServiceConfig('meet_queue'));
await app.startAllMicroservices();
await app.listen(8080);
```

## B.3. Các bước refactor (theo thứ tự)

### Bước 1 — Tách “Meet Gateway” khỏi Gateway tổng

- Copy `apps/server/services/gateway/src/modules/meet/**` → module HTTP mới.  
- Copy `webhook.controller.ts` (raw body parser giữ như `gateway/src/main.ts`).  
- **Không** import module Identity/Academy/Agents.

### Bước 2 — Thay NATS nội bộ bằng DI

Trong Gateway hiện tại, pattern:

```typescript
this.natsClient.send({ cmd: 'user.getUserStatus' }, { roomId, userId })
```

Đổi thành inject service từ Meet:

```typescript
this.roomUserService.getUserStatus(roomId, userId)
```

Ưu tiên refactor từng nhóm route:

1. `verifyToken`, `auth/room/*`  
2. Upload / download / whiteboard  
3. Recording, insights (nếu vẫn cần)

Giữ **NATS message handlers** trong `services/meet` cho event từ **browser** (không đổi protocol client).

### Bước 3 — Một entry build & script

`apps/server/package.json` (mục tiêu):

```json
{
  "build": "... nest build meet-monolith",
  "dev": "nest start meet-monolith --watch",
  "prod:meet": "node dist/services/meet-monolith/src/main"
}
```

Dockerfile: bỏ `nest build gateway identity academy agents`, chỉ build monolith.

### Bước 4 — `docker-compose` Meet-only

```yaml
services:
  postgres:
  redis:
  nats:
  livekit:
  meet-api:
    image: ${DOCKER_USERNAME}/torii-meet:latest
    command: node dist/services/meet-monolith/src/main
    ports:
      - "8080:8080"
    volumes:
      - ./apps/server/config/config.yaml:/app/apps/server/config/config.yaml
      - uploads_data:/app/apps/server/uploads
    depends_on: [nats, postgres, redis, livekit]
```

Xóa service: `gateway`, `meet` (worker riêng), `identity`, `academy`, `agents`, `voice-agent`.

### Bước 5 — Thu gọn `config.yaml`

- Bỏ/optional: `identity.*`, `thirdParty.*`, `fastmcp`, `livekitRoleplay` (nếu không Voice Agent).  
- Giữ: `server`, `database`, `redis`, `nats`, `livekit`, `security.wajlc`, `webhook`, `room`, `upload`, `janitor`.

### Bước 6 — Prisma / DB

- Rà soát schema: chỉ migrate bảng Meet cần dùng.  
- Có thể tách database riêng `meet_db` sau này; giai đoạn 1 vẫn dùng chung `wajlc` nhưng không khởi động service Academy.

## B.4. Checklist hoàn thành monolith

- [ ] Một lệnh `pnpm run dev` chạy được Meet E2E (HTTP + NATS worker)  
- [ ] `docker compose up` ≤ 5 service (postgres, redis, nats, livekit, meet-api)  
- [ ] Không còn `natsClient.send` giữa HTTP layer và Meet logic (trừ test)  
- [ ] CI build/push một image `torii-meet`  
- [ ] Tài liệu deploy cập nhật (phần C bên dưới) — bỏ bước identity/academy  

## B.5. Rủi ro & lưu ý

- **Auth callout NATS** vẫn chạy trong process Meet — cần test kỹ sau gộp.  
- **Upload file:** gateway và meet hiện dùng chung volume `uploads_data` — monolith một process thì đơn giản hơn.  
- **Breaking change:** Không đổi URL public (`/api/verifyToken`, `/auth/room/*`) để `apps/meet` không sửa client.

---

# C. Triển khai production

> Phần này mô tả **hiện trạng microservices**. Sau khi hoàn thành [mục B](#b-lộ-trình-monolith-meet-only), thay `gateway` + `meet` bằng một service `meet-api` và bỏ bước identity/academy.

## C.1. DNS & firewall

### Subdomain

| Domain | Mục đích |
|--------|----------|
| `meet.<domain>` | SPA Meet (static) |
| `api.<domain>` | API + proxy `/socket-b` + `/nats` |
| `turn.<domain>` | TURN TLS (4G/VPN) |

Cloudflare: **DNS only** cho `api` và `turn`.

### Cổng firewall

| Giao thức | Cổng | Dịch vụ |
|----------|------|---------|
| TCP | 80, 443, 7881, 5349 | Nginx, LiveKit RTC/TURN |
| TCP | 8080 | Gateway (nội bộ) |
| TCP | 4222, 8222 | NATS (nếu expose) |
| UDP | 443, 7882, 3478, 50000–60000 | LiveKit / TURN |

## C.2. Chuẩn bị VPS

```bash
sudo apt update && sudo apt install -y git curl
cd ~ && git clone <repo-url> torii-monorepo && cd torii-monorepo
curl -4 ifconfig.me   # → VPS_PUBLIC_IP trong .env
```

Cài Docker Compose, Nginx, Certbot.

```bash
cp .env.example .env
```

```env
DOCKER_USERNAME=<dockerhub_user>
VPS_PUBLIC_IP=<ip-public>
```

## C.3. LiveKit (`livekit.yaml`)

```yaml
rtc:
  node_ip: <VPS_PUBLIC_IP>
  use_external_ip: false
turn:
  enabled: true
  domain: turn.<domain>
  tls_port: 5349
  udp_port: 3478
  cert_file: /certs/fullchain.pem
  key_file: /certs/privkey.pem
keys:
  <LIVEKIT_API_KEY>: <LIVEKIT_API_SECRET>
webhook:
  api_key: <LIVEKIT_API_KEY>
  urls:
    - "http://127.0.0.1:8080/webhook"
```

`keys` **phải trùng** `livekit.apiKey` / `apiSecret` trong `config.yaml`.

```bash
docker compose up -d postgres redis nats livekit
```

Chi tiết SSL/TURN: [mục D](#d-livekit-turn--4gvpn).

## C.4. NATS

- Chỉnh `nats_server.conf` theo `node scripts/verify-nats-config.js`.  
- Production WS: `wss://api.<domain>/nats` → proxy tới `127.0.0.1:8222`.

## C.5. `apps/server/config/config.yaml` (production)

```yaml
server:
  port: 8080
  apiUrl: "https://api.<domain>"
  nodeEnv: production
  uploadPath: "./uploads"

database:
  url: "postgresql://postgres:<password>@postgres:5432/wajlc"

redis:
  host: redis
  port: 6379

nats:
  url: "nats://nats:4222"
  wsUrls:
    - "wss://api.<domain>/nats"
  accountName: "PNM"
  streamName: "wajlc-room-stream"

livekit:
  apiUrl: "http://127.0.0.1:7880"
  wsUrl: "wss://api.<domain>/socket-b"
  apiKey: "<LIVEKIT_API_KEY>"
  apiSecret: "<LIVEKIT_API_SECRET>"

security:
  jwt:
    secret: "<jwt-secret>"
  encryptionKey: "<encryption-key>"
  wajlc:
    apiKey: "<WAJLC_API_KEY>"
    apiSecret: "<WAJLC_API_SECRET>"
    tokenValidity: 3600

identity:
  webMeetUrl: "https://meet.<domain>"

webhook:
  enabled: true

livekitRoleplay:
  apiUrl: "wss://placeholder"
  wsUrl: "wss://placeholder"
  apiKey: "placeholder"
  apiSecret: "placeholder"
```

Schema đầy đủ: `apps/server/libs/shared/src/config/app.config.ts`.

## C.6. Database & backend containers

```bash
cd apps/server && export DATABASE_URL="postgresql://..." && npx prisma db push

docker compose pull
docker compose up -d meet identity academy gateway   # hiện trạng; sau monolith chỉ meet-api
docker compose logs -f gateway meet
```

## C.7. Frontend Meet

`apps/meet/.env.production`:

```env
VITE_API_URL=https://api.<domain>
VITE_MEET_LOGIN_API_KEY=<security.wajlc.apiKey>
VITE_MEET_LOGIN_API_SECRET=<security.wajlc.apiSecret>
```

```bash
pnpm install
pnpm --filter @workspace/protocol run generate && pnpm --filter @workspace/protocol run build
pnpm --filter @workspace/schemas run build
pnpm --filter meet run build
sudo rsync -av --delete apps/meet/dist/ /var/www/meet/
```

## C.8. Nginx

**Meet SPA** (`meet.<domain>`):

```nginx
server {
    listen 443 ssl http2;
    server_name meet.<domain>;
    ssl_certificate     /etc/letsencrypt/live/meet.<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meet.<domain>/privkey.pem;
    root /var/www/meet;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 30d; add_header Cache-Control "public, immutable"; }
}
```

**API + LiveKit + NATS** (`api.<domain>`):

```nginx
upstream meet_backend {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl http2;
    server_name api.<domain>;
    ssl_certificate     /etc/letsencrypt/live/api.<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.<domain>/privkey.pem;
    client_max_body_size 100m;

    location / {
        proxy_pass http://meet_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket-b {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /nats {
        proxy_pass http://127.0.0.1:8222;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

# D. LiveKit TURN & 4G/VPN

Phần gộp từ tài liệu LiveKit cũ — cần khi user mạng di động/VPN chặn UDP thuần.

## D.1. Cơ chế

| Thành phần | Vai trò |
|------------|---------|
| **Nginx** | HTTPS TCP 443 — API, Meet SPA |
| **LiveKit TURN/UDP** | Cổng **443 UDP** — vượt firewall 4G (không đụng Nginx TCP 443) |
| **LiveKit TURN/TLS** | Cổng **5349 TCP** — fallback cuối |

## D.2. DNS (ví dụ production Torii)

Trỏ về IP VPS, **tắt proxy Cloudflare**:

1. `api.<domain>` → IP VPS  
2. `turn.<domain>` → IP VPS  

## D.3. Cấp SSL

Gộp cert (khuyến nghị):

```bash
sudo certbot certonly --nginx -d api.<domain> -d turn.<domain>
```

Hoặc manual:

```bash
sudo certbot certonly --manual -d api.<domain> -d turn.<domain>
```

Chỉ TURN:

```bash
sudo certbot certonly --manual -d turn.<domain>
```

Đồng bộ vào Docker LiveKit:

```bash
chmod +x scripts/update-livekit-certs.sh
./scripts/update-livekit-certs.sh
```

Script copy `fullchain.pem` / `privkey.pem` → `./certs/` và `docker compose up -d --force-recreate livekit`.

## D.4. Tự động gia hạn Certbot

```bash
chmod +x scripts/update-livekit-certs.sh
sudo nano /etc/letsencrypt/renewal/api.<domain>.conf
```

Thêm dưới `[renewalparams]`:

```text
renew_hook = /path/to/torii-monorepo/scripts/update-livekit-certs.sh
```

Cập nhật thủ công bất kỳ lúc nào:

```bash
./scripts/update-livekit-certs.sh
```

## D.5. Khởi động sau khi có cert

```bash
docker compose up -d
```

## D.6. Kiểm tra LiveKit

```bash
docker logs -f torii-livekit
```

[LiveKit Connection Test](https://livekit.io/connection-test) → `wss://api.<domain>/socket-b` + API key/secret.

---

# E. Kiểm tra & xử lý sự cố

## E.1. Test E2E

1. Connection Test LiveKit (mục D.6).  
2. `https://meet.<domain>` → login dev → vào phòng → bật mic/camera.  
3. Luồng: `verifyToken` → NATS → `RES_INITIAL_DATA` → LiveKit `connect(url, token)`.

Log:

```bash
docker logs -f torii-livekit
docker logs -f torii-nats
docker compose logs -f gateway meet
```

Tìm trong meet: `[MediaServerInfo] Sending to user ... url=wss://...`.

## E.2. Checklist go-live

- [ ] `VPS_PUBLIC_IP` trong `.env` và LiveKit `node_ip`
- [ ] Firewall TCP/UDP (C.1, D.2)
- [ ] `livekit.yaml` keys == `config.yaml` `livekit.*`
- [ ] `security.wajlc` == `VITE_MEET_LOGIN_API_*` (nếu login dev)
- [ ] `nats.wsUrls` / `livekit.wsUrl` là WSS qua Nginx
- [ ] Meet build với `VITE_API_URL=https://api.<domain>`
- [ ] Backend + LiveKit healthy
- [ ] Webhook `http://127.0.0.1:8080/webhook`
- [ ] Cert TURN sync (`update-livekit-certs.sh`)

## E.3. Troubleshooting

| Triệu chứng | Nguyên nhân | Xử lý |
|-------------|-------------|--------|
| Yêu cầu HTTPS | Mở Meet bằng http (không localhost) | Dùng `https://meet...` |
| verifyToken 401 | JWT / wajlc secret sai | Đồng bộ apiKey/secret |
| NATS fail | wsUrls, Nginx `/nats`, auth callout | `nats_server.conf`, log meet |
| Không A/V | WS LiveKit, UDP, node_ip | Connection test; mở UDP 50000–60000 |
| Chỉ 4G/VPN lỗi | TURN/cert | Mục D |
| Media URL localhost | `livekit.wsUrl` nội bộ | `wss://api.<domain>/socket-b` |
| Whiteboard 1 người thấy file | Volume upload | Chung `uploads_data` gateway+meet |

## E.4. Lệnh tham chiếu

```bash
# Dev infra
docker compose up -d postgres redis nats livekit

# Dev backend (hiện tại)
cd apps/server && pnpm run dev:gateway & pnpm run dev:meet

# Dev frontend
pnpm --filter meet run dev

# Prod
./scripts/update-livekit-certs.sh
docker compose up -d postgres redis nats livekit meet identity academy gateway
pnpm --filter meet run build && sudo rsync -av --delete apps/meet/dist/ /var/www/meet/
```

---

**Tóm tắt:** Dev local = Docker infra + `dev:gateway` + `dev:meet` + `pnpm --filter meet dev`. Production = Nginx + LiveKit/TURN (mục D) + backend + static Meet. Tương lai = monolith (mục B): một Nest app, một container, bỏ NATS nội bộ Gateway↔Meet, **giữ NATS cho browser**.
