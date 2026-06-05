/**
 * Insights Service Types
 */

export enum InsightsServiceType {
  Unknown = 'unknown',
  Transcription = 'transcription',
  Translation = 'translation',
  SpeechSynthesis = 'speech-synthesis',
  AITextChat = 'ai_text_chat',
  MeetingSummarizing = 'meeting_summarizing',
}

export enum InsightsTaskType {
  ConfigureAgent = 'configureAgent',
  UserStart = 'userStart',
  UserEnd = 'userEnd',
  GetUserStatus = 'getUserStatus',
  EndRoomAgentByServiceName = 'endRoomAgentByServiceName',
  EndRoomAllAgents = 'endRoomAllAgents',
  CheckBatchJobStatus = 'checkBatchJobStatus',
  DeleteUploadedFile = 'deleteUploadedFile',
}

export interface InsightsTaskPayload {
  task: string;
  service_type: string;
  room_id: string;
  room_table_id: number;
  user_id?: string;
  options?: Uint8Array;
  room_e2ee_key?: string;
  target_users?: Record<string, boolean>;
  capture_all_participants_tracks?: boolean;
  allowed_trans_langs?: string[];
  enabled_transcription_trans_synthesis?: boolean;
  agent_name?: string;
  hidden_agent?: boolean;
}

export interface AgentTaskResponse {
  status: boolean;
  msg: string;
}
