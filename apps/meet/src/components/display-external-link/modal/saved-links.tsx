import React, { useCallback, useEffect, useState } from 'react';
import { isArray } from 'es-toolkit/compat';

import FormattedInputField from '@/helpers/ui/formatted-input-field';
import { DB_STORE_NAMES, idbGet, idbStore } from '@/helpers/libs/idb';
import { PlusCircle } from 'lucide-react';
import SavedLinkItem from '@/components/display-external-link/modal/saved-link-item';
import { Button } from '@workspace/ui/components/button';

const EXTERNAL_DISPLAY_LINK_URLS = 'externalDisplayLinkUrls';

interface ISavedLinksProps {
  link: string;
  setLink: React.Dispatch<React.SetStateAction<string>>;
}

const SavedLinks = ({ link, setLink }: ISavedLinksProps) => {
  const [savedLinks, setSavedLinks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [newUrlLink, setNewUrlLink] = useState<string>('');

  useEffect(() => {
    idbGet<string[]>(
      DB_STORE_NAMES.USER_SETTINGS,
      EXTERNAL_DISPLAY_LINK_URLS,
    ).then((urls) => {
      if (urls && isArray(urls)) {
        setSavedLinks(urls);
      }
    });
  }, []);

  const addLink = useCallback(async () => {
    if (!newUrlLink) {
      setErrorMsg('Liên kết là bắt buộc');
      return;
    }
    try {
      // oxlint-disable-next-line no-new
      new URL(newUrlLink);
    } catch (e) {
      console.error(e);
      setErrorMsg('Liên kết không hợp lệ');
      return;
    }
    setErrorMsg(undefined);

    setSavedLinks((prevUrls) => {
      const newUrls = new Set([newUrlLink, ...prevUrls]);
      const arr = Array.from(newUrls);
      idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_DISPLAY_LINK_URLS,
        arr,
      ).then();
      return arr;
    });
    setLink(newUrlLink);
    setNewUrlLink('');
  }, [setLink, newUrlLink]);

  const deleteLink = useCallback(
    async (urlToDelete: string) => {
      const newUrls = savedLinks.filter((url) => url !== urlToDelete);
      setSavedLinks(newUrls);
      await idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_DISPLAY_LINK_URLS,
        newUrls,
      );

      if (link === urlToDelete) {
        setLink('');
      }
    },
    [savedLinks, link, setLink],
  );

  const onLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (errorMsg) {
      setErrorMsg(undefined);
    }
    setNewUrlLink(e.currentTarget.value);
  };

  return (
    <>
      <div className="flex items-start gap-2 min-h-10">
        <div className="flex-auto">
          <FormattedInputField
            id="link"
            placeholder="Nhập liên kết"
            value={newUrlLink}
            onChange={onLinkChange}
          />
          <div className="text-xs py-2 text-muted-foreground">
            Lưu ý: Chỉ hỗ trợ các liên kết an toàn (https)
          </div>
        </div>
        <Button
          className="h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-all duration-300 shrink-0 cursor-pointer shadow-sm"
          type="button"
          onClick={addLink}
          variant="outline"
          size="icon"
        >
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      {errorMsg && (
        <div className="error-msg text-xs text-destructive py-1">{errorMsg}</div>
      )}

      {savedLinks.length > 0 && (
        <div className="max-h-40 overflow-y-auto scrollBar grid gap-2 mt-4">
          {savedLinks.map((url, i) => (
            <SavedLinkItem
              key={`url-${i}`}
              url={url}
              selectedUrl={link}
              onSelect={setLink}
              onDelete={deleteLink}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default SavedLinks;
