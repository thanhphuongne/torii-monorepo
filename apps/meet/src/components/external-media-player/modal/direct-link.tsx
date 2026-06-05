import React, { useCallback, useEffect, useState } from 'react';
import { isArray } from 'es-toolkit/compat';
import ReactPlayer from 'react-player';
import { PlusCircle, File, Trash2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

import FormattedInputField from '@/helpers/ui/formatted-input-field';
import { DB_STORE_NAMES, idbGet, idbStore } from '@/helpers/libs/idb';

interface DirectLinkProps {
  selectedUrl: string;
  setSelectedUrl: React.Dispatch<React.SetStateAction<string>>;
}
const EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS = 'externalMediaPlayerPlaybackUrls';

const DirectLink = ({ selectedUrl, setSelectedUrl }: DirectLinkProps) => {
  const [playbackUrls, setPlaybackUrls] = useState<string[]>([]);

  const [playBackUrl, setPlayBackUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  useEffect(() => {
    idbGet<string[]>(
      DB_STORE_NAMES.USER_SETTINGS,
      EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
    ).then((urls) => {
      if (urls && isArray(urls)) {
        setPlaybackUrls(urls);
      }
    });
  }, []);

  const addPlaybackUrl = useCallback(async () => {
    if (!playBackUrl) {
      setErrorMsg('URL trình phát đa phương tiện là bắt buộc');
      return;
    }
    if (!ReactPlayer.canPlay?.(playBackUrl)) {
      setErrorMsg('URL trình phát đa phương tiện không hợp lệ');
      return;
    }
    setErrorMsg(undefined);

    setPlaybackUrls((prevUrls) => {
      const newUrls = new Set([playBackUrl, ...prevUrls]);
      const arr = Array.from(newUrls);
      idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
        arr,
      ).then();
      return arr;
    });
    setPlayBackUrl('');
    setSelectedUrl(playBackUrl);
  }, [playBackUrl, setSelectedUrl]);

  const deletePlaybackUrl = useCallback(
    async (urlToDelete: string) => {
      const newUrls = playbackUrls.filter((url) => url !== urlToDelete);
      setPlaybackUrls(newUrls);
      await idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_MEDIA_PLAYER_PLAYBACK_URLS,
        newUrls,
      );

      if (selectedUrl === urlToDelete) {
        setSelectedUrl('');
      }
    },
    [playbackUrls, selectedUrl, setSelectedUrl],
  );

  return (
    <>
      <div className="flex items-start gap-2 min-h-10">
        <div className="flex-auto">
          <FormattedInputField
            id="stream-key"
            placeholder="Nhập URL trình phát đa phương tiện"
            value={playBackUrl}
            onChange={(e) => setPlayBackUrl(e.currentTarget.value)}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          onClick={addPlaybackUrl}
          className="rounded-full shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      {errorMsg && (
        <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
      )}
      {playbackUrls.length > 0 && (
        <div className="mt-8 grid min-w-0 gap-2 overflow-hidden">
          <div className="max-h-50 min-w-0 overflow-y-auto scrollBar grid gap-2">
          {playbackUrls.map((url, i) => {
            let classNames =
              'flex min-w-0 items-center gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200 overflow-hidden';
            if (selectedUrl === url) {
              classNames += ' border-2 border-primary bg-primary/10';
            } else {
              classNames += ' border border-border bg-card hover:bg-muted';
            }

            return (
              <div
                key={`url-${i}`}
                className={classNames}
                onClick={() => setSelectedUrl(url)}
              >
                <div className="icon relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-border text-Blue2-800">
                  <File className="w-4 h-4" />
                </div>
                <div className="text min-w-0 flex-1 overflow-hidden text-sm text-foreground">
                  <p className="truncate leading-snug">{url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full hover:bg-red-100 text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlaybackUrl(url).then();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </>
  );
};

export default DirectLink;
