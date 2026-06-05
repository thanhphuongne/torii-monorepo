import { AccessToken, RoomAgentDispatch, RoomConfiguration, VideoGrant } from 'livekit-server-sdk';
import type { WajlcTokenClaims } from '@workspace/protocol';

type GenerateVoiceAgentLivekitTokenParams = {
  apiKey: string;
  apiSecret: string;
  tokenValidity: number;
  claims: WajlcTokenClaims;
  metadata: string;
  agentName: string;
};

/**
 * Voice Agent uses a dedicated token flow with participant metadata
 * and room-level agent dispatch configuration.
 */
export async function generateVoiceAgentLivekitToken({
  apiKey,
  apiSecret,
  tokenValidity,
  claims,
  metadata,
  agentName,
}: GenerateVoiceAgentLivekitTokenParams): Promise<string> {
  const grant: VideoGrant = {
    roomJoin: true,
    room: claims.roomId,
    roomAdmin: claims.isAdmin,
    hidden: claims.isHidden,
  };

  const accessToken = new AccessToken(apiKey, apiSecret, {
    identity: claims.userId,
    name: claims.name,
    ttl: tokenValidity,
    metadata,
  });

  accessToken.roomConfig = new RoomConfiguration({
    name: claims.roomId,
    agents: [
      new RoomAgentDispatch({
        agentName,
      }),
    ],
  });

  accessToken.addGrant(grant);
  return accessToken.toJwt();
}
