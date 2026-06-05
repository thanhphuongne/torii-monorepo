import React, { useEffect, useState } from 'react';
import { VideoQuality } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  updateActivateWebcamsView,
  updateActiveScreenSharingView,
  updateMaxNumDisplayWebcams,
  updateRoomVideoQuality,
} from '@/store/slices/roomSettingsSlice';
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Switch } from '@workspace/ui/components/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { UserDeviceType } from '@/store/slices/interfaces/session';

const DataSavings = () => {
  const dispatch = useAppDispatch();
  const videoQuality = useAppSelector(
    (state) => state.roomSettings.roomVideoQuality,
  );
  const activateWebcamsView = useAppSelector(
    (state) => state.roomSettings.activateWebcamsView,
  );
  const activeScreenSharingView = useAppSelector(
    (state) => state.roomSettings.activeScreenSharingView,
  );
  const userDeviceType = useAppSelector(
    (state) => state.session.userDeviceType,
  );
  const maxNumDisplayWebcams = useAppSelector(
    (state) => state.roomSettings.maxNumDisplayWebcams,
  );
  const [numWebcamsOpts, setNumWebcamsOpts] = useState<
    { text: string; value: number }[]
  >([]);

  useEffect(() => {
    let opts: { text: string; value: number }[] = [
      { text: '4', value: 4 },
      { text: '6', value: 6 },
    ];

    if (userDeviceType === UserDeviceType.TABLET) {
      opts = [{ text: '9', value: 9 }];
    } else if (userDeviceType === UserDeviceType.DESKTOP) {
      opts.push(
        { text: '9', value: 9 },
        { text: '12', value: 12 },
        { text: '16', value: 16 },
        { text: '24', value: 24 },
      );
    }

    setNumWebcamsOpts(opts);
  }, [userDeviceType]);

  const getVideoQualityText = (quality: VideoQuality) => {
    switch (quality) {
      case VideoQuality.LOW:
        return 'Thấp';
      case VideoQuality.MEDIUM:
        return 'Trung bình';
      case VideoQuality.HIGH:
        return 'Cao';
      default:
        return '';
    }
  };

  const qualityOptions = Object.values(VideoQuality)
    .filter((q) => typeof q === 'number')
    .map((q) => ({
      value: q as VideoQuality,
      text: getVideoQualityText(q as VideoQuality),
    }));

  const maxWebcamValue = maxNumDisplayWebcams || 24;

  return (
    <FieldGroup className="gap-0">
      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 border-b border-border/60 py-3 first:pt-0"
      >
        <FieldLabel htmlFor="video-quality" className="font-normal text-foreground">
          Chất lượng video
        </FieldLabel>
        <Select
          value={String(videoQuality)}
          onValueChange={(v) =>
            dispatch(updateRoomVideoQuality(Number(v) as VideoQuality))
          }
        >
          <SelectTrigger id="video-quality" className="w-full sm:max-w-[220px]">
            <SelectValue placeholder="Chọn" />
          </SelectTrigger>
          <SelectContent>
            {qualityOptions.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 border-b border-border/60 py-3"
      >
        <FieldLabel
          htmlFor="data-screen-share"
          className="cursor-pointer font-normal text-foreground"
        >
          Hiện chia sẻ màn hình
        </FieldLabel>
        <Switch
          id="data-screen-share"
          checked={activeScreenSharingView}
          onCheckedChange={(checked) =>
            dispatch(updateActiveScreenSharingView(checked))
          }
        />
      </Field>

      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 border-b border-border/60 py-3"
      >
        <FieldLabel
          htmlFor="data-webcams"
          className="cursor-pointer font-normal text-foreground"
        >
          Hiện máy ảnh
        </FieldLabel>
        <Switch
          id="data-webcams"
          checked={activateWebcamsView}
          onCheckedChange={(checked) =>
            dispatch(updateActivateWebcamsView(checked))
          }
        />
      </Field>

      {activateWebcamsView && (
        <Field
          orientation="horizontal"
          className="items-center justify-between gap-4 py-3 last:border-b-0"
        >
          <FieldLabel
            htmlFor="max-num-webcam"
            className="font-normal text-foreground"
          >
            Số lượng máy ảnh tối đa
          </FieldLabel>
          <Select
            value={String(maxWebcamValue)}
            onValueChange={(v) => dispatch(updateMaxNumDisplayWebcams(Number(v)))}
          >
            <SelectTrigger id="max-num-webcam" className="w-full sm:max-w-[220px]">
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              {numWebcamsOpts.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </FieldGroup>
  );
};

export default DataSavings;
