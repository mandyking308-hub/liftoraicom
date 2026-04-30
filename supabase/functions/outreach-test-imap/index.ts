import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { ImapFlow } from "npm:imapflow@1.0.164";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ERROR_CODES = {
  INBOX_NOT_FOUND: "INBOX_NOT_FOUND",
  IMAP_NOT_CONFIGURED: "IMAP_NOT_CONFIGURED",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  CREDENTIAL_DECRYPT_FAILED: "CREDENTIAL_DECRYPT_FAILED",
  IMAP_AUTH_FAILED: "IMAP_AUTH_FAILED",
  IMAP_CONNECTION_FAILED: "IMAP_CONNECTION_FAILED",
  IMAP_TLS_FAILED: "IMAP_TLS_FAILED",
  IMAP_LIBRARY_ERROR: "IMAP_LIBRARY_ERROR",
  IMAP_TIMEOUT: "IMAP_TIMEOUT",
  INBOX_CREDENTIALS_KEY_MISSING: "INBOX_CREDENTIALS_KEY_MISSING",
  SERVICE_ROLE_ACCESS_FAILED: "SERVICE_ROLE_ACCESS_FAILED",
} as const;

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    providerError?: { name?: string; message?: string };
    suggestedAction?: string;
  };
};

type ImapCreds = {
  inbox_id?: string;
  imap_host: string | null;
  imap_port: number | null;
  imap_ssl: boolean | null;
  imap_username: string | null;
  imap_password: string | null;
  inbound_provider?: string | null;
  polling_enabled?: boolean | null;
  monitored_mailbox?: string | null;
  email_address?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("SERVICE_ROLE_ACCESS_FAILED", "You must be signed in to test IMAP.", 401, undefined, "Sign in again and retry the IMAP test.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");

    console.log("[outreach-test-imap] env", JSON.stringify({
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(anonKey),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasInboxCredentialsKey: Boolean(encKey),
    }));

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonError(
        "SERVICE_ROLE_ACCESS_FAILED",
        "The server is missing backend credentials required to test IMAP.",
        500,
        undefined,
        "Add the backend service-role credentials, then retry.",
      );
    }

    if (!encKey) {
      return jsonError(
        "INBOX_CREDENTIALS_KEY_MISSING",
        "The mailbox encryption key is not configured, so stored credentials cannot be decrypted.",
        500,
        undefined,
        "Add the inbox credentials key, then retry the IMAP test.",
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonError(
        "SERVICE_ROLE_ACCESS_FAILED",
        "Your session could not be verified for this IMAP test.",
        401,
        userError,
        "Refresh the page, sign in again, and retry.",
      );
    }

    const { inbox_id } = (await req.json().catch(() => ({}))) as { inbox_id?: string };
    console.log("[outreach-test-imap] request", JSON.stringify({ inbox_id: inbox_id ?? null }));

    if (!inbox_id) {
      return jsonError(
        "INBOX_NOT_FOUND",
        "Inbox ID is required to run the IMAP test.",
        400,
        undefined,
        "Open the inbox configuration page again and retry the test.",
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: inbox, error: inboxError } = await admin
      .from("inboxes")
      .select("id, email_address, monitored_mailbox, inbound_provider, inbound_polling_enabled")
      .eq("id", inbox_id)
      .maybeSingle();

    console.log("[outreach-test-imap] inbox_lookup", JSON.stringify({
      inbox_id,
      found: Boolean(inbox),
      inbound_provider: inbox?.inbound_provider ?? null,
      monitored_mailbox: inbox?.monitored_mailbox ?? null,
    }));

    if (inboxError) {
      return jsonError(
        "SERVICE_ROLE_ACCESS_FAILED",
        "The inbox could not be loaded from the backend.",
        500,
        inboxError,
        "Retry the test. If it keeps failing, inspect backend logs.",
      );
    }

    if (!inbox) {
      return jsonError(
        "INBOX_NOT_FOUND",
        "No inbox exists for the provided ID.",
        404,
        undefined,
        "Return to the inbox list, reopen the correct inbox, and retry.",
      );
    }

    if (inbox.inbound_provider !== "ionos_imap") {
      return jsonError(
        "IMAP_NOT_CONFIGURED",
        "This inbox is not configured to use IONOS IMAP polling.",
        400,
        undefined,
        "Save inbound settings with IONOS IMAP enabled, then retry.",
      );
    }

    console.log("[outreach-test-imap] credential_lookup", JSON.stringify({ inbox_id, reached: true }));
    const { data: creds, error: credErr } = await admin.rpc("get_inbox_imap_credentials", {
      _inbox_id: inbox_id,
      _enc_key: encKey,
    });

    if (credErr) {
      const mapped = mapCredentialError(credErr);
      console.error("[outreach-test-imap] decrypt_failed", JSON.stringify({
        inbox_id,
        errorName: credErr.name ?? null,
        errorMessage: credErr.message,
      }));
      await recordInboundPoll(admin, inbox_id, false, `${mapped.error.code}: ${mapped.error.message}`);
      return json(mapped, mapped.status);
    }

    console.log("[outreach-test-imap] decrypt_success", JSON.stringify({ inbox_id, success: true }));

    const c = creds as ImapCreds;
    const host = c.imap_host?.trim() || "imap.ionos.co.uk";
    const port = c.imap_port ?? 993;
    const secure = c.imap_ssl !== false;
    const username = c.imap_username?.trim() || inbox.email_address;

    console.log("[outreach-test-imap] imap_config", JSON.stringify({
      host,
      port,
      secure,
      username,
      reuseSmtpPassword: Boolean(c.imap_password),
    }));

    if (!c.imap_password) {
      const response = jsonError(
        "MISSING_CREDENTIALS",
        "No IMAP password is available for this inbox.",
        400,
        undefined,
        "Save inbound settings with password reuse enabled or enter a separate IMAP password, then retry.",
      );
      await recordInboundPoll(admin, inbox_id, false, `${ERROR_CODES.MISSING_CREDENTIALS}: No IMAP password available`);
      return response;
    }

    if (host !== "imap.ionos.co.uk" || port !== 993 || secure !== true) {
      const response = jsonError(
        "IMAP_NOT_CONFIGURED",
        "IONOS IMAP must use imap.ionos.co.uk on port 993 with SSL enabled.",
        400,
        undefined,
        "Update the IMAP host, port, and SSL settings to the IONOS values, save, and retry.",
      );
      await recordInboundPoll(admin, inbox_id, false, `${ERROR_CODES.IMAP_NOT_CONFIGURED}: Invalid IONOS IMAP settings`);
      return response;
    }

    let client: ImapFlow | null = null;
    try {
      console.log("[outreach-test-imap] imap_client_construct", JSON.stringify({ reached: true }));
      client = new ImapFlow({
        host,
        port,
        secure: true,
        auth: { user: username, pass: c.imap_password },
        logger: false,
        socketTimeout: 15000,
      });
    } catch (error) {
      console.error("[outreach-test-imap] imap_client_construct_error", JSON.stringify(logError(error)));
      await recordInboundPoll(admin, inbox_id, false, `IMAP_LIBRARY_ERROR: ${(error as Error).message}`);
      return jsonError(
        "IMAP_LIBRARY_ERROR",
        "The IMAP client could not be initialized.",
        500,
        error,
        "Retry once. If it keeps failing, inspect the IMAP library/runtime logs.",
      );
    }

    try {
      console.log("[outreach-test-imap] imap_connect", JSON.stringify({ reached: true }));
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        // deno-lint-ignore no-explicit-any
        const status = await (client as any).status("INBOX", { messages: true, unseen: true });
        await recordInboundPoll(admin, inbox_id, true, null);
        return json({ ok: true, mailbox: "INBOX", messages: status.messages, unseen: status.unseen }, 200);
      } finally {
        lock.release();
      }
    } catch (error) {
      const mapped = mapImapError(error);
      console.error("[outreach-test-imap] imap_connect_error", JSON.stringify(logError(error)));
      await recordInboundPoll(admin, inbox_id, false, `${mapped.error.code}: ${mapped.error.message}`);
      return json(mapped, mapped.status);
    } finally {
      try {
        if (client?.authenticated) await client.logout();
      } catch {
        // ignore logout noise
      }
    }
  } catch (error) {
    console.error("[outreach-test-imap] unexpected_error", JSON.stringify(logError(error)));
    return jsonError(
      "IMAP_LIBRARY_ERROR",
      "The IMAP test failed unexpectedly before a connection result was returned.",
      500,
      error,
      "Retry once. If it keeps failing, inspect the backend function logs.",
    );
  }
});

async function recordInboundPoll(
  admin: ReturnType<typeof createClient>,
  inboxId: string,
  ok: boolean,
  error: string | null,
) {
  await admin.rpc("record_inbound_poll", {
    _inbox_id: inboxId,
    _ok: ok,
    _error: error,
    _new_messages: 0,
  }).catch(() => undefined);
}

function mapCredentialError(error: unknown): { status: number } & ErrorResponse {
  const message = (error as Error)?.message ?? "Failed to load IMAP credentials.";
  const lowered = message.toLowerCase();

  if (lowered.includes("credentials not found")) {
    return {
      status: 404,
      error: {
        code: ERROR_CODES.MISSING_CREDENTIALS,
        message: "No stored inbox credentials were found for this mailbox.",
        providerError: toProviderError(error),
        suggestedAction: "Save the inbox credentials first, then retry the IMAP test.",
      },
    };
  }

  if (lowered.includes("wrong key") || lowered.includes("decrypt") || lowered.includes("corrupt") || lowered.includes("bad key")) {
    return {
      status: 500,
      error: {
        code: ERROR_CODES.CREDENTIAL_DECRYPT_FAILED,
        message: "The stored IMAP password could not be decrypted.",
        providerError: toProviderError(error),
        suggestedAction: "Verify the inbox encryption key and re-save the mailbox password if needed.",
      },
    };
  }

  return {
    status: 500,
    error: {
      code: ERROR_CODES.SERVICE_ROLE_ACCESS_FAILED,
      message: "The backend could not read the encrypted IMAP credentials.",
      providerError: toProviderError(error),
      suggestedAction: "Retry the test. If it keeps failing, inspect backend credentials and logs.",
    },
  };
}

function mapImapError(error: unknown): { status: number } & ErrorResponse {
  const name = (error as Error)?.name ?? "Error";
  const message = (error as Error)?.message ?? "IMAP connection failed.";
  const lowered = `${name} ${message}`.toLowerCase();

  if (lowered.includes("auth") || lowered.includes("login") || lowered.includes("invalid credentials") || lowered.includes("authentication")) {
    return {
      status: 400,
      error: {
        code: ERROR_CODES.IMAP_AUTH_FAILED,
        message: "IONOS rejected the IMAP username or password.",
        providerError: toProviderError(error),
        suggestedAction: "Verify the mailbox password for hello@neoncandy.online and retry.",
      },
    };
  }

  if (lowered.includes("tls") || lowered.includes("ssl") || lowered.includes("certificate") || lowered.includes("handshake")) {
    return {
      status: 400,
      error: {
        code: ERROR_CODES.IMAP_TLS_FAILED,
        message: "The IMAP TLS/SSL handshake failed.",
        providerError: toProviderError(error),
        suggestedAction: "Confirm IONOS IMAP is using SSL on port 993 and that the runtime can reach the server.",
      },
    };
  }

  if (lowered.includes("timed out") || lowered.includes("timeout")) {
    return {
      status: 504,
      error: {
        code: ERROR_CODES.IMAP_TIMEOUT,
        message: "The IMAP connection timed out before IONOS responded.",
        providerError: toProviderError(error),
        suggestedAction: "Retry the test. If it repeats, check connectivity to imap.ionos.co.uk:993.",
      },
    };
  }

  if (lowered.includes("ecconnrefused") || lowered.includes("enotfound") || lowered.includes("network") || lowered.includes("connect")) {
    return {
      status: 502,
      error: {
        code: ERROR_CODES.IMAP_CONNECTION_FAILED,
        message: "The IMAP server could not be reached.",
        providerError: toProviderError(error),
        suggestedAction: "Confirm the host is imap.ionos.co.uk, port 993 is reachable, and retry.",
      },
    };
  }

  return {
    status: 500,
    error: {
      code: ERROR_CODES.IMAP_LIBRARY_ERROR,
      message: "The IMAP library returned an unexpected error.",
      providerError: toProviderError(error),
      suggestedAction: "Retry once. If it persists, inspect the IMAP function logs for the exact provider error.",
    },
  };
}

function logError(error: unknown) {
  return {
    errorName: (error as Error)?.name ?? "Error",
    errorMessage: (error as Error)?.message ?? String(error),
  };
}

function toProviderError(error: unknown) {
  const info = logError(error);
  return {
    name: info.errorName,
    message: info.errorMessage,
  };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  providerError?: unknown,
  suggestedAction?: string,
) {
  return json({
    error: {
      code,
      message,
      providerError: providerError ? toProviderError(providerError) : undefined,
      suggestedAction,
    },
  }, status);
}
