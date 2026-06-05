import React from 'react';

import { FullScreenPageBackdrop } from '@/components/extra-pages/full-screen-backdrop';

export interface IErrorPageProps {
  title: string;
  text: string;
}

const ErrorPage = ({ title, text }: IErrorPageProps) => {
  return (
    <div
      id="errorPage"
      className="error-page relative flex h-screen w-full items-center justify-center bg-background p-4"
    >
      <FullScreenPageBackdrop />
      <div className="content relative z-10 flex min-h-64 w-full max-w-xl items-center overflow-hidden rounded-2xl border border-border bg-card px-10 py-10 text-center shadow-xl 3xl:min-h-80">
        <div className="inner w-full">
          <h2 className="mb-6 text-xl leading-tight font-semibold text-foreground 3xl:text-2xl">
            {title}
          </h2>
          <p className="wrap-break-word text-sm leading-relaxed text-muted-foreground 3xl:text-base">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
