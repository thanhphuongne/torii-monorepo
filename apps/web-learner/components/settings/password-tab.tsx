'use client'

import React, { useState } from 'react'
import { Shield, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@workspace/ui/components/card'
import {
    Field,
    FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { useChangePassword, useLinkedProviders } from '@/lib/api/services/auth-api'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"

export function PasswordTab() {
    const { data: linkedProviders } = useLinkedProviders()
    const hasPassword = linkedProviders?.hasPassword ?? true
    const changePasswordMutation = useChangePassword()

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    })

    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

    const handleChangePassword = async () => {
        const currentPassword = passwordForm.currentPassword.trim()
        const newPassword = passwordForm.newPassword.trim()
        const confirmNewPassword = passwordForm.confirmNewPassword.trim()

        if (hasPassword && !currentPassword) {
            toast.error('Vui lòng nhập mật khẩu hiện tại')
            return
        }
        if (newPassword.length < 8) {
            toast.error('Mật khẩu mới phải có ít nhất 8 ký tự')
            return
        }
        if (newPassword !== confirmNewPassword) {
            toast.error('Mật khẩu xác nhận không khớp')
            return
        }
        if (hasPassword && newPassword === currentPassword) {
            toast.error('Mật khẩu mới phải khác mật khẩu hiện tại')
            return
        }

        try {
            const res = await changePasswordMutation.mutateAsync({
                oldPassword: hasPassword ? currentPassword : '',
                newPassword,
            })
            if (res.success) {
                toast.success(hasPassword ? 'Đổi mật khẩu thành công' : 'Thiết lập mật khẩu thành công')
                setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
                setShowCurrentPassword(false)
                setShowNewPassword(false)
                setShowConfirmNewPassword(false)
            } else {
                toast.error(res.message || (hasPassword ? 'Đổi mật khẩu thất bại' : 'Thiết lập mật khẩu thất bại'))
            }
        } catch (error: any) {
            toast.error(error?.message || (hasPassword ? 'Đổi mật khẩu thất bại' : 'Thiết lập mật khẩu thất bại'))
        }
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar: Security Info */}
            <div className="lg:col-span-4">
                <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden h-full">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="text-lg font-bold">Bảo mật mật khẩu</CardTitle>
                        <CardDescription>Giữ cho tài khoản của bạn luôn an toàn.</CardDescription>
                    </CardHeader>
                    <CardContent className="py-8 space-y-6">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 rounded-3xl bg-primary/10 text-primary shadow-inner">
                                <Lock className="size-10" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Mật khẩu mạnh</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                                    Sử dụng ít nhất 8 ký tự, bao gồm cả chữ cái, số và ký hiệu đặc biệt.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/50">
                            <ul className="space-y-3">
                                {[
                                    'Không sử dụng mật khẩu cũ',
                                    'Định kỳ đổi mật khẩu',
                                    'Sử dụng mật khẩu duy nhất'
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <Shield className="size-3 text-emerald-500" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Password Form */}
            <div className="lg:col-span-8">
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle>{hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu'}</CardTitle>
                        <CardDescription>
                            {hasPassword 
                                ? 'Cập nhật mật khẩu để bảo vệ tài khoản của bạn khỏi bị truy cập trái phép.'
                                : 'Thiết lập mật khẩu gốc để có thể đăng nhập trực tiếp bằng email.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {hasPassword && (
                            <Field>
                                <FieldLabel>Mật khẩu hiện tại</FieldLabel>
                                <div className="relative group">
                                    <Input
                                        id="currentPassword"
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={passwordForm.currentPassword}
                                        onChange={(e) =>
                                            setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                                        }
                                        placeholder="Nhập mật khẩu đang sử dụng"
                                        className="pr-12"
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full w-10 hover:bg-transparent text-muted-foreground transition-colors group-hover:text-foreground"
                                        onClick={() => setShowCurrentPassword((v) => !v)}
                                    >
                                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                </div>
                            </Field>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel>Mật khẩu mới</FieldLabel>
                                <div className="relative group">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={passwordForm.newPassword}
                                        onChange={(e) =>
                                            setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                                        }
                                        placeholder="Tối thiểu 8 ký tự"
                                        className="pr-12"
                                        autoComplete="new-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full w-10 hover:bg-transparent text-muted-foreground transition-colors group-hover:text-foreground"
                                        onClick={() => setShowNewPassword((v) => !v)}
                                    >
                                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                </div>
                            </Field>

                            <Field>
                                <FieldLabel>Xác nhận mật khẩu mới</FieldLabel>
                                <div className="relative group">
                                    <Input
                                        id="confirmNewPassword"
                                        type={showConfirmNewPassword ? 'text' : 'password'}
                                        value={passwordForm.confirmNewPassword}
                                        onChange={(e) =>
                                            setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
                                        }
                                        placeholder="Xác nhận mật khẩu mới"
                                        className="pr-12"
                                        autoComplete="new-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full w-10 hover:bg-transparent text-muted-foreground transition-colors group-hover:text-foreground"
                                        onClick={() => setShowConfirmNewPassword((v) => !v)}
                                    >
                                        {showConfirmNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                </div>
                            </Field>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/50">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })}
                                disabled={changePasswordMutation.isPending}
                            >
                                Xóa trường
                            </Button>
                            <Button
                                type="button"
                                className="font-bold"
                                onClick={handleChangePassword}
                                disabled={changePasswordMutation.isPending}
                            >
                                {changePasswordMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                                {hasPassword ? 'Lưu mật khẩu mới' : 'Thiết lập mật khẩu'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
