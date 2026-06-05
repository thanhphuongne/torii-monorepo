import { useState, useRef } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Upload, X, FileText, Paperclip } from 'lucide-react';
import { toast } from '@workspace/ui/components/sonner';
import { storageApi } from '@/lib/api/services/storage-api';
import { cn } from '@workspace/ui/lib/utils';
import { Spinner } from "@workspace/ui/components/spinner";

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
                // Check if already uploaded (basic check by name, though URLs might differ)
                // In a real app, we might want to check for duplicates more robustly
                
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
                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group bg-muted/30",
                    "hover:border-primary hover:bg-muted",
                    isDragging && "border-primary bg-primary/10",
                    (disabled || isUploading || urls.length >= maxFiles) && "opacity-50 cursor-not-allowed"
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
                
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-background group-hover:bg-primary/10 transition-colors">
                    {isUploading ? (
                        <Spinner className="h-6 w-6 text-primary" />
                    ) : (
                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                </div>

                <div className="text-center">
                    <p className="text-sm font-semibold">
                        {isUploading ? 'Đang tải lên...' : label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Kéo thả hoặc click để chọn (Tối đa {maxFiles})
                    </p>
                </div>
            </div>

            {urls.length > 0 && (
                <div className="grid gap-3">
                    {urls.map((url, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-md border bg-background group/item">
                            <div className="p-2 bg-muted rounded-md">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{getFileName(url)}</p>
                                <div className="flex items-center gap-1.5">
                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Sẵn sàng</span>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md opacity-50 group-hover/item:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(url);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
