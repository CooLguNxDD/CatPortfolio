/**
 * Backward-compatibility shim for `octClient.ts`.
 * Canonical client implementation is now `whiskersClient.ts`.
 */

export {
  isWhiskersTimeoutError,
  isOctTimeoutError,
  type ContentBlock,
  type WhiskersToolResult,
  type OctToolResult,
  WhiskersClient,
  OctClient,
  whiskersBaseUrl,
  octBaseUrl,
  getSharedWhiskersClient,
  getSharedClient,
  resetSharedWhiskersClient,
  resetSharedClient,
} from "./whiskersClient";
