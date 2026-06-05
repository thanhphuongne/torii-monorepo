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
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldTitle,
} from "@workspace/ui/components/field";
import { toast } from "@workspace/ui/components/sonner";
import {
  Smartphone,
  QrCode,
  Key,
  Download,
  Copy,
  Check
} from "lucide-react";
import {
  useGenerateTotpSecret,
  useEnableTotp,
} from "@/lib/api/services/two-factor-auth";
import { Spinner } from "@workspace/ui/components/spinner";

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
      toast.success("Đã bật xác thực hai yếu tố thành công.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Smartphone className="size-5 text-primary" />
            Bật xác thực hai yếu tố
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground/60">
            {step === "generate" && "Thiết lập 2FA để bảo vệ tài khoản của bạn"}
            {step === "verify" &&
              "Quét mã QR bằng ứng dụng xác thực của bạn"}
            {step === "backup" && "Lưu mã dự phòng ở nơi an toàn"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Generate */}
        {step === "generate" && (
          <>
            <div className="space-y-6">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex gap-3">
                  <Smartphone className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Bạn cần một ứng dụng xác thực
                    </p>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                      Tải xuống ứng dụng xác thực như Google Authenticator,
                      Authy, hoặc Microsoft Authenticator trên điện thoại của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Hủy Bỏ</Button>
              </DialogClose>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <QrCode className="size-4" />
                    Tạo mã QR
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Verify */}
        {step === "verify" && (
          <form
            onSubmit={form.handleSubmit(handleVerify)}
          >
            <FieldGroup className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-xl border-2 border-border/20 bg-white p-4">
                  <img src={qrCodeUrl} alt="QR Code" className="size-48" />
                </div>
                <FieldDescription className="text-center">
                  Quét mã QR này bằng ứng dụng xác thực của bạn
                </FieldDescription>
              </div>

              {/* Manual Entry */}
              <Field className="space-y-2">
                <FieldTitle>Hoặc nhập mã khóa thủ công:</FieldTitle>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-xs bg-muted/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
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
              <Controller
                name="code"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="space-y-2">
                    <FieldLabel htmlFor={field.name} className="text-sm font-medium">
                      Nhập mã 6 số từ ứng dụng
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                      autoComplete="off"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep("generate")}
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={enableMutation.isPending}
              >
                {enableMutation.isPending ? (
                  <>
                    <Spinner />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <Key className="size-4" />
                    Xác thực và Bật
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 3: Backup Codes */}
        {step === "backup" && (
          <>
            <div className="space-y-6">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex gap-3">
                  <Key className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Lưu các mã dự phòng này
                    </p>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                      Mỗi mã chỉ có thể sử dụng một lần. Lưu chúng ở nơi an toàn
                      trong trường hợp bạn mất quyền truy cập vào ứng dụng xác thực.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Codes Grid */}
              <div className="grid grid-cols-2 gap-2 p-4 rounded-lg border border-border/20 bg-muted/20">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="rounded-md bg-background px-3 py-2 text-center font-mono text-sm font-medium"
                  >
                    {code}
                  </div>
                ))}
              </div>

              {/* Sub-Actions */}
              <div className="flex gap-2">
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
                  Sao chép mã
                </Button>
                <Button
                  onClick={downloadBackupCodes}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Download className="size-4" />
                  Tải xuống
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={handleFinish} className="w-full">
                Tôi đã lưu mã dự phòng
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
