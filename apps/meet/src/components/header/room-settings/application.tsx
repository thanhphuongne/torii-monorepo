import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  updateAllowPlayAudioNotification,
  updateFocusActiveSpeakerWebcam,
  updateTheme,
} from '@/store/slices/roomSettingsSlice';
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Switch } from '@workspace/ui/components/switch';

const ApplicationSettings = () => {
  const dispatch = useAppDispatch();

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const focusActiveSpeakerWebcam = useAppSelector(
    (state) => state.roomSettings.focusActiveSpeakerWebcam,
  );
  const allowPlayAudioNotification = useAppSelector(
    (state) => state.roomSettings.allowPlayAudioNotification,
  );

  return (
    <FieldGroup className="gap-0">
      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 border-b border-border/60 py-3 first:pt-0"
      >
        <FieldLabel
          htmlFor="app-dark-theme"
          className="cursor-pointer font-normal text-foreground"
        >
          Bật chủ đề tối
        </FieldLabel>
        <Switch
          id="app-dark-theme"
          checked={theme === 'dark'}
          onCheckedChange={(checked) =>
            dispatch(updateTheme(checked ? 'dark' : 'light'))
          }
        />
      </Field>
      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0"
      >
        <FieldLabel
          htmlFor="app-focus-speaker"
          className="cursor-pointer font-normal text-foreground"
        >
          Tập trung vào máy ảnh người đang nói
        </FieldLabel>
        <Switch
          id="app-focus-speaker"
          checked={!!focusActiveSpeakerWebcam}
          onCheckedChange={(checked) =>
            dispatch(updateFocusActiveSpeakerWebcam(checked))
          }
        />
      </Field>
      <Field
        orientation="horizontal"
        className="items-center justify-between gap-4 py-3 last:border-b-0"
      >
        <FieldLabel
          htmlFor="app-audio-notification"
          className="cursor-pointer font-normal text-foreground"
        >
          Cho phép thông báo âm thanh
        </FieldLabel>
        <Switch
          id="app-audio-notification"
          checked={allowPlayAudioNotification}
          onCheckedChange={(checked) =>
            dispatch(updateAllowPlayAudioNotification(checked))
          }
        />
      </Field>
    </FieldGroup>
  );
};

export default ApplicationSettings;
