import React, { RefObject, useEffect } from 'react';
import { BodyPix } from '@tensorflow-models/body-pix';

import { BackgroundConfig } from '@/components/virtual-background/helpers/background-helper';
import { PostProcessingConfig } from '@/components/virtual-background/helpers/post-processing-helper';
import { SegmentationConfig } from '@/components/virtual-background/helpers/segmentation-helper';
import { SourcePlayback } from '@/components/virtual-background/helpers/source-helper';
import useRenderingPipeline from '@/components/virtual-background/hooks/use-rendering-pipeline';
import { TFLite } from '@/components/virtual-background/helpers/utils';

type OutputViewerProps = {
  sourcePlayback: SourcePlayback;
  backgroundConfig: BackgroundConfig;
  segmentationConfig: SegmentationConfig;
  postProcessingConfig: PostProcessingConfig;
  bodyPix: BodyPix;
  tflite: TFLite;
  id: string;
  onCanvasRef?: (canvasRef: RefObject<HTMLCanvasElement>) => void;
};

const OutputViewer = ({
  sourcePlayback,
  backgroundConfig,
  segmentationConfig,
  postProcessingConfig,
  bodyPix,
  tflite,
  id,
  onCanvasRef,
}: OutputViewerProps) => {
  const { pipeline, canvasRef } = useRenderingPipeline(
    sourcePlayback,
    backgroundConfig,
    segmentationConfig,
    bodyPix,
    tflite,
  );

  useEffect(() => {
    if (onCanvasRef && canvasRef.current) {
      onCanvasRef(canvasRef);
    }
  }, [onCanvasRef, canvasRef]);

  useEffect(() => {
    if (pipeline) {
      pipeline.updatePostProcessingConfig(postProcessingConfig);
    }
  }, [pipeline, postProcessingConfig]);

  return (
    <div className="root preview-camera-webcam w-full h-64 3xl:h-80 flex">
      <canvas
        key={segmentationConfig.pipeline}
        ref={canvasRef}
        className="render w-full h-full object-cover"
        width={sourcePlayback.width}
        height={sourcePlayback.height}
        id={id}
      />
    </div>
  );
};

export default OutputViewer;
