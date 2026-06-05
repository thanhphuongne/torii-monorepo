import { AudioPresets, ScreenSharePresets, VideoPresets } from 'livekit-client';
import { errors } from '@nats-io/nats-core';

import { store } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { IParticipant } from '@/store/slices/interfaces/participant';
import { IMediaDevice } from '@/store/slices/interfaces/room-settings';
import { DEFAULT_AUDIO_PRESET, DEFAULT_SCREEN_SHARE_RESOLUTION, DEFAULT_WEBCAM_RESOLUTION } from "@/config";

export type inputMediaDeviceKind = 'audio' | 'video' | 'both';

export const getInputMediaDevices = async (kind: inputMediaDeviceKind) => {
  // 1. Request permissions to get device labels.
  // This is necessary because browsers won't provide labels without permission.
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: kind === 'audio' || kind === 'both',
      video: kind === 'video' || kind === 'both',
    });

    // 2. Enumerate devices now that we have permission.
    const devices = await navigator.mediaDevices.enumerateDevices();

    // 3. Filter and map devices into separate arrays.
    const audioDevices: IMediaDevice[] = [];
    const videoDevices: IMediaDevice[] = [];

    for (const device of devices) {
      // We only want devices with a deviceId.
      if (device.deviceId) {
        if (device.kind === 'audioinput') {
          audioDevices.push({ id: device.deviceId, label: device.label });
        } else if (device.kind === 'videoinput') {
          videoDevices.push({ id: device.deviceId, label: device.label });
        }
      }
    }

    return { audio: audioDevices, video: videoDevices };
  } finally {
    // 4. Clean up: stop all tracks to release the camera/mic.
    stream?.getTracks().forEach((track) => track.stop());
  }
};

const dec2hex = (dec) => {
  return dec.toString(16).padStart(2, '0');
};

export const randomString = (len = 20) => {
  const arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join('');
};

export const randomInteger = (len = 10) => {
  const arr = new Uint8Array(len / 2);
  window.crypto.getRandomValues(arr);
  return Number(arr.join(''));
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getWebcamResolution = () => {
  const selected = DEFAULT_WEBCAM_RESOLUTION;
  let resolution = VideoPresets.h720.resolution;

  switch (selected) {
    case 'h90':
      resolution = VideoPresets.h90.resolution;
      break;
    case 'h180':
      resolution = VideoPresets.h180.resolution;
      break;
    case 'h216':
      resolution = VideoPresets.h216.resolution;
      break;
    case 'h360':
      resolution = VideoPresets.h360.resolution;
      break;
    case 'h540':
      resolution = VideoPresets.h540.resolution;
      break;
    case 'h720':
      resolution = VideoPresets.h720.resolution;
      break;
    case 'h1080':
      resolution = VideoPresets.h1080.resolution;
      break;
    case 'h1440':
      resolution = VideoPresets.h1440.resolution;
      break;
    case 'h2160':
      resolution = VideoPresets.h2160.resolution;
      break;
  }

  return resolution;
};

export const getScreenShareResolution = () => {
  const selected = DEFAULT_SCREEN_SHARE_RESOLUTION;
  let resolution = ScreenSharePresets.h1080fps15.resolution;

  switch (selected) {
    case 'h360fps3':
      resolution = ScreenSharePresets.h360fps3.resolution;
      break;
    case 'h720fps5':
      resolution = ScreenSharePresets.h720fps5.resolution;
      break;
    case 'h720fps15':
      resolution = ScreenSharePresets.h720fps15.resolution;
      break;
    case 'h1080fps15':
      resolution = ScreenSharePresets.h1080fps15.resolution;
      break;
    case 'h1080fps30':
      resolution = ScreenSharePresets.h1080fps30.resolution;
      break;
  }

  return resolution;
};

export const getAudioPreset = () => {
  const selected = DEFAULT_AUDIO_PRESET;
  let preset = AudioPresets.music;

  switch (selected) {
    case 'telephone':
      preset = AudioPresets.telephone;
      break;
    case 'speech':
      preset = AudioPresets.speech;
      break;
    case 'music':
      preset = AudioPresets.music;
      break;
    case 'musicStereo':
      preset = AudioPresets.musicStereo;
      break;
    case 'musicHighQuality':
      preset = AudioPresets.musicHighQuality;
      break;
    case 'musicHighQualityStereo':
      preset = AudioPresets.musicHighQualityStereo;
      break;
  }

  return preset;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
};

/**
 * getAccessToken will try to get token by the following:
 * from `access_token` GET/Search parameter from URL OR
 * from cookie name `wajlc_access_token`
 * */
export const getAccessToken = () => {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const accessToken = urlSearchParams.get('access_token');
  if (accessToken) {
    return accessToken;
  }

  // now let's check from cookies
  const tokenCookieName = 'wajlc_access_token';
  return getCookie(tokenCookieName);
};

export const formatNatsError = (err: any) => {
  let msg = 'Yêu cầu thất bại';

  if (err instanceof errors.NoRespondersError) {
    msg = `Không có phản hồi: ${err.name}: ${err.message}`;
  } else if (err instanceof errors.TimeoutError) {
    msg = `Hết thời gian chờ: ${err.name}: ${err.message}`;
  } else if (err instanceof Error) {
    msg = err.name + ': ' + msg;
    if (err.message !== '') {
      msg = err.name + ': ' + err.message;
    }
  }

  return msg;
};

/**
 * getWhiteboardDonors returns the presenter.
 */
export const getWhiteboardDonors = (): IParticipant[] => {
  const s = store.getState();
  return participantsSelector
    .selectAll(s)
    .filter(
      (participant) =>
        participant.userId !== s.session.currentUser?.userId &&
        participant.metadata.isPresenter,
    );
};

/**
 * getChatDonors returns the two participants who joined the session earliest.
 */
export const getChatDonors = (): IParticipant[] => {
  const s = store.getState();
  const allParticipants = participantsSelector.selectAll(s);

  // Sort participants by their joinedAt timestamp in ascending order (earliest first).
  allParticipants.sort((a, b) => a.joinedAt - b.joinedAt);

  // Return the first two participants.
  return allParticipants.slice(0, 2);
};

let emptyStreamTrack: MediaStreamTrack | undefined = undefined;
export function createEmptyVideoStreamTrack(name: string) {
  // Reuse the track only if it exists and is still live.
  if (emptyStreamTrack && emptyStreamTrack.readyState === 'live') {
    return emptyStreamTrack;
  }

  const canvas = document.createElement('canvas');
  canvas.width = VideoPresets.h720.resolution.width;
  canvas.height = VideoPresets.h720.resolution.height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Set a black background for high contrast.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const textString = generateAvatarInitial(name);

    // Style the text for clarity.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 120px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(textString, canvas.width / 2, canvas.height / 2);
  }

  const canvasStream = canvas.captureStream();
  [emptyStreamTrack] = canvasStream.getVideoTracks();
  if (!emptyStreamTrack) {
    throw Error('Could not get empty media stream video track');
  }

  return emptyStreamTrack;
}

export const generateAvatarInitial = (name: string) => {
  const trimmedName = name.trim();

  // Check if the name contains any digits, which may indicate a phone number.
  if (/\d/.test(trimmedName)) {
    const firstChar = trimmedName[0] || '';
    const lastChar =
      trimmedName.length > 1 ? trimmedName[trimmedName.length - 1] : '';
    return `${firstChar}${lastChar}`.toLocaleUpperCase();
  }

  // Fallback to the original logic for regular names.
  const nameParts = trimmedName.split(/\s+/);
  const firstNameInitial = nameParts[0]?.[0] || '';
  let lastNameInitial = '';

  if (nameParts.length > 1) {
    lastNameInitial = nameParts[nameParts.length - 1]?.[0] || '';
  } else if (nameParts[0]?.length > 1) {
    // If it's a single word, use the first and last characters.
    lastNameInitial = nameParts[0].slice(-1);
  }

  return `${firstNameInitial}${lastNameInitial}`.toLocaleUpperCase();
};

export const isUserRecorder = (userId: string) => {
  return userId === 'RECORDER_BOT' || userId === 'RTMP_BOT';
};

export const isValidHttpUrl = (url: string) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (e) {
    console.info('Invalid logout URL:', e);
  }

  return false;
};

// for special case SIP
// our: sip_phoneNumber
// LK: sip_+phoneNumber
export const toWajlcUserId = (userId: string) => {
  if (userId.startsWith('sip_')) {
    return userId.replace('+', '');
  }
  return userId;
};

export const toLiveKitUserId = (userId: string) => {
  return userId;
};