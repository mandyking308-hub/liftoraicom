/**
 * Smartlead webhook receiver readiness.
 *
 * Source code presence is NOT deployment evidence. The only accepted evidence is
 * an explicit provider_secret_registry attestation row
 * (`smartlead_webhook_receiver_deployed`).
 *
 * API contract note: `receiver_deployed` stays a BOOLEAN so existing consumers
 * (`!!data.webhook.receiver_deployed`) keep working. The string detail lives in
 * the separate `receiver_deployed_status` / `receiver_deployment_evidence` fields.
 */

export type ReceiverDeployedStatus = "verified_deployed" | "not_verified";

export interface WebhookReadiness {
  /** Boolean for backwards compatibility — true only with real evidence. */
  receiver_deployed: boolean;
  receiver_deployed_status: ReceiverDeployedStatus;
  receiver_deployment_evidence: string;
  capture_mode_ready: boolean;
  capture_mode_note: string;
  latest_test_event_captured: boolean;
}

export function buildWebhookReadiness(opts: {
  attestation_present?: boolean | null;
  test_event_captured?: boolean | null;
}): WebhookReadiness {
  const verified = opts.attestation_present === true;
  const testEvent = opts.test_event_captured === true;
  return {
    receiver_deployed: verified,
    receiver_deployed_status: verified ? "verified_deployed" : "not_verified",
    receiver_deployment_evidence: verified
      ? "provider_secret_registry_attestation"
      : "none — source code presence is not deployment evidence",
    capture_mode_ready: verified && testEvent,
    capture_mode_note:
      "Live capture cannot be confirmed from code. Requires a verified deployed receiver plus an observed inbound test event.",
    latest_test_event_captured: testEvent,
  };
}
