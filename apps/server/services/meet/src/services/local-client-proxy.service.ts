/**
 * LocalClientProxy Service
 *
 * Implements NestJS ClientProxy to route NATS message patterns directly to local services in-process,
 * completely bypassing the NATS network for request-response APIs in monolithic mode.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Observable, from } from 'rxjs';

// Import Services
import { BreakoutService } from '@server/meet/modules/breakout/breakout.service';
import { PollsService } from '@server/meet/modules/polls/polls.service';
import { FileService } from '@server/meet/modules/file/file.service';
import { ArtifactsService } from '@server/meet/modules/artifacts/artifacts.service';
import { RecordingService } from '@server/meet/modules/recording/recording.service';
import { RecordingInfoService } from '@server/meet/modules/recording/recording-info.service';
import { SpeechToTextService } from '@server/meet/modules/speech-to-text/speech-to-text.service';
import { InsightsService } from '@server/meet/modules/insights/insights.service';
import { ExternalMediaService } from '@server/meet/modules/external-media/external-media.service';
import { ExternalDisplayService } from '@server/meet/modules/external-display/external-display.service';
import { IngressService } from '@server/meet/modules/ingress/ingress.service';
import { WaitingRoomService } from '@server/meet/modules/waiting-room/waiting-room.service';
import { WebhookService } from '@server/meet/infrastructure/webhook/webhook.service';
import { RoomCreateService } from '@server/meet/modules/room/room-create.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { RoomModifyService } from '@server/meet/modules/room/room-modify.service';
import { RoomEndService } from '@server/meet/modules/room/room-end.service';
import { RoomUserService } from '@server/meet/modules/room/room-user.service';

@Injectable()
export class LocalClientProxy extends ClientProxy {
  private readonly localLogger = new Logger(LocalClientProxy.name);

  unwrap<T = any>(): T {
    return {} as T;
  }

  constructor(
    private readonly breakoutService: BreakoutService,
    private readonly pollsService: PollsService,
    private readonly fileService: FileService,
    private readonly artifactsService: ArtifactsService,
    private readonly recordingService: RecordingService,
    private readonly recordingInfoService: RecordingInfoService,
    private readonly speechToTextService: SpeechToTextService,
    private readonly insightsService: InsightsService,
    private readonly externalMediaService: ExternalMediaService,
    private readonly externalDisplayService: ExternalDisplayService,
    private readonly ingressService: IngressService,
    private readonly waitingRoomService: WaitingRoomService,
    private readonly webhookService: WebhookService,
    private readonly roomCreateService: RoomCreateService,
    private readonly roomInfoService: RoomInfoService,
    private readonly roomModifyService: RoomModifyService,
    private readonly roomEndService: RoomEndService,
    private readonly roomUserService: RoomUserService,
  ) {
    super();
  }

  async connect(): Promise<any> {
    this.localLogger.log('LocalClientProxy connected in monolithic mode');
  }

  async close() {}

  protected publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void {
    // Unused in request-response redirect mode
    return () => {};
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    // Unused in request-response redirect mode
  }

  send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    const cmd = typeof pattern === 'string' ? pattern : pattern?.cmd;
    let promise: Promise<any>;

    try {
      switch (cmd) {
        // --- Breakout ---
        case 'breakout.create':
          promise = this.breakoutService.createBreakoutRooms(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'breakout.join':
          promise = this.breakoutService.joinBreakoutRoom(data as any)
            .then((token) => ({ status: true, msg: 'success', token }));
          break;
        case 'breakout.end':
          promise = this.breakoutService.endBreakoutRoom(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'breakout.get':
          const rId = typeof data === 'object' && (data as any)?.roomId ? (data as any).roomId : data;
          promise = this.breakoutService.getBreakoutRoomsInfo(rId)
            .then((rooms) => ({ status: true, msg: 'success', rooms }));
          break;
        case 'breakout.increaseDuration':
          promise = this.breakoutService.increaseBreakoutRoomDuration(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'breakout.broadcast':
          promise = this.breakoutService.broadcastBreakoutRoomMsg(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'breakout.my':
          promise = this.breakoutService.getMyBreakoutRoom((data as any).roomId, (data as any).userId)
            .then((room) => ({ status: true, msg: 'success', room }));
          break;
        case 'breakout.endAll':
          const endAllRoomId = typeof data === 'object' && (data as any)?.roomId ? (data as any).roomId : data;
          promise = this.breakoutService.endAllBreakoutRooms(endAllRoomId)
            .then(() => ({ status: true, msg: 'success' }));
          break;

        // --- Polls ---
        case 'polls.activate':
          promise = this.pollsService.manageActivation(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'polls.create':
          promise = this.pollsService.createPoll(data as any)
            .then((pollId) => ({ status: true, msg: 'success', pollId }));
          break;
        case 'polls.listPolls':
          promise = this.pollsService.listPolls((data as any).roomId)
            .then((polls) => ({ status: true, msg: 'success', polls }));
          break;
        case 'polls.countTotalResponses':
          promise = this.pollsService.getPollTotalResponses((data as any).roomId, (data as any).pollId)
            .then((responses) => ({ status: true, msg: 'success', pollId: (data as any).pollId, totalResponses: responses }));
          break;
        case 'polls.userSelectedOption':
          promise = this.pollsService.userSelectedOption((data as any).roomId, (data as any).pollId, (data as any).userId)
            .then((voted) => ({ status: true, msg: 'success', pollId: (data as any).pollId, voted: voted.toString() }))
            .catch(() => ({ status: true, msg: 'success', pollId: (data as any).pollId, voted: '0' }));
          break;
        case 'polls.submitResponse':
          promise = this.pollsService.userSubmitResponse(data as any)
            .then(() => ({ status: true, msg: 'success', pollId: (data as any).pollId }));
          break;
        case 'polls.closePoll':
          promise = this.pollsService.closePoll(data as any)
            .then(() => ({ status: true, msg: 'success', pollId: (data as any).pollId }));
          break;
        case 'polls.pollResponsesDetails':
          promise = this.pollsService.getPollResponsesDetails((data as any).roomId, (data as any).pollId)
            .then((responses) => ({ status: true, msg: 'success', pollId: (data as any).pollId, responses }));
          break;
        case 'polls.pollResponsesResult':
          promise = this.pollsService.getResponsesResult((data as any).roomId, (data as any).pollId)
            .then((result) => ({ status: true, msg: 'success', pollId: (data as any).pollId, pollResponsesResult: result }));
          break;
        case 'polls.pollsStats':
          promise = this.pollsService.getPollsStats((data as any).roomId)
            .then((stats) => ({ status: true, msg: 'success', stats }));
          break;

        // --- File ---
        case 'file.merge':
          promise = this.fileService.uploadedFileMerge(data as any);
          break;
        case 'file.registerUploadedMeta':
          promise = this.fileService.registerUploadedFileMetadata(data as any);
          break;
        case 'file.convertWhiteboard':
          promise = this.fileService.convertAndBroadcastWhiteboardFile(
            (data as any).roomId,
            (data as any).roomSid,
            (data as any).filePath,
          );
          break;
        case 'file.getByType':
          promise = this.fileService.getRoomFilesByType(
            (data as any).roomId,
            (data as any).fileType,
          );
          break;

        // --- Artifacts ---
        case 'artifact.fetch':
          promise = this.artifactsService.fetchArtifacts(data as any);
          break;
        case 'artifact.info':
          promise = this.artifactsService.getArtifactInfo((data as any).artifactId);
          break;
        case 'artifact.delete':
          promise = this.artifactsService.deleteArtifact((data as any).artifactId)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'artifact.getDownloadToken':
          promise = this.artifactsService.getDownloadToken((data as any).artifactId)
            .then((token) => ({ status: true, msg: 'success', token }));
          break;
        case 'artifact.verifyDownloadToken':
          promise = this.artifactsService.verifyAndGetFilePath((data as any).token)
            .then((res) => ({ status: true, absolutePath: res.absolutePath, fileName: res.fileName }));
          break;
        case 'recording.verifyDownloadToken':
          promise = this.artifactsService.verifyAndGetFilePath((data as any).token)
            .then((res) => ({ status: true, filePath: res.absolutePath, fileName: res.fileName }));
          break;

        // --- Recording ---
        case 'recording.fetch':
          promise = this.recordingInfoService.fetchRecordings(data as any);
          break;
        case 'recording.info':
          promise = this.recordingInfoService.recordingInfo(data as any);
          break;
        case 'recording.updateMetadata':
          promise = Promise.resolve({ status: true, msg: 'success' });
          break;
        case 'recording.delete':
          promise = this.artifactsService.deleteArtifact((data as any).recordId)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'recording.getDownloadToken':
          promise = this.artifactsService.getDownloadToken((data as any).recordId)
            .then((token) => ({ status: true, msg: 'success', token }));
          break;
        case 'recording.dispatch':
        case 'recording':
          promise = this.recordingService.handleRecordingReq(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;

        // --- Speech To Text ---
        case 'speech.serviceStatus':
          promise = this.speechToTextService.speechToTextTranslationServiceStart(
            (data as any).roomId,
            data as any,
          );
          break;
        case 'speech.generateAzureToken':
          promise = this.speechToTextService.generateAzureToken(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;
        case 'speech.userStatus':
          promise = this.speechToTextService.speechServiceUserStatus(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;
        case 'speech.renewToken':
          promise = this.speechToTextService.renewAzureToken(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;

        // --- Insights ---
        case 'insights.getSupportedLangs':
          promise = this.insightsService.getSupportedLangs((data as any).serviceType);
          break;
        case 'insights.transcription.configure':
          promise = this.insightsService.transcriptionConfigure(
            (data as any).roomId,
            data as any,
          );
          break;
        case 'insights.transcription.end':
          promise = this.insightsService.endTranscription((data as any).roomId);
          break;
        case 'insights.transcription.getUserStatus':
          promise = this.insightsService.getUserTaskStatus(
            (data as any).serviceType,
            (data as any).roomId,
            (data as any).userId,
          );
          break;
        case 'insights.transcription.userSession':
          promise = this.insightsService.transcriptionUserSession(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;
        case 'insights.translation.chat.configure':
          promise = this.insightsService.chatTranslationConfigure(
            (data as any).roomId,
            data as any,
          );
          break;
        case 'insights.translation.chat.execute':
          promise = this.insightsService.executeChatTranslation(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;
        case 'insights.translation.chat.end':
          promise = this.insightsService.chatEndTranslation((data as any).roomId);
          break;
        case 'insights.ai.textChat.configure':
          promise = this.insightsService.aiTextChatConfigure(
            (data as any).roomId,
            data as any,
          );
          break;
        case 'insights.ai.textChat.execute':
          promise = this.insightsService.executeAITextChat(
            (data as any).roomId,
            (data as any).userId,
            data as any,
          );
          break;
        case 'insights.ai.textChat.end':
          promise = this.insightsService.endAITextChat((data as any).roomId);
          break;
        case 'insights.ai.meetingSummarization.configure':
          promise = this.insightsService.meetingSummarizationConfigure(
            (data as any).roomId,
            data as any,
          );
          break;
        case 'insights.ai.meetingSummarization.end':
          promise = this.insightsService.endAIMeetingSummarization((data as any).roomId);
          break;

        // --- External Media & Display ---
        case 'externalMedia.player':
          promise = this.externalMediaService.handleRequest(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;
        case 'externalMedia.display':
          promise = this.externalDisplayService.handleRequest(data as any)
            .then(() => ({ status: true, msg: 'success' }));
          break;

        // --- Ingress ---
        case 'ingress.create':
          promise = this.ingressService.createIngress(data as any);
          break;

        // --- Waiting Room ---
        case 'waitingRoom.approveUsers':
          promise = this.waitingRoomService.approveWaitingUsers(data as any);
          break;
        case 'waitingRoom.updateMsg':
          promise = this.waitingRoomService.updateWaitingRoomMessage(data as any);
          break;

        // --- Webhook ---
        case 'webhook.register':
        case 'webhook.get':
        case 'webhook.delete':
        case 'webhook.update':
          promise = Promise.resolve({ status: true, msg: 'success' });
          break;

        // --- Room ---
        case 'room.create':
          promise = this.roomCreateService.createRoom(data as any);
          break;
        case 'room.isActive':
          promise = this.roomInfoService.isRoomActive(data as any);
          break;
        case 'room.getActiveInfo':
          promise = this.roomInfoService.getActiveRoomInfo(data as any);
          break;
        case 'room.getActiveRoomsInfo':
          promise = this.roomInfoService.getActiveRoomsInfo();
          break;
        case 'room.fetchPast':
          promise = this.roomInfoService.fetchPastRooms(data as any);
          break;
        case 'room.end':
          promise = this.roomEndService.endRoom(data as any);
          break;
        case 'room.changeVisibility':
          promise = this.roomModifyService.changeVisibility(data as any);
          break;
        case 'room.getRoomInfoByRoomId':
          promise = this.roomInfoService.getRoomInfoByRoomId((data as any).roomId, (data as any).isRunning);
          break;
        case 'room.getRoomInfoBySid':
          promise = this.roomInfoService.getRoomInfoBySid((data as any).sid, (data as any).isRunning);
          break;
        case 'room.updateRTMP':
          promise = (async () => {
            const rData = data as any;
            const room = await this.roomInfoService.getRoomInfoByRoomId(rData.roomId, true);
            if (!room) {
              return { success: false, message: 'Không tìm thấy phòng' };
            }
            const count = await this.roomInfoService.updateRoomRTMPStatus(
              BigInt(room.id),
              rData.isActive ? 1 : 0,
              rData.nodeId,
            );
            return { success: count > 0 };
          })();
          break;

        // --- User ---
        case 'user.isUserInBlockList':
          promise = this.roomUserService.isUserInBlockList((data as any).roomId, (data as any).userId);
          break;
        case 'user.getUserStatus':
          promise = this.roomUserService.getUserStatus((data as any).roomId, (data as any).userId)
            .catch(() => 'offline');
          break;
        case 'user.getOnlineUsersCount':
          promise = this.roomUserService.getOnlineUsersCount((data as any).roomId);
          break;
        case 'user.generateJoinToken':
          promise = this.roomUserService.getWajlcJoinToken(data as any);
          break;
        case 'user.updateLockSettings':
          promise = this.roomUserService.updateUserLockSettings(data as any);
          break;
        case 'user.muteUnMuteTrack':
          promise = this.roomUserService.handleMuteUnMuteTrack(data as any);
          break;
        case 'user.removeParticipant':
          promise = this.roomUserService.handleRemoveParticipant(data as any);
          break;
        case 'user.switchPresenter':
          promise = this.roomUserService.handleSwitchPresenter(data as any);
          break;

        default:
          this.localLogger.warn(`LocalClientProxy: Unknown command pattern requested: ${cmd}`);
          promise = Promise.reject(new Error(`Unknown pattern command: ${cmd}`));
      }
    } catch (err) {
      promise = Promise.reject(err);
    }

    return from(promise.then(
      (res) => res,
      (err) => {
        this.localLogger.error(`LocalClientProxy error on command ${cmd}: ${err.message}`, err.stack);
        return { status: false, msg: err.message };
      }
    ));
  }
}
