import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userLoginDTOSchema, type UserLoginDTO } from '@workspace/schemas';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks.ts';
import { login, checkAuth, selectAuthError, selectAuthLoading, setError } from '@/store/slices/auth-slice.ts';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from '@workspace/ui/components/sonner';
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Spinner } from "@workspace/ui/components/spinner";
import { useLogo } from '@/hooks/useLogo';

const ADMIN_PANEL_ENTRY_PERMISSIONS = [
  "ops.user.view",
  "ops.user.manage",
  "lms.catalog.read",
  "lms.catalog.create",
  "lms.catalog.update",
  "lms.catalog.approve",
  "lms.delivery.read",
  "lms.delivery.create",
  "lms.delivery.update",
  "lms.delivery.approve",
  "lms.delivery.request.create",
  "lms.delivery.request.read",
  "lms.delivery.request.cancel",
  "lms.assessment.read",
  "lms.assessment.create",
  "lms.assessment.update",
  "lms.assessment.grade",
  "lms.commerce.read",
  "lms.commerce.create",
  "lms.commerce.update",
  "lms.commerce.approve",
  "ops.order.manage",
  "ops.coupon.manage",
  "ops.subscription.manage",
  "ops.support.view",
  "ops.support.handle",
  "ops.audit.view",
  "ops.report.view",
  "ops.blog.manage",
  "ops.gamification.manage",
];

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const [showPassword, setShowPassword] = useState(false);
  const logo = useLogo();

  // Initial check - redirect if already authenticated
  useEffect(() => {
    dispatch(checkAuth())
      .unwrap()
      .then((user) => {
        if (user) navigate('/', { replace: true });
      })
      .catch(() => {
        // Not authenticated, stay on login page
      });
  }, [dispatch, navigate]);

  const form = useForm<UserLoginDTO>({
    resolver: zodResolver(userLoginDTOSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: UserLoginDTO) => {
    dispatch(setError(null));

    try {
      await dispatch(login(data)).unwrap();

      // Refresh auth state to get full permissions/profile
      const fullUser = await dispatch(checkAuth()).unwrap();

      const permissions = (fullUser.permissions || []) as string[];
      const canEnter =
        permissions.some((p) => ADMIN_PANEL_ENTRY_PERMISSIONS.includes(p));
      if (!canEnter) {
        dispatch(setError('Bạn không có quyền truy cập bảng quản trị.'));
        toast.error('Từ chối truy cập: Cổng quản trị bị hạn chế.');
        return;
      }

      toast.success(`Chào mừng trở lại, ${fullUser.displayName || 'Quản trị viên'}`);
      navigate('/', { replace: true });
    } catch (err: any) {
      // Check for 2FA requirement in rejection payload
      if (err && typeof err === 'object' && err.requiresTwoFactor) {
        navigate('/auth/verify-2fa', {
          state: {
            tempToken: err.tempToken,
            twoFactorMethod: err.twoFactorMethod,
          },
          replace: true,
        });
        return;
      }

      // Error message already extracted by extractErrorMessage in auth-slice
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Xác thực thất bại');
      toast.error(errorMessage);
    }
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={logo} alt="Torii Nihongo" className="h-24 w-auto object-contain mb-2" />
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cổng quản trị</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Vui lòng nhập thông tin để truy cập hệ thống.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="Nhập email của bạn"
                      type="email"
                      autoComplete="email"
                    />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name} className="text-sm font-semibold">Mật khẩu</FieldLabel>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/forgot-password')}
                        className="h-auto p-0"
                      >
                        Quên mật khẩu?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        id={field.name}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="font-normal">Duy trì đăng nhập</Label>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/15 text-destructive p-3 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={loading}>
                {loading && <Spinner className="mr-2" />}
                Đăng nhập
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground">
            © 2026 TORII HOLDINGS
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
