/**
 * Buffer GraphQL client (server-side only).
 * The API key is read from the BUFFER_API_KEY secret and is NEVER returned,
 * logged, or persisted.
 */

const DEFAULT_ENDPOINT = "https://api.buffer.com";

/** Runtime-agnostic env read (the shared logic is also imported by the test suite). */
function envGet(name: string): string {
  return (globalThis as any).Deno?.env?.get(name) ?? "";
}

export function bufferKeyPresent(): boolean {
  return !!envGet("BUFFER_API_KEY").trim();
}

export function bufferEndpoint(): string {
  return envGet("BUFFER_GRAPHQL_URL").trim() || DEFAULT_ENDPOINT;
}

export interface GqlResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  errorMessage?: string;
  /** Where the failure happened relative to the provider mutation. */
  phase?: "preflight" | "transport" | "response";
}

export async function bufferGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GqlResult<T>> {
  const key = envGet("BUFFER_API_KEY").trim();
  if (!key) return { ok: false, status: 0, errorMessage: "buffer_api_key_missing", phase: "preflight" };

  let res: Response;
  try {
    res = await fetch(bufferEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    // The request may already have reached Buffer - treat as ambiguous.
    return { ok: false, status: 0, errorMessage: `network_error: ${(e as Error).message}`, phase: "transport" };
  }

  let body: any = null;
  const raw = await res.text();
  try { body = JSON.parse(raw); } catch { /* non-JSON */ }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorMessage: body?.errors?.[0]?.message ?? `http_${res.status}`,
      phase: "response",
    };
  }
  if (body?.errors?.length) {
    return { ok: false, status: res.status, errorMessage: String(body.errors[0]?.message ?? "graphql_error"), phase: "response" };
  }
  return { ok: true, status: res.status, data: body?.data as T, phase: "response" };
}

export const ORGANIZATIONS_QUERY = `query { account { organizations { id name ownerEmail } } }`;

export const CHANNELS_QUERY = `query GetChannels($organizationId: OrganizationId!) {
  channels(input:{organizationId:$organizationId}) {
    id name displayName service avatar isQueuePaused isDisconnected isLocked externalLink
  }
}`;

export const CREATE_POST_MUTATION = `mutation CreatePost($input: CreatePostInput!) {
  createPost(input:$input) {
    ... on PostActionSuccess { post { id text dueAt status channelId } }
    ... on MutationError { message }
  }
}`;

/**
 * Buffer exposes posts as a relay-style connection:
 * posts(input:{organizationId, ...}) { pageInfo { hasNextPage endCursor } edges { node { ... } } }
 * Reconciliation walks a bounded number of pages and only reads fields the
 * API actually returns — no status or URL is ever invented.
 */
export const POSTS_QUERY = `query GetPosts($organizationId: OrganizationId!, $first: Int, $after: String) {
  posts(input:{organizationId:$organizationId}, first:$first, after:$after) {
    pageInfo { hasNextPage endCursor }
    edges { node { id status dueAt channelId } }
  }
}`;

/** Page size used by the reconciler. */
export const POSTS_PAGE_SIZE = 100;
/** Hard cap on pages walked per reconcile run. */
export const POSTS_MAX_PAGES = 5;

export { parsePostsConnection, parsePostsPageInfo } from "./socialDistributionLogic.ts";

/** Normalises a createPost payload into a typed result, never inventing success. */
export function readCreatePostResult(data: any): { postId?: string; status?: string; dueAt?: string; error?: string } {
  const node = data?.createPost;
  if (!node) return { error: "empty_provider_response" };
  if (node.message) return { error: String(node.message) };
  const post = node.post;
  if (!post?.id) return { error: "no_post_id_returned" };
  return { postId: String(post.id), status: post.status ? String(post.status) : undefined, dueAt: post.dueAt ?? undefined };
}
