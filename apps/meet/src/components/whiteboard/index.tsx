import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { debounce, throttle } from 'es-toolkit';
import {
  CaptureUpdateAction,
  Excalidraw,
  Footer,
  hashElementsVersion,
  MainMenu,
  reconcileElements,
} from '@excalidraw/excalidraw';
import {
  AppState,
  BinaryFiles,
  Collaborator,
  CollaboratorPointer,
  ExcalidrawImperativeAPI,
  ExcalidrawProps,
  Gesture,
} from '@excalidraw/excalidraw/types';
import { toast } from 'react-toastify';
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';
import { Paperclip } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

import '@excalidraw/excalidraw/index.css';
import '@/components/whiteboard/style.css';

import ManageOfficeFilesModal from '@/components/whiteboard/manage-office-files';
import FooterUI from '@/components/whiteboard/footer-UI';

import { store, useAppDispatch, useAppSelector } from '@/store';
import {
  broadcastAppStateChanges,
  broadcastCurrentFileId,
  broadcastMousePointerUpdate,
  broadcastSceneOnChange,
  sendClearWhiteboardSignal,
} from '@/components/whiteboard/helpers/handle-requests';
import usePrevious from '@/components/whiteboard/helpers/hooks/use-previous';
import useWhiteboardSetup from '@/components/whiteboard/helpers/hooks/use-whiteboard-setup';
import useWhiteboardDataSharer from '@/components/whiteboard/helpers/hooks/use-whiteboard-data-sharer';
import useWhiteboardAppStateSync from '@/components/whiteboard/helpers/hooks/use-whiteboard-app-state-sync';
import useOfficePageSyncer from '@/components/whiteboard/helpers/hooks/use-office-page-syncer';
import {
  addAllExcalidrawElements,
  updateExcalidrawElements,
  updateMousePointerLocation,
} from '@/store/slices/whiteboard';
import {
  displaySavedPageData,
  ensureAllImagesDataIsLoaded,
  savePageData,
} from '@/components/whiteboard/helpers/utils';
import { sleep } from '@/helpers/utils';
import { cleanProcessedImageElementsMap } from '@/components/whiteboard/helpers/handle-files';

interface WhiteboardProps {
  onReadyExcalidrawAPI: (excalidrawAPI: ExcalidrawImperativeAPI) => void;
}

const CURSOR_SYNC_TIMEOUT = 33,
  SAVE_TO_STORAGE_DEBOUNCE_TIMEOUT = 1000;

const Whiteboard = ({ onReadyExcalidrawAPI }: WhiteboardProps) => {
  const dispatch = useAppDispatch();
  // static variables
  const { currentUser, isRecorder, roomId } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      currentUser,
      isRecorder: !!currentUser?.isRecorder,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  // Selectors
  const isPresenter = useAppSelector(
    (state) => state.session.currentUser?.metadata?.isPresenter,
  );
  const defaultRoomLock = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.defaultLockSettings?.lockWhiteboard,
  );
  const currentUserLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockWhiteboard,
  );

  const theme = useAppSelector((state) => state.roomSettings.theme);
  const screenWidth = useAppSelector(
    (state) => state.bottomIconsActivity.screenWidth,
  );
  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );
  const allExcalidrawElements = useAppSelector(
    (state) => state.whiteboard.allExcalidrawElements,
  );
  const excalidrawElements = useAppSelector(
    (state) => state.whiteboard.excalidrawElements,
  );
  const whiteboardResetSignal = useAppSelector(
    (state) => state.whiteboard.whiteboardResetSignal,
  );

  // State and Refs
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isOpenManageFilesUI, setIsOpenManageFilesUI] =
    useState<boolean>(false);

  const previousFileId = usePrevious(currentWhiteboardOfficeFileId);
  const previousPage = usePrevious(currentPage);

  const isProgrammaticScroll = useRef(false);
  const isSwitching = useRef(false);
  const lastBroadcastOrReceivedSceneVersion = useRef<number>(-1);

  // Determines if the current user has editing privileges.
  const canEdit = useMemo(() => {
    if (isPresenter) return true;
    // Recorders should not be able to edit.
    if (isRecorder) return false;
    if (typeof currentUserLock === 'boolean') return !currentUserLock;
    return !(defaultRoomLock ?? true);
  }, [isPresenter, currentUserLock, defaultRoomLock, isRecorder]);

  // Custom Hooks for modularity
  const { viewModeEnabled } = useWhiteboardSetup({
    excalidrawAPI,
    canEdit,
  });
  const { fetchedData, setFetchedData, fetchDataFromDonner } =
    useWhiteboardDataSharer({
      excalidrawAPI,
    });
  useWhiteboardAppStateSync({
    excalidrawAPI,
    isFollowing,
    isProgrammaticScroll,
  });
  const { syncOfficeFilePage } = useOfficePageSyncer({
    excalidrawAPI,
    isPresenter,
    currentPage,
  });

  /**
   * Reconciles remote scene elements with local ones and updates the canvas.
   * @param remoteElements The JSON string of the remote Excalidraw elements.
   * @param init A flag to indicate if this is the initial scene load.
   */
  const reconcileAndUpdateScene = useCallback(
    (remoteElements: string, { init = false }: { init?: boolean } = {}) => {
      // 1. Do nothing if Excalidraw API is not ready.
      if (!excalidrawAPI) {
        return;
      }
      try {
        // 2. Parse the incoming elements from the remote source.
        const parsedElements: RemoteExcalidrawElement[] =
          JSON.parse(remoteElements);
        // 3. Exit if there are no elements to process.
        if (!parsedElements || !parsedElements.length) {
          return;
        }

        // 4. Get the current local elements and app state from the canvas.
        const localElements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const appState = excalidrawAPI.getAppState();

        // 5. Reconcile local elements with remote elements to prevent conflicts
        // and merge changes smoothly.
        const reconciledElements = reconcileElements(
          localElements,
          parsedElements,
          appState,
        );

        // 6. Ensure that any image elements have their binary data loaded.
        // This is crucial when receiving scenes from remote peers.
        ensureAllImagesDataIsLoaded(excalidrawAPI, reconciledElements);

        // 7. Update the Excalidraw scene with the reconciled elements.
        // `captureUpdate: NEVER` prevents this update from being added to the undo/redo history,
        // as it's a sync operation, not a user action.
        excalidrawAPI.updateScene({
          elements: reconciledElements,
          captureUpdate: init
            ? CaptureUpdateAction.IMMEDIATELY
            : CaptureUpdateAction.NEVER,
        });
        // 8. Update the scene version to the latest received version.
        // This prevents the client from re-broadcasting the same data it just received,
        // which is essential in multi-user scenarios to avoid update loops.
        lastBroadcastOrReceivedSceneVersion.current =
          hashElementsVersion(reconciledElements);
        // 9. Clear the history to ensure a clean state after the remote update.
        excalidrawAPI.history.clear();
      } catch (e) {
        console.error(e);
      }
    },
    [excalidrawAPI],
  );

  const resetWhiteboardState = useCallback(
    (excalidrawAPI: ExcalidrawImperativeAPI) => {
      // 1. Clean up the whiteboard canvas
      excalidrawAPI.updateScene({ elements: [] });
      excalidrawAPI.addFiles([]);
      excalidrawAPI.history.clear();

      // 2. Reset the internal state for a clean slate.
      lastBroadcastOrReceivedSceneVersion.current = -1;
      cleanProcessedImageElementsMap();
      setIsFollowing(true);
    },
    [],
  );

  /**
   * Handles the logic for switching between whiteboard pages or office documents.
   * It cleans the canvas and prepares it for new data.
   */
  const handleSwitchPageOrDocument = useCallback(async () => {
    // 1. Do nothing if Excalidraw API is not ready.
    if (!excalidrawAPI) return;

    // 2. Set a flag to prevent other actions during the transition.
    isSwitching.current = true;

    // 3. Clean up the whiteboard canvas for all users.
    resetWhiteboardState(excalidrawAPI);

    // 4. Handle data loading based on user role.
    // If the user is the presenter, load the switched page/document data if previously saved.
    if (isPresenter) {
      // Send everyone to clean their whiteboard to make sure that cleaning happens
      // before new contents as presenter will be a single point of truth
      await sendClearWhiteboardSignal();

      const loadedFromStorage = await displaySavedPageData(
        excalidrawAPI,
        isPresenter,
        currentPage,
      );
      if (loadedFromStorage) {
        isSwitching.current = false;
      } else {
        // This mean new file so sync the office file page.
        // We get the data first, then unlock, then update the scene.
        // This allows the broadcast to happen immediately via onChange.
        const elements = await syncOfficeFilePage(currentPage);
        isSwitching.current = false;
        if (elements) {
          excalidrawAPI.updateScene({ elements });
        }
      }
    } else {
      // 5. If not the presenter, simply end the switching state.
      // They will receive the new data from the presenter.
      isSwitching.current = false;
    }
  }, [
    excalidrawAPI,
    isPresenter,
    currentPage,
    resetWhiteboardState,
    syncOfficeFilePage,
  ]);

  // clean up store during exit
  useEffect(() => {
    return () => {
      dispatch(updateExcalidrawElements(''));
      dispatch(updateMousePointerLocation(''));
      dispatch(addAllExcalidrawElements(''));
      cleanProcessedImageElementsMap();
    };
  }, [dispatch]);

  // on mount: if presenter, display saved data
  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    const initialize = async () => {
      const isPresenter =
        store.getState().session.currentUser?.metadata?.isPresenter;
      if (isPresenter) {
        // if presenter then we'll fetch storage to display after initialize excalidraw
        isSwitching.current = true;
        const { currentWhiteboardOfficeFileId, currentPage } =
          store.getState().whiteboard;

        // broadcast current fileId to make sure everyone has the same state
        // it also clean current page number and other values
        await broadcastCurrentFileId(currentWhiteboardOfficeFileId);
        // Send everyone to clean their whiteboard to make sure that cleaning happens
        // before new contents as presenter will be a single point of truth
        await sendClearWhiteboardSignal();
        // retrieve data from storage
        await displaySavedPageData(
          excalidrawAPI,
          true,
          currentPage,
          currentWhiteboardOfficeFileId,
          isSwitching,
        );
        // now set that we're ready
        // presenter should not fetch data from anyone else
        // to make sure single point of truth
        setFetchedData(true);
      } else {
        // for any other user get data from peer presenter
        fetchDataFromDonner();
      }
    };

    setTimeout(() => initialize().then(), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // when receive full whiteboard data
  useEffect(() => {
    if (excalidrawAPI && allExcalidrawElements) {
      sleep(300).then(() => reconcileAndUpdateScene(allExcalidrawElements));
    }
  }, [excalidrawAPI, allExcalidrawElements, reconcileAndUpdateScene]);

  // for handling draw elements
  useEffect(() => {
    if (
      !isSwitching.current &&
      excalidrawAPI &&
      excalidrawElements &&
      fetchedData
    ) {
      reconcileAndUpdateScene(excalidrawElements);
    }
  }, [excalidrawAPI, excalidrawElements, reconcileAndUpdateScene, fetchedData]);

  // Effect for page or file changes
  useEffect(() => {
    const hasFileChanged =
      previousFileId && currentWhiteboardOfficeFileId !== previousFileId;
    const hasPageChanged = previousPage && currentPage !== previousPage;

    if (!isSwitching.current && (hasFileChanged || hasPageChanged)) {
      handleSwitchPageOrDocument().then();
    }
  }, [
    currentWhiteboardOfficeFileId,
    previousFileId,
    currentPage,
    previousPage,
    handleSwitchPageOrDocument,
  ]);

  // when receive signal to clear the whiteboard
  useEffect(() => {
    if (excalidrawAPI && whiteboardResetSignal > 0) {
      resetWhiteboardState(excalidrawAPI);
    }
  }, [excalidrawAPI, whiteboardResetSignal, resetWhiteboardState]);

  // a debounced function to save the scene to localStorage.
  const debouncedSaveToStorage = useMemo(
    () =>
      debounce(
        (
          excalidrawAPI: ExcalidrawImperativeAPI,
          currentPage: number,
          currentWhiteboardOfficeFileId: string,
        ) => {
          savePageData(
            excalidrawAPI.getSceneElementsIncludingDeleted(),
            currentPage,
            currentWhiteboardOfficeFileId,
          ).then();
        },
        SAVE_TO_STORAGE_DEBOUNCE_TIMEOUT,
      ),
    [],
  );

  /**
   * Throttled version of the scene broadcast.
   * This reduces the number of NATS messages sent during continuous drawing.
   */
  const throttledBroadcastSceneOnChange = useMemo(
    () =>
      throttle(
        (
          elements: readonly ExcalidrawElement[],
          excalidrawAPI: ExcalidrawImperativeAPI,
          files: BinaryFiles,
        ) => {
          broadcastSceneOnChange(
            elements,
            false,
            undefined,
            excalidrawAPI,
            files,
          ).then(
            () =>
              isPresenter &&
              debouncedSaveToStorage(
                excalidrawAPI,
                currentPage,
                currentWhiteboardOfficeFileId,
              ),
          );
        },
        50, // 50ms throttle for strokes
      ),
    [isPresenter, debouncedSaveToStorage, currentPage, currentWhiteboardOfficeFileId],
  );

  /**
   * Throttled version of app state changes broadcast (zoom, scroll).
   */
  const throttledBroadcastAppStateChanges = useMemo(
    () =>
      throttle(
        (appState: AppState) => {
          broadcastAppStateChanges(
            appState.height,
            appState.width,
            appState.scrollX,
            appState.scrollY,
            appState.zoom.value,
            appState.theme,
            appState.viewBackgroundColor,
            appState.zenModeEnabled,
            appState.gridSize,
          ).then();
        },
        100, // 100ms throttle for app state
      ),
    [],
  );

  /**
   * This is the primary callback for any change on the Excalidraw canvas.
   *
   * It's important to note that on every change (e.g., drawing, moving, resizing),
   * this function receives the *entire* scene's elements, not just the modified ones.
   *
   * It then triggers the broadcasting logic, which intelligently filters and sends
   * only the necessary updates to other participants.
   */
  const handleCanvasChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (
        !excalidrawAPI || // API not ready
        !currentUser || // User not available
        !elements.length || // No elements to sync
        isSwitching.current // A page/file switch is in progress
      ) {
        return;
      }
      if (
        // Presenters or unlocked users can broadcast scene changes.
        canEdit &&
        // This check is crucial for multi-user synchronization. We create a hash (signature)
        // of the current scene and compare it to the last version we either sent or received.
        // If they are the same, we don't broadcast, preventing an infinite loop where a
        // client re-broadcasts the same data it just received from another user.
        hashElementsVersion(elements) !==
        lastBroadcastOrReceivedSceneVersion.current
      ) {
        // add new hash of the current scene
        lastBroadcastOrReceivedSceneVersion.current =
          hashElementsVersion(elements);
        throttledBroadcastSceneOnChange(elements, excalidrawAPI, files);
      }

      // Only the presenter can broadcast app state changes (zoom, scroll, etc.).
      if (isPresenter) {
        throttledBroadcastAppStateChanges(appState);
      }
    },
    [
      excalidrawAPI,
      currentUser,
      canEdit,
      isPresenter,
      throttledBroadcastSceneOnChange,
      throttledBroadcastAppStateChanges,
    ],
  );

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const onPointerUpdate = useCallback(
    throttle(
      (payload: {
        pointer: CollaboratorPointer;
        button: 'down' | 'up';
        pointersMap: Gesture['pointers'];
      }) => {
        if (!canEdit || !currentUser || payload.pointersMap.size >= 2) {
          return;
        }
        const msg: Partial<Collaborator> = {
          pointer: payload.pointer,
          button: payload.button || 'up',
          selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds,
          id: currentUser.userId,
          username: currentUser.name,
          avatarUrl: currentUser.metadata?.profilePic,
        };
        broadcastMousePointerUpdate(msg).then();
      },
      CURSOR_SYNC_TIMEOUT,
    ),
    [canEdit, currentUser, excalidrawAPI],
  );

  const showSwitchingWarning = useCallback(() => {
    if (isSwitching.current) {
      toast('Vui lòng chờ tiến trình khác hoàn tất', {
        type: 'warning',
      });
      return true;
    }
    return false;
  }, []);

  const onScrollChange: ExcalidrawProps['onScrollChange'] = useCallback(() => {
    // When a non-presenter scrolls manually, disable "follow mode".
    if (!isPresenter && !isProgrammaticScroll.current) {
      setIsFollowing(false);
    }
  }, [isPresenter]);

  const renderTopRightUI = useCallback(
    () => (
      <>
        {isPresenter && excalidrawAPI && (
          <div className="menu relative z-10">
            <Button
              onClick={() => setIsOpenManageFilesUI(true)}
              variant="ghost"
              size="sm"
              className="wb-manage-upload-file ml-1 gap-1.5"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Quản lý tệp
            </Button>
          </div>
        )}
      </>
    ),
    [isPresenter, excalidrawAPI],
  );

  const renderFooter = useMemo(
    () => (
      <FooterUI
        excalidrawAPI={excalidrawAPI}
        isPresenter={!!isPresenter}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        showSwitchingWarning={showSwitchingWarning}
      />
    ),
    [excalidrawAPI, isPresenter, isFollowing, showSwitchingWarning],
  );

  return (
    <div className="excalidraw-wrapper flex-1 w-full max-w-[1140px] m-auto h-[calc(100%-50px)] sm:px-5 mt-9 z-0">
      {isPresenter && excalidrawAPI && (
        <ManageOfficeFilesModal
          roomId={roomId}
          excalidrawAPI={excalidrawAPI}
          onClose={() => setIsOpenManageFilesUI(false)}
          isOpen={isOpenManageFilesUI}
          showSwitchingWarning={showSwitchingWarning}
        />
      )}
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          if (api) {
            setExcalidrawAPI(api);
            onReadyExcalidrawAPI(api);
          }
        }}
        onChange={handleCanvasChange}
        onPointerUpdate={onPointerUpdate}
        onScrollChange={onScrollChange}
        viewModeEnabled={viewModeEnabled}
        isCollaborating={true}
        theme={theme}
        name="Torii Nihongo whiteboard"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: !isRecorder,
          },
          tools: {
            image: true,
          },
        }}
        autoFocus={true}
        detectScroll={true}
        langCode="vi"
        renderTopRightUI={renderTopRightUI}
        libraryReturnUrl=""
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Help />
          {screenWidth <= 767 && renderFooter}
        </MainMenu>
        {screenWidth > 767 && <Footer>{renderFooter}</Footer>}
      </Excalidraw>
    </div>
  );
};

export default Whiteboard;
