/**
 * LTI v1 utilities
 */

import {
  LtiClaims,
  LtiCustomParametersSchema,
  LtiCustomDesignSchema,
  CreateRoomReq,
  CreateRoomReqSchema,
  RoomMetadataSchema,
  RoomCreateFeaturesSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

/**
 * AssignLTIV1CustomParams assigns LTI v1 custom parameters from URL params to claims
 *
 * @param params - URLSearchParams or Map of parameters
 * @param claims - LTI claims to populate
 */
export function assignLTIV1CustomParams(
  params: URLSearchParams | Map<string, string>,
  claims: LtiClaims,
): void {
  const getParam = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key) || '';
    }
    return params.get(key) || '';
  };

  const customPara = create(LtiCustomParametersSchema, {});

  // Room duration
  if (getParam('custom_room_duration') !== '') {
    const duration = parseInt(getParam('custom_room_duration'), 10);
    if (!isNaN(duration)) {
      customPara.roomDuration = duration.toString(); // uint64 with JS_STRING = string
    }
  }

  // Boolean parameters (false values)
  const boolFalse = false;
  if (getParam('custom_allow_polls') === 'false') {
    customPara.allowPolls = boolFalse;
  }
  if (getParam('custom_allow_shared_note_pad') === 'false') {
    customPara.allowSharedNotePad = boolFalse;
  }
  if (getParam('custom_allow_breakout_room') === 'false') {
    customPara.allowBreakoutRoom = boolFalse;
  }
  if (getParam('custom_allow_recording') === 'false') {
    customPara.allowRecording = boolFalse;
  }
  if (getParam('custom_allow_rtmp') === 'false') {
    customPara.allowRtmp = boolFalse;
  }
  if (getParam('custom_allow_view_other_webcams') === 'false') {
    customPara.allowViewOtherWebcams = boolFalse;
  }
  if (getParam('custom_allow_view_other_users_list') === 'false') {
    customPara.allowViewOtherUsersList = boolFalse;
  }

  // mute_on_start (true value)
  if (getParam('custom_mute_on_start') === 'true') {
    customPara.muteOnStart = true;
  }

  // Custom design parameters
  const customDesign = create(LtiCustomDesignSchema, {});

  if (getParam('custom_primary_color') !== '') {
    customDesign.primaryColor = getParam('custom_primary_color');
  }
  if (getParam('custom_secondary_color') !== '') {
    customDesign.secondaryColor = getParam('custom_secondary_color');
  }
  if (getParam('custom_background_color') !== '') {
    customDesign.backgroundColor = getParam('custom_background_color');
  }
  if (getParam('custom_custom_logo') !== '') {
    customDesign.customLogo = getParam('custom_custom_logo');
  }

  customPara.ltiCustomDesign = customDesign;
  claims.ltiCustomParameters = customPara;
}

/**
 * PrepareLTIV1RoomCreateReq prepares a CreateRoomReq from LTI claims
 *
 * @param c - LTI claims
 * @returns CreateRoomReq protobuf message
 */
export function prepareLTIV1RoomCreateReq(c: LtiClaims): CreateRoomReq {
  const req = create(CreateRoomReqSchema, {
    roomId: c.roomId,
    metadata: create(RoomMetadataSchema, {
      roomTitle: c.roomTitle,
      roomFeatures: create(RoomCreateFeaturesSchema, {
        allowWebcams: true,
        allowScreenShare: true,
        allowRtmp: true,
        allowViewOtherWebcams: true,
        allowViewOtherUsersList: true,
        recordingFeatures: {
          isAllow: true,
          isAllowCloud: true,
          isAllowLocal: true,
          enableAutoCloudRecording: false,
        },
        chatFeatures: {
          isAllow: true,
          isAllowFileUpload: true,
        },
        sharedNotePadFeatures: {
          isAllow: true,
        },
        whiteboardFeatures: {
          isAllow: true,
        },
        externalMediaPlayerFeatures: {
          isAllow: true,
        },
        breakoutRoomFeatures: {
          isAllow: true,
        },
        displayExternalLinkFeatures: {
          isAllow: true,
        },
        pollsFeatures: {
          isAllow: true,
        },
        insightsFeatures: {
          isAllow: true,
          transcriptionFeatures: {
            isAllow: true,
            isAllowTranslation: true,
          },
        },
      }),
    }),
  });

  // Apply custom parameters if provided
  if (c.ltiCustomParameters) {
    const p = c.ltiCustomParameters;
    const f = req.metadata!.roomFeatures!;

    if (p.roomDuration !== undefined && p.roomDuration !== '0') {
      f.roomDuration = p.roomDuration;
    }
    if (p.muteOnStart !== undefined) {
      f.muteOnStart = p.muteOnStart;
    }
    if (p.allowSharedNotePad !== undefined) {
      f.sharedNotePadFeatures!.isAllow = p.allowSharedNotePad;
    }
    if (p.allowBreakoutRoom !== undefined) {
      f.breakoutRoomFeatures!.isAllow = p.allowBreakoutRoom;
    }
    if (p.allowPolls !== undefined) {
      f.pollsFeatures!.isAllow = p.allowPolls;
    }
    if (p.allowRecording !== undefined) {
      f.recordingFeatures!.isAllow = p.allowRecording;
    }
    if (p.allowRtmp !== undefined) {
      f.allowRtmp = p.allowRtmp;
    }
    if (p.allowViewOtherWebcams !== undefined) {
      f.allowViewOtherWebcams = p.allowViewOtherWebcams;
    }
    if (p.allowViewOtherUsersList !== undefined) {
      f.allowViewOtherUsersList = p.allowViewOtherUsersList;
    }

    req.metadata!.roomFeatures = f;
  }

  return req;
}
