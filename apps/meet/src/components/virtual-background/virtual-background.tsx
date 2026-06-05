import React, { RefObject, useEffect, useState } from 'react';
import { BodyPix } from '@tensorflow-models/body-pix';

import OutputViewer from '@/components/virtual-background/output-viewer';
import { defaultPostProcessingConfig } from '@/components/virtual-background/helpers/post-processing-helper';
import { SourcePlayback } from '@/components/virtual-background/helpers/source-helper';
import {
  BackgroundConfig,
  defaultBackgroundConfig,
} from '@/components/virtual-background/helpers/background-helper';
import useTFLite from '@/components/virtual-background/hooks/use-TFLite';
import {
  defaultSegmentationConfig,
  SegmentationConfig,
} from '@/components/virtual-background/helpers/segmentation-helper';
import { loadBodyPix } from '@/components/virtual-background/helpers/utils';

interface IVirtualBackgroundProps {
  sourcePlayback: SourcePlayback;
  backgroundConfig?: BackgroundConfig;
  id: string;
  onCanvasRef?: (canvasRef: RefObject<HTMLCanvasElement>) => void;
}

const VirtualBackground = ({
  sourcePlayback,
  backgroundConfig,
  id,
  onCanvasRef,
}: IVirtualBackgroundProps) => {
  const [segmentationConfig, setSegmentationConfig] =
    useState<SegmentationConfig>(defaultSegmentationConfig);
  const [bodyPix, setBodyPix] = useState<BodyPix | undefined>(undefined);

  const { tflite, isSIMDSupported } = useTFLite(segmentationConfig);

  useEffect(() => {
    loadBodyPix(false).then((pix) => {
      setSegmentationConfig((previousSegmentationConfig) => {
        if (
          previousSegmentationConfig.backend === 'wasmSimd' &&
          !isSIMDSupported
        ) {
          return { ...previousSegmentationConfig, backend: 'wasm' };
        } else {
          return previousSegmentationConfig;
        }
      });
      setBodyPix(pix);
    });
  }, [isSIMDSupported]);

  return (
    sourcePlayback &&
    bodyPix &&
    tflite && (
      <OutputViewer
        sourcePlayback={sourcePlayback}
        backgroundConfig={backgroundConfig ?? defaultBackgroundConfig}
        segmentationConfig={segmentationConfig}
        postProcessingConfig={defaultPostProcessingConfig}
        bodyPix={bodyPix}
        tflite={tflite}
        id={id}
        onCanvasRef={onCanvasRef}
      />
    )
  );
};

export default VirtualBackground;
