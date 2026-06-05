import React, { useCallback, useMemo } from 'react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  SwitchPresenterReqSchema,
  SwitchPresenterTask,
} from '@workspace/protocol';
import { debounce } from 'es-toolkit';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { ChevronLeft, ChevronRight, Presentation, Eye } from 'lucide-react';import { Button } from '@workspace/ui/components/button';
import { NativeSelect, NativeSelectOption } from '@workspace/ui/components/native-select';
import { store, useAppDispatch, useAppSelector } from '@/store';
import { setWhiteboardCurrentPage } from '@/store/slices/whiteboard';
import { broadcastCurrentPageNumber } from '@/components/whiteboard/helpers/handle-requests';
import sendAPIRequest from '@/helpers/api/api-client';
import { savePageData } from '@/components/whiteboard/helpers/utils';
import { sleep } from '@/helpers/utils';

interface IFooterUIProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isPresenter: boolean;
  isFollowing?: boolean;
  setIsFollowing?: (value: boolean) => void;
  showSwitchingWarning: () => boolean;
}

const FooterUI = ({
  excalidrawAPI,
  isPresenter,
  isFollowing,
  setIsFollowing,
  showSwitchingWarning,
}: IFooterUIProps) => {
  const totalPages = useAppSelector((state) => state.whiteboard.totalPages);
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);

  const dispatch = useAppDispatch();

  const { currentUser, isAdmin, isRecorder } = useMemo(() => {
    const currentUser = store.getState().session.currentUser;
    return {
      currentUser,
      isAdmin: currentUser?.metadata?.isAdmin,
      isRecorder: currentUser?.isRecorder,
    };
  }, []);

  const debouncedSetCurrentPage = useMemo(
    () =>
      debounce(async (newPage: number, pageToSave: number) => {
        // First, save the state of the page we are leaving.
        if (isPresenter && excalidrawAPI) {
          await savePageData(
            excalidrawAPI.getSceneElementsIncludingDeleted(),
            pageToSave,
          );
        }
        // broadcast first so that user can prepare for page change
        await broadcastCurrentPageNumber(newPage);
        await sleep(300);
        // Then, proceed with changing the page.
        dispatch(setWhiteboardCurrentPage(newPage));
      }, 300),
    [dispatch, isPresenter, excalidrawAPI],
  );

  const setCurrentPage = (page: number) => {
    if (showSwitchingWarning()) return;
    debouncedSetCurrentPage(page, currentPage);
  };

  const handlePre = () => {
    if (showSwitchingWarning()) return;
    setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (showSwitchingWarning()) return;
    setCurrentPage(currentPage + 1);
  };

  const handleFollowPresenter = () => {
    if (setIsFollowing) {
      setIsFollowing(!isFollowing);
    }
  };

  const takeOverPresenter = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    const body = create(SwitchPresenterReqSchema, {
      userId: currentUser.userId,
      task: SwitchPresenterTask.PROMOTE,
    });

    const r = await sendAPIRequest(
      'switchPresenter',
      toBinary(SwitchPresenterReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast('Người trình bày đã thay đổi', {
        toastId: 'presenter-change-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        toastId: 'presenter-change-status',
        type: 'error',
      });
    }
  }, [currentUser]);

  const renderForAdmin = () => {
    return (
      <div className="flex wb-page-navigation ml-2 bg-muted rounded-lg overflow-hidden border border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handlePre}
          disabled={currentPage <= 1}
          className="rounded-none"
        >
          <ChevronLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
        </Button>
        <NativeSelect
          id="pages"
          name="pages"
          onChange={(e) => setCurrentPage(Number(e.currentTarget.value))}
          value={currentPage}
          className="min-w-[100px] border-x border-border rounded-none"
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <NativeSelectOption key={i} value={i + 1}>
              Trang {i + 1}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="rounded-none"
        >
          <ChevronRight className="w-5 h-5 text-foreground rtl:rotate-180" />
        </Button>
      </div>
    );
  };

  const renderForParticipant = () => {
    return (
      <div
        className={`renderForParticipant flex gap-2 text-sm items-center justify-start md:justify-center relative ${isAdmin && !isRecorder
          ? 'ltr:pl-3 rtl:pr-3 md:pl-12  md:rtl:pr-4'
          : 'ltr:pl-3 rtl:pr-3'
          } `}
      >
        {isAdmin && !isRecorder && (
          <Button variant="ghost" size="icon-sm" onClick={takeOverPresenter}>
            <Presentation className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={isFollowing ? 'following' : ''}
          onClick={handleFollowPresenter}
          title={
            isFollowing
              ? 'Ngừng theo dõi người trình bày'
              : 'Theo dõi người trình bày'
          }
        >
          <Eye
            className={`w-3.5 h-3.5 ltr:mr-1 rtl:ml-1 ${isFollowing ? 'animate-pulse text-primary' : ''
              }`}
          />
          {isFollowing ? 'Ngừng theo dõi' : 'Theo dõi'}
        </Button>
        Trang {currentPage}
      </div>
    );
  };

  return isPresenter ? renderForAdmin() : renderForParticipant();
};

export default FooterUI;
