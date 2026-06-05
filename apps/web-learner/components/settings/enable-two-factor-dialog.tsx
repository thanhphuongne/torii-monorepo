'use client'

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { toast } from "@workspace/ui/components/sonner";
import { Smartphone, QrCode, Key, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { Spinner } from '@workspace/ui/components/spinner';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Field, FieldLabel, FieldError } from '@workspace/ui/components/field';
import {
  useGenerateTotpSecret,
  useEnableTotp,
} from "@/lib/api/services/two-factor-auth-api";

const verifyCodeSchema = z.object({
  code: z
    .string()
    .length(6, "Mã phải có 6 chữ số")
    .regex(/^\d+$/, "Mã chỉ được chứa số"),
});

type VerifyCodeForm = z.infer<typeof verifyCodeSchema>;

interface EnableTwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnableTwoFactorDialog({
  open,
  onOpenChange,
}: EnableTwoFactorDialogProps) {
  const [step, setStep] = useState<"generate" | "verify" | "backup">(
    "generate",
  );
  const [secret, setSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const generateMutation = useGenerateTotpSecret();
  const enableMutation = useEnableTotp();

  const form = useForm<VerifyCodeForm>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" },
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("generate");
      setSecret("");
      setQrCodeUrl("");
      setBackupCodes([]);
      setCopiedSecret(false);
      setCopiedCodes(false);
      form.reset();
    }
  }, [open, form]);

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync();
      setSecret(result.secret);
      setQrCodeUrl(result.qrCodeUrl);
      setStep("verify");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo mã QR",
      );
    }
  };

  const handleVerify = async (data: VerifyCodeForm) => {
    try {
      const result = await enableMutation.mutateAsync({
        secret,
        code: data.code,
      });
      setBackupCodes(result.backupCodes);
      setStep("backup");
      toast.success("Xác thực hai yếu tố đã được bật thành công!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mã xác thực không hợp lệ",
      );
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success("Đã sao chép khóa bí mật");
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
    toast.success("Đã sao chép mã dự phòng");
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `torii-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống mã dự phòng");
  };

  const handleFinish = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-2xl font-sans font-bold italic tracking-normal text-foreground">
            <Smartphone className="size-5" />
            Bật xác thực hai yếu tố
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === "generate" && "Thiết lập xác thực hai yếu tố để bảo mật tài khoản của bạn"}
            {step === "verify" &&
              "Quét mã QR bằng ứng dụng xác thực của bạn"}
            {step === "backup" && "Lưu mã dự phòng của bạn ở nơi an toàn"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Generate */}
        {step === "generate" && (
          <div className="space-y-6 py-2">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertTitle>Bạn cần một ứng dụng xác thực</AlertTitle>
              <AlertDescription>
                Tải xuống ứng dụng xác thực như Google Authenticator, Authy, hoặc Microsoft Authenticator trên điện thoại của bạn.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Spinner className="size-4 animate-spin opacity-70" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <QrCode className="size-4" />
                  Tạo mã QR
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Verify */}
        {step === "verify" && (
          <div className="space-y-6 py-2">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border-2 border-border/20 bg-white p-6 shadow-lg shadow-primary/5">
                <img src={qrCodeUrl} alt="QR Code" className="size-52" />
              </div>
              <p className="text-xs text-center text-muted-foreground/60 max-w-sm font-medium leading-relaxed">
                Quét mã QR này bằng ứng dụng xác thực của bạn
              </p>
            </div>

            {/* Manual Entry */}
            <Field className="space-y-3">
              <FieldLabel className="text-muted-foreground/70">
                Hoặc nhập khóa này thủ công:
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copiedSecret ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </Field>

            {/* Verification Form */}
            <form
              onSubmit={form.handleSubmit(handleVerify)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Controller
                  name="code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="code">Nhập mã 6 chữ số từ ứng dụng</FieldLabel>
                      <div className="flex justify-center py-2">
                        <InputOTP
                          maxLength={6}
                          {...field}
                          id="code"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={enableMutation.isPending}
                className="w-full"
              >
                {enableMutation.isPending ? (
                  <>
                    <Spinner className="size-4 animate-spin opacity-70" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <Key className="size-4" />
                    Xác thực và bật
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === "backup" && (
          <div className="space-y-6 py-2">
            <Alert className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Key className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-600">Lưu các mã dự phòng này</AlertTitle>
              <AlertDescription className="text-amber-600/90">
                Mỗi mã chỉ có thể sử dụng một lần. Lưu trữ chúng ở nơi an toàn trong trường hợp bạn mất quyền truy cập vào ứng dụng xác thực.
              </AlertDescription>
            </Alert>

            {/* Backup Codes Grid */}
            <div className="grid grid-cols-2 gap-3 p-5 rounded-lg border border-border/20 bg-muted/10">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-background px-4 py-3 text-center font-mono text-sm font-medium border border-border/10 shadow-sm"
                >
                  {code}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={copyBackupCodes}
                variant="outline"
                className="flex-1 gap-2"
              >
                {copiedCodes ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span className="text-xs font-bold">Sao chép</span>
              </Button>
              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="size-4" />
                <span className="text-xs font-bold">Tải xuống</span>
              </Button>
            </div>

            <Button
              onClick={handleFinish}
              className="w-full"
            >
              Tôi đã lưu mã dự phòng
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog >
  );
}
