# Code Health & Refactoring Assessment: Backend & Data Access

## 1. SSRF / Unsafe HTTP Requests
**Priority:** High
**File:** `src/content/loadLayout.ts`
**Line Range:** 13-17
**Explanation:**
In `loadLiveWithStatus`, the `audience` parameter is directly interpolated into the fetch URL (`${base}/portfolio/layout?audience=${audience}`) without being properly URL-encoded. If an attacker controls the `audience` input or if it contains special characters (like `&`, `#`), they can inject arbitrary query parameters, modify the request path, or potentially bypass server-side validation leading to SSRF.

**Concrete Refactor:**
```typescript
export async function loadLiveWithStatus(audience: string):
    Promise<{ layout: Layout; source: LayoutSource }> {
  const base = import.meta.env.VITE_OCT_URL as string | undefined;
  if (!base) return { layout: loadBaked(), source: "snapshot" };
  try {
    const url = new URL(`${base}/portfolio/layout`);
    url.searchParams.set("audience", audience);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    return { layout: LayoutSchema.parse(await res.json()), source: "live" };
  } catch {
    return { layout: loadBaked(), source: "snapshot" };
  }
}
```

## 2. Race Condition in Connection Management
**Priority:** High
**File:** `src/api/octClient.ts`
**Line Range:** 61-71 (specifically the `close` method relative to `connect`)
**Explanation:**
There is a race condition between the `connect()` and `close()` methods. If `close()` is called while a connection is still in flight (i.e., `this.connectPromise` is pending), `close()` will nullify `this.connectPromise` but will not close the pending client because `this.client` is currently `null`. When `doConnect()` eventually resolves, it will set `this.client = client`, leaving the client open and leaking the connection despite the explicit request to close it.

**Concrete Refactor:**
```typescript
  async close(): Promise<void> {
    // Await any pending connection before closing to prevent resource leaks
    if (this.connectPromise) {
      try {
        await this.connectPromise;
      } catch {
        // Ignore connection errors during cleanup
      }
    }

    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // ignore
      }
    }
    this.client = null;
    this._initializeResult = null;
    this.connectPromise = null;
  }
```

## 3. Unhandled Promise Rejection on Timeout
**Priority:** Medium
**File:** `src/api/octClient.ts`
**Line Range:** 101-110
**Explanation:**
When using `Promise.race()` to enforce a timeout on `this.client.callTool()`, the original `callPromise` continues running in the background if the timeout triggers first. If `callPromise` subsequently rejects (e.g., due to an underlying network error), the rejection will be completely unhandled. This can cause process crashes in Node.js environments or unhandled promise rejection warnings in the browser.

**Concrete Refactor:**
```typescript
      const callPromise = this.client.callTool({
        name,
        arguments: args,
      });

      // Attach a dummy catch handler to prevent unhandled rejections if the timeout wins
      callPromise.catch(() => {});

      let res: Awaited<ReturnType<Client["callTool"]>>;
      if (opts?.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), opts.timeoutMs);
        });
        res = await Promise.race([callPromise, timeoutPromise]);
      } else {
        res = await callPromise;
      }
```

## 4. Path Traversal & Unsafe Query Construction Risk
**Priority:** Medium
**File:** `scripts/gen-layout.ts`
**Line Range:** 24-25
**Explanation:**
The `audience` parameter is extracted from `process.argv` and directly interpolated into the request URL (`const url = ${base}/portfolio/layout?audience=${audience};`). Similar to `loadLayout.ts`, this lacks validation and encoding. An attacker influencing command-line arguments can inject arbitrary query parameters or exploit path traversal if `base` parsing is loose.

**Concrete Refactor:**
```typescript
  const parsedUrl = new URL(`${base}/portfolio/layout`);
  parsedUrl.searchParams.set("audience", audience);
  const url = parsedUrl.toString();

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (err) {
    // ...
  }
```
