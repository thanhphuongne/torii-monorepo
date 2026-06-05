import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import { store, useAppDispatch, useAppSelector } from '@/store';
import { toggleStartup } from '@/store/slices/session-slice';
import {
  addAudioDevices,
  addVideoDevices,
  updateSelectedAudioDevice,
  updateSelectedVideoDevice,
} from '@/store/slices/roomSettingsSlice';
import {
  Volume2,
  MicOff,
  VideoOff,
  Loader2,
  Lock as LockIcon,
  ChevronDown,
  Mic,
  Video,
  Check,
} from 'lucide-react';
import { roomConnectionStatus } from '@/components/app/helper';
import { getNatsConn } from '@/helpers/nats';
import { useMediaDevices } from '@/components/landing/hooks/use-media-devices';

import WebcamPreview from '@/components/landing/webcam-preview';
import { Button } from '@workspace/ui/components/button';

const pillBtn =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-left text-xs font-medium text-foreground shadow-sm transition hover:bg-muted sm:text-sm';

const pillStatic =
  'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground shadow-sm sm:text-sm';

const previewPrimaryBtn =
  'rounded-full px-6 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90';

interface StartupJoinModalProps {
  setIsAppReady: Dispatch<boolean>;
  roomConnectionStatus: roomConnectionStatus;
}

const Landing = ({
  setIsAppReady,
  roomConnectionStatus,
}: StartupJoinModalProps) => {
  const dispatch = useAppDispatch();
  const { isWebcamAllowed } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;

    let show = true;
    if (!roomFeatures?.allowWebcams) {
      show = false;
    } else if (roomFeatures?.adminOnlyWebcams && !isAdmin) {
      show = false;
    }

    return {
      isWebcamAllowed: show,
    };
  }, []);

  const isStartup = useAppSelector((state) => state.session.isStartup);
  const displayName = useAppSelector(
    (state) => state.session.currentUser?.name ?? 'Bạn',
  );
  const waitForApproval = useAppSelector(
    (state) => state.session.currentUser?.metadata?.waitForApproval,
  );
  const waitingRoomMessage = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.waitingRoomFeatures
        ?.waitingRoomMsg,
  );
  const lockMicrophone = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const lockWebcam = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );

  const {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    enableMediaDevices,
    disableWebcam,
    disableMic,
  } = useMediaDevices();

  const [showLoadingMsg, setShowLoadingMsg] = useState<string | undefined>(
    undefined,
  );
  const [isReadyToConn, setIsReadyToConn] = useState<boolean | undefined>(
    undefined,
  );
  const [otherWaysOpen, setOtherWaysOpen] = useState(false);

  useEffect(() => {
    switch (roomConnectionStatus) {
      case 'media-server-conn-start':
        setShowLoadingMsg('Đang kết nối tới máy chủ truyền thông...');
        break;
      case 'media-server-conn-established':
        dispatch(toggleStartup(false));
        setIsAppReady(true);
        setShowLoadingMsg(undefined);
        break;
    }
  }, [roomConnectionStatus, dispatch, setIsAppReady]);

  useEffect(() => {
    if (waitForApproval) {
      if (typeof isReadyToConn !== 'undefined') {
        setShowLoadingMsg('Đang chờ phê duyệt...');
      }
    } else {
      if (isReadyToConn) {
        const conn = getNatsConn();
        if (conn) {
          setShowLoadingMsg('Đang hoàn tất cài đặt...');
          conn.finalizeAppConn();
        }
      }
    }
  }, [waitForApproval, isReadyToConn]);

  const openConn = useCallback(() => {
    if (selectedVideoDevice !== '') {
      dispatch(updateSelectedVideoDevice(selectedVideoDevice));
      dispatch(addVideoDevices(videoDevices));
    }
    if (selectedAudioDevice !== '') {
      dispatch(updateSelectedAudioDevice(selectedAudioDevice));
      dispatch(addAudioDevices(audioDevices));
    }

    setIsReadyToConn(true);
  }, [
    selectedAudioDevice,
    selectedVideoDevice,
    dispatch,
    videoDevices,
    audioDevices,
  ]);

  const getJoinPrompt = useCallback(() => {
    if (lockMicrophone && (lockWebcam || !isWebcamAllowed)) {
      return 'Cả micrô và máy ảnh của bạn đều bị khóa. Bạn có thể tham gia với tư cách là người nghe.';
    } else if (lockMicrophone) {
      return 'Micrô của bạn đã bị khóa. Bạn có thể tham gia với tư cách là người nghe hoặc bật máy ảnh.';
    } else if (lockWebcam || !isWebcamAllowed) {
      return 'Máy ảnh của bạn đã bị khóa. Bạn có thể tham gia với tư cách là người nghe hoặc bật micrô.';
    }
    return 'Vui lòng chọn thiết bị của bạn trước khi tham gia.';
  }, [lockMicrophone, lockWebcam, isWebcamAllowed]);

  const getEnableDeviceButton = useCallback(() => {
    if (lockMicrophone) {
      return {
        text: 'Cho phép sử dụng máy ảnh',
        action: () => enableMediaDevices('video'),
      };
    } else if (lockWebcam || !isWebcamAllowed) {
      return {
        text: 'Cho phép sử dụng micrô',
        action: () => enableMediaDevices('audio'),
      };
    }
    return {
      text: 'Cho phép sử dụng micrô và máy ảnh',
      action: () => enableMediaDevices('both'),
    };
  }, [lockMicrophone, lockWebcam, isWebcamAllowed, enableMediaDevices]);

  const micPillLabel = useMemo(() => {
    if (lockMicrophone) return 'Micrô bị khóa';
    if (audioDevices.length === 0) return 'Cần có quyền';
    const d = audioDevices.find((x) => x.id === selectedAudioDevice);
    return d?.label?.trim() || 'Micrô';
  }, [lockMicrophone, audioDevices, selectedAudioDevice]);

  const camPillLabel = useMemo(() => {
    if (lockWebcam || !isWebcamAllowed) return 'Máy ảnh bị khóa';
    if (videoDevices.length === 0) return 'Cần có quyền';
    const d = videoDevices.find((x) => x.id === selectedVideoDevice);
    return d?.label?.trim() || 'Máy ảnh';
  }, [lockWebcam, isWebcamAllowed, videoDevices, selectedVideoDevice]);

  const hasMediaReady =
    selectedAudioDevice !== '' || selectedVideoDevice !== '';
  const bothLockedListenOnly =
    lockMicrophone && (lockWebcam || !isWebcamAllowed);

  const permissionBlock = useMemo(() => {
    const textPreview =
      'mb-3 max-w-md text-sm text-[var(--landing-preview-fg)] opacity-90';
    if (lockWebcam || !isWebcamAllowed) {
      return (
        <p className={textPreview}>
          Máy ảnh không khả dụng (bị khóa hoặc bị tắt bởi người tổ chức). Bạn
          vẫn có thể dùng micrô nếu được phép.
        </p>
      );
    }
    return (
      <p className={textPreview}>
        Bạn có muốn người khác nhìn thấy và nghe thấy bạn trong cuộc họp không?
      </p>
    );
  }, [lockWebcam, isWebcamAllowed]);

  return (
    isStartup && (
      <div
        id="startupJoinModal"
        className="join-the-audio-popup absolute flex min-h-full w-full flex-col items-center justify-center overflow-y-auto bg-background scrollBar"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-6 sm:px-5 sm:py-8 lg:flex-row lg:gap-8 lg:px-6">
          <div className="flex w-full min-w-0 flex-[1.15] flex-col lg:max-w-[58%]">
            <div className="relative flex min-h-[min(320px,58vh)] flex-col overflow-hidden rounded-2xl bg-[var(--landing-preview-bg)] shadow-md ring-1 ring-[var(--landing-preview-ring)] sm:min-h-[min(360px,60vh)]">
              <div className="relative flex min-h-0 flex-1 flex-col">
                {selectedVideoDevice !== '' ? (
                  <WebcamPreview
                    selectedVideoDevice={selectedVideoDevice}
                    className="min-h-[200px]"
                  />
                ) : (
                  <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center px-5 pb-20 text-center sm:min-h-[220px] sm:pb-24">
                    {permissionBlock}
                    {!bothLockedListenOnly &&
                      !(lockWebcam || !isWebcamAllowed) && (
                        <Button
                          type="button"
                          disabled={isReadyToConn === true}
                          className={previewPrimaryBtn}
                          onClick={getEnableDeviceButton().action}
                        >
                          {getEnableDeviceButton().text}
                        </Button>
                      )}
                    {(lockWebcam || !isWebcamAllowed) && !lockMicrophone && (
                      <Button
                        type="button"
                        disabled={isReadyToConn === true}
                        className={`mt-3 ${previewPrimaryBtn}`}
                        onClick={() => enableMediaDevices('audio')}
                      >
                        Cho phép sử dụng micrô
                      </Button>
                    )}
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
                  <div className="pointer-events-auto flex items-center gap-2.5">
                    {lockMicrophone ? (
                      <div className="relative flex size-12 items-center justify-center rounded-full bg-[var(--landing-preview-control-bg)] text-destructive shadow-md ring-1 ring-[var(--landing-preview-ring)]">
                        <MicOff className="size-5" />
                        <LockIcon className="absolute -right-0.5 -top-0.5 size-3 text-destructive" />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--landing-preview-control-bg)] shadow-md ring-1 ring-[var(--landing-preview-ring)]">
                          <button
                            type="button"
                            className="flex size-full items-center justify-center rounded-full text-[var(--landing-preview-control-fg)]"
                            onClick={() =>
                              audioDevices.length === 0
                                ? enableMediaDevices('audio')
                                : disableMic()
                            }
                            aria-label="Micrô"
                          >
                            <Mic className="size-5" />
                          </button>
                        </div>
                        {audioDevices.length === 0 && (
                          <span
                            className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-amber-950 shadow"
                            title="Cần quyền truy cập micrô"
                          >
                            !
                          </span>
                        )}
                      </div>
                    )}

                    {lockWebcam || !isWebcamAllowed ? (
                      <div className="relative flex size-12 items-center justify-center rounded-full bg-[var(--landing-preview-control-bg)] text-destructive shadow-md ring-1 ring-[var(--landing-preview-ring)]">
                        <VideoOff className="size-5" />
                        <LockIcon className="absolute -right-0.5 -top-0.5 size-3 text-destructive" />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--landing-preview-control-bg)] shadow-md ring-1 ring-[var(--landing-preview-ring)]">
                          <button
                            type="button"
                            className="flex size-full items-center justify-center rounded-full text-[var(--landing-preview-control-fg)]"
                            onClick={() =>
                              videoDevices.length === 0
                                ? enableMediaDevices('video')
                                : disableWebcam()
                            }
                            aria-label="Máy ảnh"
                          >
                            <Video className="size-5" />
                          </button>
                        </div>
                        {videoDevices.length === 0 && (
                          <span
                            className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-amber-950 shadow"
                            title="Cần quyền truy cập máy ảnh"
                          >
                            !
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              {lockMicrophone ? (
                <span className={pillStatic}>
                  <Mic className="size-4 text-muted-foreground" />
                  <span className="truncate">Micrô bị khóa</span>
                </span>
              ) : audioDevices.length === 0 ? (
                <button
                  type="button"
                  className={pillBtn}
                  onClick={() => enableMediaDevices('audio')}
                >
                  <Mic className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{micPillLabel}</span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                </button>
              ) : (
                <Menu as="div" className="relative inline-block text-left">
                  {({ open }) => (
                    <>
                      <MenuButton className={pillBtn}>
                        <Mic className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{micPillLabel}</span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      </MenuButton>
                      <Transition
                        as="div"
                        show={open}
                        enter="transition duration-100 ease-out"
                        enterFrom="transform scale-95 opacity-0"
                        enterTo="transform scale-100 opacity-100"
                        leave="transition duration-75 ease-out"
                        leaveFrom="transform scale-100 opacity-100"
                        leaveTo="transform scale-95 opacity-0"
                      >
                        <MenuItems
                          static
                          className="absolute bottom-full left-0 z-40 mb-2 min-w-[220px] rounded-xl border border-border bg-popover p-2 shadow-lg ring-0 focus:outline-hidden"
                        >
                          <div className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">
                            Chọn micrô
                          </div>
                          {audioDevices.map((device, i) => (
                            <MenuItem key={`${device.id}-${i}`}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
                                onClick={() => setSelectedAudioDevice(device.id)}
                              >
                                <span className="min-w-0 truncate">
                                  {device.label}
                                </span>
                                {selectedAudioDevice === device.id ? (
                                  <Check className="size-4 shrink-0 text-primary" />
                                ) : null}
                              </button>
                            </MenuItem>
                          ))}
                        </MenuItems>
                      </Transition>
                    </>
                  )}
                </Menu>
              )}

              <span className={pillStatic}>
                <Volume2 className="size-4 text-muted-foreground" />
                <span className="truncate">Loa (mặc định hệ thống)</span>
              </span>

              {lockWebcam || !isWebcamAllowed ? (
                <span className={pillStatic}>
                  <Video className="size-4 text-muted-foreground" />
                  <span className="truncate">Máy ảnh bị khóa</span>
                </span>
              ) : videoDevices.length === 0 ? (
                <button
                  type="button"
                  className={pillBtn}
                  onClick={() => enableMediaDevices('video')}
                >
                  <Video className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{camPillLabel}</span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                </button>
              ) : (
                <Menu as="div" className="relative inline-block text-left">
                  {({ open }) => (
                    <>
                      <MenuButton className={pillBtn}>
                        <Video className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{camPillLabel}</span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      </MenuButton>
                      <Transition
                        as="div"
                        show={open}
                        enter="transition duration-100 ease-out"
                        enterFrom="transform scale-95 opacity-0"
                        enterTo="transform scale-100 opacity-100"
                        leave="transition duration-75 ease-out"
                        leaveFrom="transform scale-100 opacity-100"
                        leaveTo="transform scale-95 opacity-0"
                      >
                        <MenuItems
                          static
                          className="absolute bottom-full left-0 z-40 mb-2 min-w-[220px] rounded-xl border border-border bg-popover p-2 shadow-lg ring-0 focus:outline-hidden"
                        >
                          <div className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">
                            Chọn máy ảnh
                          </div>
                          {videoDevices.map((device, i) => (
                            <MenuItem key={`${device.id}-${i}`}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
                                onClick={() => setSelectedVideoDevice(device.id)}
                              >
                                <span className="min-w-0 truncate">
                                  {device.label}
                                </span>
                                {selectedVideoDevice === device.id ? (
                                  <Check className="size-4 shrink-0 text-primary" />
                                ) : null}
                              </button>
                            </MenuItem>
                          ))}
                        </MenuItems>
                      </Transition>
                    </>
                  )}
                </Menu>
              )}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col justify-center text-center lg:max-w-sm lg:text-left">
            {showLoadingMsg ? (
              <div className="w-full">
                {waitForApproval ? (
                  <div className="text-center lg:text-left">
                    <h3 className="flex items-center justify-center gap-2 pb-2 text-lg font-semibold text-foreground lg:justify-start lg:text-xl">
                      <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
                      Đang chờ phê duyệt...
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {waitingRoomMessage ||
                        'Vui lòng đợi người tổ chức cho phép bạn tham gia.'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center lg:text-left">
                    <h3 className="flex items-center justify-center gap-2 pb-2 text-lg font-semibold text-foreground lg:justify-start lg:text-xl">
                      <Loader2 className="size-7 shrink-0 animate-spin text-muted-foreground" />
                      {showLoadingMsg}
                    </h3>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full">
                <h2 className="text-xl font-normal text-foreground sm:text-2xl">
                  Sẵn sàng tham gia?
                </h2>
                <p className="mt-3 text-sm leading-snug text-foreground">
                  <span className="font-medium text-foreground">
                    {displayName}
                  </span>{' '}
                  đang tham gia cuộc gọi này
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {getJoinPrompt()}
                </p>

                <div className="mt-6 flex w-full flex-col gap-2.5">
                  {bothLockedListenOnly ? (
                    <Button
                      id="listenOnlyJoin"
                      disabled={isReadyToConn === true}
                      variant="outline"
                      className="h-11 w-full rounded-full border-border text-primary hover:bg-muted"
                      onClick={() => openConn()}
                    >
                      Tham gia chỉ nghe
                      <Volume2 className="size-4" />
                    </Button>
                  ) : hasMediaReady ? (
                    <Button
                      disabled={isReadyToConn === true}
                      className="h-11 w-full rounded-full text-base font-medium"
                      onClick={() => openConn()}
                    >
                      Chuyển qua thiết bị này
                    </Button>
                  ) : (
                    <>
                      <Button
                        disabled={isReadyToConn === true}
                        className="h-11 w-full rounded-full text-base font-medium"
                        onClick={getEnableDeviceButton().action}
                      >
                        {getEnableDeviceButton().text}
                      </Button>
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-1 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-primary transition hover:bg-muted"
                        onClick={() => setOtherWaysOpen((o) => !o)}
                        aria-expanded={otherWaysOpen}
                      >
                        Những cách tham gia khác
                        <ChevronDown
                          className={`size-4 transition ${otherWaysOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {otherWaysOpen && (
                        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
                          <Button
                            id="listenOnlyJoin"
                            disabled={isReadyToConn === true}
                            variant="ghost"
                            className="h-11 w-full justify-start rounded-xl text-foreground"
                            onClick={() => openConn()}
                          >
                            Tham gia chỉ nghe
                            <Volume2 className="ml-auto size-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default Landing;
