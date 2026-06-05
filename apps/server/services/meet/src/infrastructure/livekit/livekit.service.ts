import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  RoomServiceClient,
  IngressClient,
  IngressInput,
} from 'livekit-server-sdk';
import {
  NatsKvUserInfo,
  WajlcTokenClaimsSchema,
  UserMetadataSchema,
} from '@workspace/protocol';
import { generateLivekitAccessToken } from '@server/shared';
import { create, fromJsonString } from '@bufbuild/protobuf';
import {
  LIVEKIT_ROOM_SERVICE,
  LIVEKIT_INGRESS_CLIENT,
} from './livekit.constants';

import { AppConfigService } from '@server/shared';

/**
 * LiveKitService handles participant operations with LiveKit server
 */
@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(LIVEKIT_ROOM_SERVICE) private readonly client: RoomServiceClient,
    @Inject(LIVEKIT_INGRESS_CLIENT)
    private readonly ingressClient: IngressClient,
  ) {
    this.logger.log('LiveKit service initialized with injected clients');
  }

  /**
   * LoadParticipants will load all the participant info from livekit
   *
   * @param roomId - The room ID to load participants from
   * @returns Array of ParticipantInfo or null
   */
  async loadParticipants(roomId: string): Promise<any[] | null> {
    try {
      this.logger.debug(`Loading participants for room: ${roomId}`);

      const participants = await this.client.listParticipants(roomId);

      if (!participants || participants.length === 0) {
        return null;
      }

      this.logger.debug(
        `Loaded ${participants.length} participants for room: ${roomId}`,
      );
      return participants;
    } catch (error) {
      this.logger.error(
        `Failed to load participants for room ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * LoadParticipantInfo will load single participant info by identity
   *
   * @param roomId - The room ID
   * @param identity - The participant identity
   * @returns ParticipantInfo or throws error
   */
  async loadParticipantInfo(roomId: string, identity: string): Promise<any> {
    try {
      this.logger.debug(
        `Loading participant info: ${identity} in room: ${roomId}`,
      );

      const participant = await this.client.getParticipant(roomId, identity);

      if (!participant) {
        throw new Error('Không tìm thấy người tham gia');
      }

      this.logger.debug(`Loaded participant: ${identity}`);
      return participant;
    } catch (error) {
      this.logger.error(
        `Failed to load participant ${identity} in room ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * RemoveParticipant will send a request to livekit to remove user
   *
   * @param roomId - The room ID
   * @param userId - The user/participant identity to remove
   * @returns RemoveParticipantResponse
   */
  async removeParticipant(roomId: string, userId: string): Promise<any> {
    try {
      this.logger.log(`Removing participant: ${userId} from room: ${roomId}`);

      const response = await this.client.removeParticipant(roomId, userId);

      this.logger.log(
        `Successfully removed participant: ${userId} from room: ${roomId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to remove participant ${userId} from room ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * EndRoom will send API request to livekit to delete the room
   *
   * @param roomId - The room ID to delete
   * @returns Response string or error message
   */
  async endRoom(roomId: string): Promise<string> {
    try {
      this.logger.log(`Ending room via LiveKit: ${roomId}`);

      //  SDK handles timeout internally
      await this.client.deleteRoom(roomId);

      this.logger.log(`Successfully ended room: ${roomId}`);

      // Return success message
      return `Room ${roomId} deleted successfully`;
    } catch (error) {
      this.logger.error(`Failed to end room ${roomId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * MuteUnMuteTrack mutes/unmutes a published track
   *
   * @param roomId - Room ID
   * @param userId - User/participant identity
   * @param trackSid - Track SID to mute/unmute
   * @param muted - True to mute, false to unmute
   * @returns MuteRoomTrackResponse
   */
  async muteUnMuteTrack(
    roomId: string,
    userId: string,
    trackSid: string,
    muted: boolean,
  ): Promise<any> {
    try {
      this.logger.log(
        `${muted ? 'Muting' : 'Unmuting'} track ${trackSid} for user ${userId} in room ${roomId}`,
      );

      const response = await this.client.mutePublishedTrack(
        roomId,
        userId,
        trackSid,
        muted,
      );

      this.logger.log(
        `Successfully ${muted ? 'muted' : 'unmuted'} track ${trackSid}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to ${muted ? 'mute' : 'unmute'} track ${trackSid}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GenerateLivekitToken generates a LiveKit access token
   *
   * @param roomId - Room ID
   * @param userInfo - NatsKvUserInfo object
   * @returns JWT token string
   */
  async generateLivekitToken(
    roomId: string,
    userInfo: NatsKvUserInfo,
  ): Promise<string> {
    // Get config values from typed config
    const { apiKey, apiSecret } = this.appConfig.livekit;
    const tokenValidity = 7200; // Default 2 hours

    const metadata = userInfo.metadata
      ? fromJsonString(UserMetadataSchema, userInfo.metadata)
      : undefined;

    // Create claims
    const c = create(WajlcTokenClaimsSchema, {
      roomId: roomId,
      name: userInfo.name,
      userId: userInfo.userId,
      isAdmin: userInfo.isAdmin,
    });

    return await generateLivekitAccessToken(
      apiKey,
      apiSecret,
      tokenValidity,
      c,
    );
  }

  /**
   * CreateIngress will send a request to livekit to create a new ingress
   */
  async createIngress(inputType: IngressInput, options: any): Promise<any> {
    return await this.ingressClient.createIngress(inputType, options);
  }

  /**
   * Get the underlying RoomServiceClient for advanced operations
   */
  getClient(): RoomServiceClient {
    return this.client;
  }

  /**
   * Get the underlying IngressClient for advanced operations
   */
  getIngressClient(): IngressClient {
    return this.ingressClient;
  }
}
