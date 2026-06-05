import { useState, useRef } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Upload, X, FileText, Paperclip } from 'lucide-react';
import { toast } from '@workspace/ui/components/sonner';
import { storageApi } from '@/lib/api/services/storage-api';
import { cn } from '@workspace/ui/lib/utils';
// Note: Changed from Spinner to a generic loading state if Spinner is not available, 
// but let's assume it's in @workspace/ui/components/spinner as per admin
import { Loader2 } from "lucide-react";

interface MultiFileUploadProps {
    onUploadChange: (urls: string[]) => void;
    accept?: string;
    label?: string;
    currentUrls?: string[];
    disabled?: boolean;
    maxFiles?: number;
}

export function MultiFileUpload({
    onUploadChange,
    accept = '*',
    label = 'Tải lên tài liệu',
    currentUrls = [],
    disabled,
    maxFiles = 5
}: MultiFileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [urls, setUrls] = useState<string[]>(currentUrls);

    // Sync with external changes (e.g. from props)
    if (JSON.stringify(currentUrls) !== JSON.stringify(urls)) {
        // Only sync if we're not currently uploading
        if (!isUploading) {
            setUrls(currentUrls);
        }
    }

    const handleFiles = async (newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles);
        if (filesArray.length === 0) return;

        if (urls.length + filesArray.length > maxFiles) {
            toast.error(`Chỉ được phép tải lên tối đa ${maxFiles} tệp.`);
            return;
        }

        setIsUploading(true);
        const newUrls = [...urls];

        try {
            for (const file of filesArray) {
                const response = await storageApi.uploadFile(file, 'assignments');
                newUrls.push(response.fileUrl);
            }

            setUrls(newUrls);
            onUploadChange(newUrls);
            toast.success(`Đã tải lên ${filesArray.length} tệp thành công`);
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error('Tải lên thất bại. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            await handleFiles(event.target.files);
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled || isUploading) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await handleFiles(files);
        }
    };

    const handleRemove = (urlToRemove: string) => {
        const updatedUrls = urls.filter(url => url !== urlToRemove);
        setUrls(updatedUrls);
        onUploadChange(updatedUrls);
    };

    const getFileName = (url: string) => {
        try {
            const path = new URL(url).pathname;
            return path.split('/').pop() || 'file';
        } catch {
            return url.split('/').pop() || 'file';
        }
    };

    return (
        <div className="space-y-3">
            <div
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group bg-muted/20 hover:bg-muted/40",
                    "hover:border-primary/50",
                    isDragging && "border-primary bg-primary/5",
                    (disabled || isUploading || urls.length >= maxFiles) && "opacity-50 cursor-not-allowed border-muted-foreground/20"
                )}
                onClick={() => !disabled && !isUploading && urls.length < maxFiles && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled && !isUploading) setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={accept}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled || isUploading || urls.length >= maxFiles}
                />

                <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-background border border-border group-hover:border-primary/50 shadow-sm transition-all">
                    {isUploading ? (
                        <Loader2 className="h-7 w-7 text-primary animate-spin" />
                    ) : (
                        <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                </div>

                <div className="text-center space-y-1">
                    <p className="text-sm font-bold">
                        {isUploading ? 'Đang xử lý...' : label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Kéo thả hoặc click để chọn (Tối đa {maxFiles} tệp)
                    </p>
                </div>
            </div>

            {urls.length > 0 && (
                <div className="grid gap-2.5">
                    {urls.map((url, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-sm hover:border-primary/30 transition-colors group/item relative">
                            <div className="p-2.5 bg-muted rounded-lg border border-border">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 pr-10">
                                <p className="text-sm font-semibold truncate text-foreground">{getFileName(url)}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Đã sẵn sàng</span>
                                </div>
                            </div>
                            {!disabled && (
                                <button
                                    type="button"
                                    className="absolute right-3 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(url);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
