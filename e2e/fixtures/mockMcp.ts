import { type Page } from '@playwright/test';

function jsonRpc(id: string | number, result: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }),
  };
}

export async function mockMcp(page: Page, handlers: Record<string, (args: any) => unknown>) {
  await page.route('**/mcp', async (route) => {
    const body = route.request().postDataJSON();
    if (!body) return route.fallback();

    if (body.method === 'initialize') {
      return route.fulfill(
        jsonRpc(body.id, {
          protocolVersion: '2025-06-18',
          capabilities: {},
          serverInfo: { name: 'mock', version: '1' },
        })
      );
    }
    if (body.method === 'notifications/initialized') {
      return route.fulfill({ status: 202, body: '' });
    }
    if (body.method === 'tools/list') {
      return route.fulfill(
        jsonRpc(body.id, {
          tools: Object.keys(handlers).map((name) => ({
            name,
            inputSchema: { type: 'object', properties: {} },
          })),
        })
      );
    }
    if (body.method === 'tools/call') {
      const h = handlers[body.params.name];
      const result = h
        ? await h(body.params.arguments)
        : { isError: true, content: [{ type: 'text', text: `unmocked tool: ${body.params?.name}` }] };
      return route.fulfill(jsonRpc(body.id, result));
    }
    return route.fallback();
  });
}
