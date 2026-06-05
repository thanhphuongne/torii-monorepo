import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CreateIngressReqSchema,
  CreateIngressResSchema,
  IngressInput,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppSelector } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { Loader2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

const Ingress = () => {
  const [name, setName] = useState<string>('broadcaster');
  const [ingressType, setIngressType] = useState<IngressInput>(
    IngressInput.RTMP_INPUT,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const session = store.getState().session;
  const ingressFeatures = useAppSelector(
    (state) =>
      state.session.currentRoom?.metadata?.roomFeatures?.ingressFeatures,
  );

  const handleSubmit = useCallback(async () => {
    if (!ingressFeatures?.isAllow) {
      toast('Tính năng này không được phép.', { type: 'error' });
      return;
    }
    setIsLoading(true);

    const body = create(CreateIngressReqSchema, {
      inputType: ingressType,
      participantName: name || 'broadcaster',
      roomId: session.currentRoom.roomId,
    });

    const r = await sendAPIRequest(
      'ingress/create',
      toBinary(CreateIngressReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CreateIngressResSchema, new Uint8Array(r));
    if (!res.status) {
      toast(res.msg, {
        type: 'error',
      });
    }

    setIsLoading(false);
  }, [ingressFeatures, session.currentRoom, ingressType, name]);

  const getIngressTypeText = (type: number) => {
    switch (type) {
      case IngressInput.RTMP_INPUT:
        return 'RTMP';
      case IngressInput.WHIP_INPUT:
        return 'WHIP';
      default:
        return '';
    }
  };

  const ingressTypeOptions = Object.values(IngressInput)
    .filter((v) => typeof v === 'number')
    .map((v) => ({
      value: v as IngressInput,
      text: getIngressTypeText(v as number),
    }));

  const renderForm = () => {
    return (
      <form method="POST" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal" className="items-center justify-between gap-4">
            <FieldLabel htmlFor="ingress-type" className="font-normal text-foreground">
              Loại luồng vào
            </FieldLabel>
            <Select
              value={String(ingressType)}
              onValueChange={(v) => setIngressType(Number(v) as IngressInput)}
            >
              <SelectTrigger id="ingress-type" className="w-full sm:max-w-[220px]">
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                {ingressTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field orientation="vertical" className="gap-2">
            <FieldLabel htmlFor="ingress-participant-name" className="font-normal text-foreground">
              Tham gia với tên
            </FieldLabel>
            <Input
              id="ingress-participant-name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="broadcaster"
              autoComplete="off"
            />
          </Field>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                'Tạo liên kết'
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    );
  };

  const renderInfo = () => {
    return (
      <FieldGroup className="gap-4">
        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="ingress_type_readonly" className="font-normal text-foreground">
            Loại luồng vào
          </FieldLabel>
          <Input
            id="ingress_type_readonly"
            readOnly
            value={getIngressTypeText(
              ingressFeatures?.inputType ?? IngressInput.RTMP_INPUT,
            )}
            className="bg-muted"
          />
        </Field>
        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="ingress_url" className="font-normal text-foreground">
            Đường dẫn luồng
          </FieldLabel>
          <Input
            id="ingress_url"
            readOnly
            value={ingressFeatures?.url ?? ''}
            className="bg-muted"
          />
        </Field>
        <Field orientation="vertical" className="gap-2">
          <FieldLabel htmlFor="ingress_stream_key" className="font-normal text-foreground">
            Khóa luồng
          </FieldLabel>
          <Input
            id="ingress_stream_key"
            readOnly
            value={ingressFeatures?.streamKey ?? ''}
            className="bg-muted"
          />
        </Field>
      </FieldGroup>
    );
  };

  return (
    <div className="mt-0">
      {ingressFeatures?.url && ingressFeatures?.streamKey
        ? renderInfo()
        : renderForm()}
    </div>
  );
};

export default Ingress;
