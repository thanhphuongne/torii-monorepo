import React, { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';

import { getDefaultRoomInfo } from '@/helpers/room-config';
import {
  MEET_LOGIN_API_KEY,
  MEET_LOGIN_API_SECRET,
  SERVER_URL,
  STATIC_ASSETS_PATH,
} from '@/config';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function generateMeetStyleRoomId(): string {
  const pick = (n: number) => {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    let s = '';
    for (let i = 0; i < n; i++) {
      s += ALPHABET[buf[i]! % ALPHABET.length];
    }
    return s;
  };
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

const Login = () => {
  const [roomId, setRoomId] = useState('');
  const [userType, setUserType] = useState('participant');
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasApiCredentials =
    MEET_LOGIN_API_KEY.length > 0 && MEET_LOGIN_API_SECRET.length > 0;

  useEffect(() => {
    setUserId(Date.now().toString());
    setName('user-' + Math.floor(Math.random() * 100));
  }, []);

  const regenerateRoom = useCallback(() => {
    setRoomId(generateMeetStyleRoomId());
    setFormError(null);
  }, []);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId.trim());
    } catch {
      // ignore
    }
  }, [roomId]);

  const getHashSignature = async (
    secretKey: string,
    message: string,
    algorithm = 'SHA-256',
  ) => {
    const encoder = new TextEncoder();
    const messageUint8Array = encoder.encode(message);
    const keyUint8Array = encoder.encode(secretKey);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyUint8Array,
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign'],
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageUint8Array,
    );

    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const sendRequest = async (body: unknown, method: string) => {
    const jsonBody = JSON.stringify(body);
    const signature = await getHashSignature(MEET_LOGIN_API_SECRET, jsonBody);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'API-KEY': MEET_LOGIN_API_KEY,
      'HASH-SIGNATURE': signature,
    };

    const response = await fetch(`${SERVER_URL}/auth/${method}`, {
      method: 'POST',
      headers,
      body: jsonBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { msg?: string }).msg || response.statusText,
      );
    }

    return await response.json();
  };

  const normalizedRoomId = roomId.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!normalizedRoomId) {
      setFormError('Vui lòng nhập mã phòng hoặc bấm tạo mã ngẫu nhiên.');
      return;
    }

    setIsLoading(true);

    if (!hasApiCredentials) {
      setFormError(
        'Thiếu VITE_MEET_LOGIN_API_KEY / VITE_MEET_LOGIN_API_SECRET trong .env (trùng cấu hình WAJLC trên server).',
      );
      setIsLoading(false);
      return;
    }

    try {
      const isRoomActiveRes = await sendRequest(
        { room_id: normalizedRoomId },
        'room/isRoomActive',
      );
      let isRoomActive = isRoomActiveRes.is_active;

      if (!isRoomActive) {
        const roomInfo = getDefaultRoomInfo(normalizedRoomId);
        const roomCreateRes = await sendRequest(roomInfo, 'room/create');
        isRoomActive = roomCreateRes.status;
      }

      if (isRoomActive) {
        const userInfo = {
          is_admin: userType === 'admin',
          name: name,
          user_id: userId,
        };

        const roomJoinRes = await sendRequest(
          {
            room_id: normalizedRoomId,
            user_info: userInfo,
          },
          'room/getJoinToken',
        );

        if (roomJoinRes.status) {
          const toUrl = window.location.href.split('?')[0];
          window.location.href = `${toUrl}?access_token=${roomJoinRes.token}`;
        } else {
          alert(roomJoinRes.msg);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logoSrc = `${STATIC_ASSETS_PATH}/imgs/main-logo-light.png`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <img src={logoSrc} alt="Logo" className="h-12" />
        </div>

        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          Tham gia cuộc họp
        </h1>

        <form onSubmit={handleLogin}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Mã phòng</FieldLegend>
              <FieldDescription>
                Nhập mã phòng để vào hoặc tạo phòng mới; hoặc bấm biểu tượng làm
                mới để tạo mã ngẫu nhiên (dạng giống Meet). Cùng mã thì vào cùng
                phòng.
              </FieldDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Input
                  id="meet-room-id"
                  type="text"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="vd: abc-defg-hij hoặc tên phòng của bạn"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 font-mono text-sm tracking-wide"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={copyRoomId}
                  aria-label="Sao chép mã phòng"
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={regenerateRoom}
                  aria-label="Tạo mã phòng ngẫu nhiên"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="meet-display-name">Tên hiển thị</FieldLabel>
              <Input
                id="meet-display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </Field>

            <Field>
              <FieldLabel>Vai trò</FieldLabel>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Người tham gia</SelectItem>
                  <SelectItem value="admin">Quản trị phòng</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {!hasApiCredentials && (
              <p className="text-sm text-destructive">
                Thiếu cấu hình API trong .env: đặt{' '}
                <span className="font-mono">VITE_MEET_LOGIN_API_KEY</span> và{' '}
                <span className="font-mono">VITE_MEET_LOGIN_API_SECRET</span>{' '}
                (trùng server).
              </p>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Field orientation="horizontal" className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUserId(Date.now().toString());
                  setName('user-' + Math.floor(Math.random() * 100));
                  setFormError(null);
                }}
              >
                Tên ngẫu nhiên
              </Button>
              <Button type="submit" disabled={isLoading || !hasApiCredentials}>
                {isLoading ? 'Đang xử lý…' : 'Vào phòng'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
};

export default Login;
