import { PostProcessingConfig } from '@/components/virtual-background/helpers/post-processing-helper';

export type RenderingPipeline = {
  render(): Promise<void>;
  updatePostProcessingConfig(
    newPostProcessingConfig: PostProcessingConfig,
  ): void;
  // TODO Update background image only when loaded
  // updateBackgroundImage(backgroundImage: HTMLImageElement): void
  cleanUp(): void;
};
