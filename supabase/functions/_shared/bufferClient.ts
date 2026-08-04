/**
 * Buffer GraphQL client (server-side only).
 * The API key is read from the BUFFER_API_KEY secret and is NEVER returned,
 * logged, or persisted.
 */

const DEFAULT_ENDPOINT = "https://api.buffer.com";

export function bufferKeyPresent(): boolean {
  return !!(Deno.env.get("BUFFER_API_KEY") ?? "").trim();
}

export function bufferEndpoint(): string {
  return (Deno.env.get("BUFFER_GRAPHQL_URL") ?? "").trim() || DEFAULT_ENDPOINT;
}

export interface GqlResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  errorMessage?: string;
}

export async function bufferGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GqlResult<T>> {
  const key = (Deno.env.get("BUFFER_API_KEY") ?? "").trim();
  if (!key) return { ok: false, status: 0, errorMessage: "buffer_api_key_missing" };

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
    return { ok: false, status: 0, errorMessage: `network_error: ${(e as Error).message}` };
  }

  let body: any = null;
  const raw = await res.text();
  try { body = JSON.parse(raw); } catch { /* non-JSON */ }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorMessage: body?.errors?.[0]?.message ?? `http_${res.status}`,
    };
  }
  if (body?.errors?.length) {
    return { ok: false, status: res.status, errorMessage: String(body.errors[0]?.message ?? "graphql_error") };
  }
  return { ok: true, status: res.status, data: body?.data as T };
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
 * Buffer exposes posts as a relay-style connection. The precise supported
 * filter input for the current schema is NOT proven from a local schema
 * document, so reconciliation stays disabled unless an operator explicitly
 * sets BUFFER_POSTS_QUERY_VERIFIED=true after validating the query.
 */
export const POSTS_QUERY = `query GetPosts($organizationId: OrganizationId!) {
  posts(input:{organizationId:$organizationId}) {
    edges { node { id status dueAt channelId } }
  }
}`;

export function postsQueryVerified(): boolean {
  return (Deno.env.get("BUFFER_POSTS_QUERY_VERIFIED") ?? "").trim().toLowerCase() === "true";
}

/** Parses the current connection shape. Never invents a status. */
export function parsePostsConnection(
  data: any,
): Array<{ id: string; status?: string | null; dueAt?: string | null; channelId?: string | null }> {
  const edges = data?.posts?.edges;
  if (!Array.isArray(edges)) return [];
  return edges
    .map((e: any) => e?.node)
    .filter((n: any) => n?.id)
    .map((n: any) => ({
      id: String(n.id),
      status: n.status ?? null,
      dueAt: n.dueAt ?? null,
      channelId: n.channelId ?? null,
    }));
}

/** Normalises a createPost payload into a typed result, never inventing success. */
export function readCreatePostResult(data: any): { postId?: string; status?: string; dueAt?: string; error?: string } {
  const node = data?.createPost;
  if (!node) return { error: "empty_provider_response" };
  if (node.message) return { error: String(node.message) };
  const post = node.post;
  if (!post?.id) return { error: "no_post_id_returned" };
  return { postId: String(post.id), status: post.status ? String(post.status) : undefined, dueAt: post.dueAt ?? undefined };
}
