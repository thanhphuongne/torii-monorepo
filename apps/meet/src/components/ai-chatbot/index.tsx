import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { Bot } from 'lucide-react';
import sendAPIRequest from '@/helpers/api/api-client';

import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from '@workspace/ui/components/ai/attachments';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from '@workspace/ui/components/ai/conversation';
import {
    Message,
    MessageBranch,
    MessageBranchContent,
    MessageBranchNext,
    MessageBranchPage,
    MessageBranchPrevious,
    MessageBranchSelector,
    MessageContent,
    MessageResponse,
} from '@workspace/ui/components/ai/message';
import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputHeader,
    type PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from '@workspace/ui/components/ai/prompt-input';
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from '@workspace/ui/components/ai/reasoning';
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from '@workspace/ui/components/ai/sources';

const nanoid = () => crypto.randomUUID();

interface MessageVersion {
    id: string;
    content: string;
}

interface MessageType {
    key: string;
    from: 'user' | 'assistant' | 'system';
    sources?: { href: string; title: string }[];
    versions: MessageVersion[];
    reasoning?: {
        content: string;
        duration: number;
    };
}

const PromptInputAttachmentsDisplay = () => {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
        return null;
    }

    return (
        <Attachments variant="inline">
            {attachments.files.map((attachment) => (
                <Attachment
                    data={attachment}
                    key={attachment.id}
                    onRemove={() => attachments.remove(attachment.id)}
                >
                    <AttachmentPreview />
                    <AttachmentRemove />
                </Attachment>
            ))}
        </Attachments>
    );
};

export function AiChatBot() {
    const [text, setText] = useState<string>('');
    const [status, setStatus] = useState<
        'submitted' | 'streaming' | 'ready' | 'error'
    >('ready');

    const [messages, setMessages] = useState<MessageType[]>([
        {
            key: 'welcome',
            from: 'assistant',
            versions: [
                {
                    id: 'welcome-v1',
                    content: 'Konnichiwa! Mình là AI Sensei. Bạn muốn học gì hôm nay?',
                },
            ],
        },
    ]);

    const streamResponse = useCallback(
        async (messageKey: string, versionId: string, fullContent: string) => {
            setStatus('streaming');

            const chunks = fullContent.split('');
            let currentContent = '';

            setMessages((prev) =>
                prev.map((m) =>
                    m.key === messageKey
                        ? {
                            ...m,
                            versions: m.versions.map((v) =>
                                v.id === versionId ? { ...v, content: '' } : v,
                            ),
                        }
                        : m,
                ),
            );

            for (const char of chunks) {
                currentContent += char;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.key === messageKey
                            ? {
                                ...m,
                                versions: m.versions.map((v) =>
                                    v.id === versionId ? { ...v, content: currentContent } : v,
                                ),
                            }
                            : m,
                    ),
                );
                await new Promise((resolve) => setTimeout(resolve, 5));
            }

            setStatus('ready');
        },
        [],
    );

    const handleSend = async (content: string) => {
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        setStatus('submitted');
        const userMsg: MessageType = {
            key: nanoid(),
            from: 'user',
            versions: [{ id: nanoid(), content: trimmedContent }],
        };

        setMessages((prev) => [...prev, userMsg]);
        setText('');

        try {
            const history = messages.slice(-10).map((m) => ({
                role: m.from,
                content: m.versions[m.versions.length - 1]?.content || '',
            }));

            const aiKey = nanoid();
            const versionId = nanoid();
            setMessages((prev) => [
                ...prev,
                {
                    key: aiKey,
                    from: 'assistant',
                    versions: [{ id: versionId, content: '...' }],
                },
            ]);

            const response = await sendAPIRequest('/agents/chat', {
                message: trimmedContent,
                history,
            });

            if (response && response.success && response.data) {
                await streamResponse(aiKey, versionId, response.data.message);
            } else {
                throw new Error(response?.msg || 'Lỗi kết nối tới Sensei');
            }
        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMessage = error.message || 'Lỗi kết nối tới Sensei';
            toast.error(errorMessage);
            setMessages((prev) =>
                prev.map((m) =>
                    m.from === 'assistant' && m.versions.some((v) => v.content === '...')
                        ? {
                            ...m,
                            versions: m.versions.map((v) =>
                                v.content === '...' ? { ...v, content: errorMessage } : v,
                            ),
                        }
                        : m,
                ),
            );
            setStatus('ready');
        }
    };

    const handleSubmit = (message: PromptInputMessage) => {
        if (!message.text.trim()) return;
        handleSend(message.text);
    };

    return (
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-sm font-bold">AI Sensei</h2>
                    <p className="text-[10px] text-muted-foreground leading-none">Trợ lý học tập thông minh</p>
                </div>
            </div>

            <Conversation className="min-h-0 flex-1 border-b border-border bg-background/50">
                <ConversationContent className="p-4 sm:p-6">
                    {messages.map((msg) => (
                        <MessageBranch defaultBranch={0} key={msg.key}>
                            <MessageBranchContent>
                                {msg.versions.map((version) => (
                                    <Message
                                        from={msg.from}
                                        key={version.id}
                                        className="max-w-full"
                                    >
                                        <div className="flex min-w-0 flex-col gap-2">
                                            {msg.sources?.length && (
                                                <Sources>
                                                    <SourcesTrigger count={msg.sources.length} />
                                                    <SourcesContent>
                                                        {msg.sources.map((source) => (
                                                            <Source
                                                                href={source.href}
                                                                key={source.href}
                                                                title={source.title}
                                                            />
                                                        ))}
                                                    </SourcesContent>
                                                </Sources>
                                            )}
                                            {msg.reasoning && (
                                                <Reasoning duration={msg.reasoning.duration}>
                                                    <ReasoningTrigger />
                                                    <ReasoningContent>
                                                        {msg.reasoning.content}
                                                    </ReasoningContent>
                                                </Reasoning>
                                            )}
                                            <MessageContent>
                                                <MessageResponse className="break-words leading-relaxed whitespace-pre-wrap text-[13px] font-medium [word-break:normal]">
                                                    {version.content}
                                                </MessageResponse>
                                            </MessageContent>
                                        </div>
                                    </Message>
                                ))}
                            </MessageBranchContent>
                            {msg.versions.length > 1 && (
                                <MessageBranchSelector from={msg.from}>
                                    <MessageBranchPrevious />
                                    <MessageBranchPage />
                                    <MessageBranchNext />
                                </MessageBranchSelector>
                            )}
                        </MessageBranch>
                    ))}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            <div className="shrink-0 border-t border-border bg-muted/20 p-3 pb-4 shadow-inner min-w-0">
                <div className="w-full min-w-0">
                    <PromptInput multiple onSubmit={handleSubmit} className="border-border bg-background shadow-sm rounded-lg overflow-hidden">
                        <PromptInputHeader className="p-0 border-none">
                            <PromptInputAttachmentsDisplay />
                        </PromptInputHeader>
                        <PromptInputBody className="p-0 border-none bg-transparent">
                            <PromptInputTextarea
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setText(e.target.value)
                                }
                                value={text}
                                placeholder="Hỏi Sensei..."
                                className="min-h-[44px] max-h-[120px] px-3 py-2 text-sm font-medium placeholder:font-normal border-none shadow-none focus-visible:ring-0 resize-none ring-0 focus:ring-0"
                                disabled={status === 'streaming' || status === 'submitted'}
                            />
                        </PromptInputBody>
                        <PromptInputFooter className="p-1 pr-2 border-none bg-transparent">
                            <PromptInputTools />
                            <PromptInputSubmit
                                disabled={
                                    !text.trim() || status === 'streaming' || status === 'submitted'
                                }
                                status={
                                    status === 'streaming' || status === 'submitted'
                                        ? 'submitted'
                                        : 'ready'
                                }
                                className="h-8 w-8"
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}

export default AiChatBot;
