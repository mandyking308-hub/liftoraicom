import {
  authenticatePrivacyNotification,
  type PrivacyNotificationEvent,
  type PrivacyNotificationHeaders,
} from "./kindnesssPrivacyHandoff.ts";

export interface PrivacyReceipt {
  deliveryId: string;
  privacyRequestId: string;
  duplicate: boolean;
}

/** The only persistence port: an atomic service-role RPC, never CRM/contact writes. */
export interface PrivacyNotificationStore {
  receive(event: PrivacyNotificationEvent): Promise<PrivacyReceipt>;
}

export interface PrivacyReceiverDeps {
  enabledFlag: string | null | undefined;
  secret: string | null | undefined;
  commercialSecret?: string | null | undefined;
  store: PrivacyNotificationStore;
  now?: () => Date;
}

export type PrivacyReceiverResponse = {
  status: number;
  body: Record<string, unknown>;
};

/** Returns 2xx only after the atomic delivery/case RPC has committed. */
export async function handleKindnesssPrivacyNotification(
  rawBody: Uint8Array,
  headers: PrivacyNotificationHeaders,
  deps: PrivacyReceiverDeps,
): Promise<PrivacyReceiverResponse> {
  const now = deps.now?.() ?? new Date();
  const auth = await authenticatePrivacyNotification({
    enabledFlag: deps.enabledFlag,
    secret: deps.secret,
    commercialSecret: deps.commercialSecret,
    rawBody,
    headers,
    nowSeconds: Math.floor(now.getTime() / 1000),
  });
  if (auth.outcome === "reject") return { status: auth.httpStatus, body: { ok: false, reason: auth.reason } };

  try {
    const receipt = await deps.store.receive(auth.event);
    return {
      status: receipt.duplicate ? 200 : 202,
      body: {
        ok: true,
        duplicate: receipt.duplicate,
        delivery_id: receipt.deliveryId,
        privacy_request_id: receipt.privacyRequestId,
        autoSend: false,
      },
    };
  } catch {
    // No payload, database error or secret is logged or returned.
    return { status: 503, body: { ok: false, reason: "storage_unavailable" } };
  }
}
