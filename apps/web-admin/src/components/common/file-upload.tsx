import { useState, useRef } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Upload, X, FileAudio } from 'lucide-react';
import { toast } from '@workspace/ui/components/sonner';
import axios from 'axios';
import { apiClient } from '@/lib/api/api-client';
import { cn } from '@workspace/ui/lib/utils';
import { Spinner } from "@workspace/ui/components/spinner";

interface FileUploadProps {
    onUploadComplete: (url: string) => void;
    accept?: string;
    label?: string;
    currentValue?: string;
    disabled?: boolean;
}

export function FileUpload({ onUploadComplete, accept = 'audio/*', label = 'Tải lên tệp', currentValue, disabled }: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentValue);

    const handleFile = async (file: File) => {
        if (!file) return;

        // Check file type manually since drag-and-drop might bypass accept attribute
        if (accept && accept !== '*') {
            if (accept && !file.type.match(accept.replace('*', '.*'))) {
                toast.error('Định dạng file không hợp lệ', {
                    description: `Vui lòng tải lên file ${accept.split('/')[0]} hợp lệ.`
                });
                return;
            }
        }

        setIsUploading(true);
        try {
            // 1. Get Presigned URL using configured apiClient (with correct BaseURL and Auth)
            const { data: presignData } = await apiClient.post('/api/storage/upload-url', {
                filename: file.name,
                contentType: file.type,
                module: 'learning', // Default module
                ownerId: 'user', // Backend will override this with actual user ID
            });

            if (!presignData || !presignData.data || !presignData.data.uploadUrl) {
                throw new Error('Không thể lấy URL tải lên');
            }

            const { uploadUrl, fileUrl, fileId } = presignData.data;

            // 2. Upload to R2 (Directly) using raw axios (no custom headers)
            // R2/S3 presigned URLs usually require the specific Content-Type header matched in signature
            await axios.put(uploadUrl, file, {
                headers: {
                    'Content-Type': file.type,
                },
            });

            // 3. Confirm Upload using apiClient
            await apiClient.post('/api/storage/confirm-upload', {
                fileId: fileId,
            });

            // 4. Success
            setPreviewUrl(fileUrl);
            onUploadComplete(fileUrl);
            toast.success('Tải lên thành công!');

        } catch (error: any) {
            console.error('Upload failed:', error);
            const message = error.response?.data?.message || error.message || 'Tải lên thất bại. Vui lòng thử lại.';
            toast.error('Tải lên thất bại', { description: message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleFile(file);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await handleFile(files[0]);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(undefined);
        onUploadComplete('');
    };

    return (
        <div className="space-y-2">
            {!previewUrl ? (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group",
                        isDragging ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                    />
                    {isUploading ? (
                        <Spinner className="h-8 w-8 text-primary" />
                    ) : (
                        <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <div className="text-center">
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {isUploading ? 'Đang tải lên...' : label}
                        </span>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Kéo thả hoặc bấm để chọn tệp
                        </p>
                    </div>
                </div>
            ) : (
                <div className="relative p-3 rounded-lg border bg-muted/50 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <FileAudio className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{previewUrl.split('/').pop()}</p>
                        <p className="text-xs text-muted-foreground">Tải lên hoàn tất</p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleRemove}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
