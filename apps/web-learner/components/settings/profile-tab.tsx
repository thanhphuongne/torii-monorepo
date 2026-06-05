'use client'

import React, { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
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
import { Textarea } from '@workspace/ui/components/textarea'
import { Input } from '@workspace/ui/components/input'
import { Spinner } from '@workspace/ui/components/spinner'
import { useAppSelector, useAppDispatch } from '@/hooks/hooks'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/lib/api/services/profile-api'
import { fetchProfile } from '@/store/slices/authSlice'
import { toast } from 'sonner'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'

export function ProfileTab() {
    const { user } = useAppSelector((state) => state.auth)
    const dispatch = useAppDispatch()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const userMeta = (user as any)?.userMetadata ?? {}

    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        phone: (userMeta?.phone as string) || '',
        address: (userMeta?.address as string) || '',
        bio: (userMeta?.bio as string) || '',
        dateOfBirth: (userMeta?.dateOfBirth as string) || '',
    })

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) =>
            profileApi.updateProfile({
                displayName: data.displayName,
                userMetadata: {
                    ...userMeta,
                    phone: data.phone || undefined,
                    address: data.address || undefined,
                    bio: data.bio || undefined,
                    dateOfBirth: data.dateOfBirth || undefined,
                },
            }),
        onSuccess: async () => {
            await dispatch(fetchProfile())
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            toast.success('Cập nhật cài đặt thành công!')
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Cập nhật thất bại')
        }
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file: File) => profileApi.uploadAvatar(file),
        onSuccess: async () => {
            await dispatch(fetchProfile())
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            queryClient.invalidateQueries({ queryKey: ['auth'] })
            toast.success('Đã cập nhật ảnh đại diện!')
        }
    })

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) uploadAvatarMutation.mutate(file)
    }

    const handleCancel = () => {
        setFormData({
            displayName: user?.displayName || '',
            email: user?.email || '',
            phone: (userMeta?.phone as string) || '',
            address: (userMeta?.address as string) || '',
            bio: (userMeta?.bio as string) || '',
            dateOfBirth: (userMeta?.dateOfBirth as string) || '',
        })
    }

    const avatarSrc = useAvatarUrl(user?.avatarUrl || null)

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar: Avatar & Summary */}
            <div className="lg:col-span-4">
                <Card className="border-none shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="text-lg font-bold">Ảnh đại diện</CardTitle>
                        <CardDescription>Cập nhật ảnh hiển thị của bạn.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 py-8">
                        <div className="relative group cursor-pointer" onClick={() => !uploadAvatarMutation.isPending && fileInputRef.current?.click()}>
                            <div className="h-36 w-36 rounded-full bg-muted overflow-hidden border-4 border-background shadow-lg transition-all group-hover:opacity-80">
                                <img
                                    alt="Ảnh hồ sơ"
                                    className="h-full w-full object-cover"
                                    src={
                                        avatarSrc ||
                                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
                                    }
                                />
                                {uploadAvatarMutation.isPending && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                        <Spinner className="size-8" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-1 right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                                <Camera className="size-4" />
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        
                        <div className="text-center">
                            <h3 className="text-xl font-bold tracking-tight">
                                {user?.displayName || 'Người dùng'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {user?.email || 'Học viên Torii'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Settings Form */}
            <div className="lg:col-span-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Thông tin tài khoản</CardTitle>
                        <CardDescription>
                            Cập nhật thông tin cá nhân và cài đặt học tập.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel>Tên hiển thị</FieldLabel>
                                <Input
                                    id="displayName"
                                    placeholder="VD: Nguyễn Văn A"
                                    value={formData.displayName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, displayName: e.target.value })
                                    }
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Email đăng nhập</FieldLabel>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={formData.email} 
                                    disabled 
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Số điện thoại</FieldLabel>
                                <Input
                                    id="phone"
                                    inputMode="tel"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    placeholder="VD: 090xxxxxxx"
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Ngày sinh</FieldLabel>
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    className="w-full min-w-0 appearance-none h-10"
                                    value={formData.dateOfBirth}
                                    onChange={(e) =>
                                        setFormData({ ...formData, dateOfBirth: e.target.value })
                                    }
                                />
                            </Field>
                        </div>

                        <Field>
                            <FieldLabel>Địa chỉ hiện tại</FieldLabel>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) =>
                                    setFormData({ ...formData, address: e.target.value })
                                }
                                placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Giới thiệu bản thân</FieldLabel>
                            <Textarea
                                id="bio"
                                className="min-h-[120px]"
                                value={formData.bio}
                                onChange={(e) =>
                                    setFormData({ ...formData, bio: e.target.value })
                                }
                                placeholder="Chia sẻ một chút về mục tiêu học tiếng Nhật của bạn…"
                            />
                        </Field>

                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/50">
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-10 px-6 rounded-xl font-bold transition-all"
                                onClick={handleCancel}
                                disabled={updateMutation.isPending}
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                className="h-10 px-8 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/20"
                                onClick={() => updateMutation.mutate(formData)}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <><Spinner className="mr-2 h-4 w-4" /> Đang lưu...</>
                                ) : (
                                    'Lưu thay đổi'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
