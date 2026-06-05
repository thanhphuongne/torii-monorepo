import { PageLoading } from '@workspace/ui/components/page-loading';

import { FullScreenPageBackdrop } from '@/components/extra-pages/full-screen-backdrop';

interface ILoadingProps {
  text: string;
}
const Loading = ({ text }: ILoadingProps) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-4">
      <FullScreenPageBackdrop />
      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        <PageLoading className="min-h-0 bg-transparent" />
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
};

export default Loading;
