import type {
  RelationshipActionType,
  RelationshipCapability,
} from "./socialRelationshipLogic.ts";
import {
  getUnipileConfig,
  listChatMessages,
  listChats,
  listUnipileAccounts,
  searchLinkedInProfiles,
  sendChatMessage,
  sendLinkedInInvitation,
  type ProviderResult,
  type UnipileAccount,
  type UnipileChat,
  type UnipileMessage,
  type UnipileProfile,
} from "./unipileClient.ts";

export type SocialProviderName = "unipile" | "manychat";
export type SocialPlatform = "linkedin" | "instagram" | "messenger" | "x" | "unknown";

export interface ProviderCapabilities {
  profile_search: boolean;
  company_search: boolean;
  send_invitation: boolean;
  follow: boolean;
  start_chat: boolean;
  send_message: boolean;
  read_chats: boolean;
  read_messages: boolean;
  webhooks: boolean;
  relation_events: boolean;
  comments_mentions: boolean;
  manage_invitations: boolean;
}

export interface SocialRelationshipProviderAdapter {
  readonly name: SocialProviderName;
  configured(): boolean;
  testConnection(): Promise<ProviderResult<{ accounts: UnipileAccount[] }>>;
  listAccounts(): Promise<ProviderResult<UnipileAccount[]>>;
  capabilities(platform: SocialPlatform): ProviderCapabilities;
  searchProfiles(accountId: string, platform: SocialPlatform, criteria: Record<string, unknown>): Promise<ProviderResult<UnipileProfile[]>>;
  sendInvitation(accountId: string, platform: SocialPlatform, providerId: string, message: string | null, idempotencyKey: string): Promise<ProviderResult<Record<string, unknown>>>;
  sendMessage(chatId: string, content: string, idempotencyKey: string): Promise<ProviderResult<Record<string, unknown>>>;
  listChats(accountId: string, cursor?: string | null): Promise<ProviderResult<UnipileChat[]>>;
  listMessages(chatId: string, cursor?: string | null): Promise<ProviderResult<UnipileMessage[]>>;
}

const ALL_FALSE: ProviderCapabilities = {
  profile_search: false,
  company_search: false,
  send_invitation: false,
  follow: false,
  start_chat: false,
  send_message: false,
  read_chats: false,
  read_messages: false,
  webhooks: false,
  relation_events: false,
  comments_mentions: false,
  manage_invitations: false,
};

export function capabilitiesForUnipile(platform: SocialPlatform): ProviderCapabilities {
  switch (platform) {
    case "linkedin":
      return {
        profile_search: true,
        company_search: true,
        send_invitation: true,
        follow: false,
        start_chat: true,
        send_message: true,
        read_chats: true,
        read_messages: true,
        webhooks: true,
        relation_events: true,
        comments_mentions: true,
        manage_invitations: true,
      };
    case "instagram":
    case "messenger":
      return {
        profile_search: false,
        company_search: false,
        send_invitation: false,
        follow: false,
        start_chat: false,
        send_message: true,
        read_chats: true,
        read_messages: true,
        webhooks: true,
        relation_events: false,
        comments_mentions: true,
        manage_invitations: false,
      };
    case "x":
      return {
        ...ALL_FALSE,
        send_message: true,
        read_chats: true,
        read_messages: true,
        webhooks: true,
      };
    default:
      return { ...ALL_FALSE };
  }
}

export function capabilityForAction(actionType: RelationshipActionType): RelationshipCapability {
  switch (actionType) {
    case "send_invitation":
    case "connect": return "send_invitation";
    case "follow": return "follow";
    case "start_chat": return "start_chat";
    case "send_message":
    case "reply_message": return "send_message";
    case "accept_invitation":
    case "decline_invitation": return "manage_invitations";
    case "sync_profile": return "profile_search";
    case "sync_conversation": return "read_messages";
  }
}

export function platformFromProviderType(value: string | null | undefined): SocialPlatform {
  const normalised = String(value ?? "").toLowerCase();
  if (normalised.includes("linkedin")) return "linkedin";
  if (normalised.includes("instagram")) return "instagram";
  if (normalised.includes("messenger") || normalised.includes("facebook")) return "messenger";
  if (normalised === "x" || normalised.includes("twitter")) return "x";
  return "unknown";
}

export class UnipileRelationshipAdapter implements SocialRelationshipProviderAdapter {
  readonly name = "unipile" as const;

  configured(): boolean {
    return !!getUnipileConfig();
  }

  async testConnection(): Promise<ProviderResult<{ accounts: UnipileAccount[] }>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    const accounts = await listUnipileAccounts(config);
    return accounts.ok
      ? { ok: true, status: accounts.status, data: { accounts: accounts.data ?? [] } }
      : accounts as ProviderResult<{ accounts: UnipileAccount[] }>;
  }

  async listAccounts(): Promise<ProviderResult<UnipileAccount[]>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    return listUnipileAccounts(config);
  }

  capabilities(platform: SocialPlatform): ProviderCapabilities {
    return capabilitiesForUnipile(platform);
  }

  async searchProfiles(accountId: string, platform: SocialPlatform, criteria: Record<string, unknown>): Promise<ProviderResult<UnipileProfile[]>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    if (platform !== "linkedin") return { ok: false, status: 400, errorCode: "profile_search_unsupported", errorMessage: `Profile search is not enabled for ${platform}.` };
    return searchLinkedInProfiles(config, accountId, criteria);
  }

  async sendInvitation(accountId: string, platform: SocialPlatform, providerId: string, message: string | null, idempotencyKey: string): Promise<ProviderResult<Record<string, unknown>>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    if (platform !== "linkedin") return { ok: false, status: 400, errorCode: "invitation_unsupported", errorMessage: `Invitations are not enabled for ${platform}.` };
    return sendLinkedInInvitation(config, accountId, providerId, message, idempotencyKey);
  }

  async sendMessage(chatId: string, content: string, idempotencyKey: string): Promise<ProviderResult<Record<string, unknown>>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    return sendChatMessage(config, chatId, content, idempotencyKey);
  }

  async listChats(accountId: string, cursor?: string | null): Promise<ProviderResult<UnipileChat[]>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    return listChats(config, accountId, cursor);
  }

  async listMessages(chatId: string, cursor?: string | null): Promise<ProviderResult<UnipileMessage[]>> {
    const config = getUnipileConfig();
    if (!config) return { ok: false, status: 400, errorCode: "unipile_not_configured", errorMessage: "UNIPILE_DSN and UNIPILE_API_KEY are required." };
    return listChatMessages(config, chatId, cursor);
  }
}

export function providerAdapter(name: string): SocialRelationshipProviderAdapter | null {
  if (name.toLowerCase() === "unipile") return new UnipileRelationshipAdapter();
  return null;
}
