import { test, expect } from '@playwright/test';
import { mockMcp } from './fixtures/mockMcp';

test.describe('Ask Mode E2E', () => {
  test('1. Tank focus patch', async ({ page }) => {
    const discarded: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('block patch had no layout to apply to')) {
        discarded.push(msg.text());
      }
    });

    await mockMcp(page, {
      run_graph: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              response: {
                text: 'Focusing weltel-ai fish block.',
                carry: {
                  blocks: [
                    {
                      type: 'card',
                      id: 'card-ai',
                      props: { title: 'Updated AI Card' },
                    },
                  ],
                  patched_block_ids: ['card-ai'],
                  focus_slug: 'weltel-ai',
                },
              },
            }),
          },
        ],
      }),
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('tell me about weltel-ai');
    await textarea.press('Enter');

    // Exactly one block re-renders and gets .is-patched class
    const targetBlock = page.locator('[data-block-id="card-ai"]');
    await expect(targetBlock).toHaveClass(/is-patched/);

    // Class is removed after ~2.2s
    await expect(targetBlock).not.toHaveClass(/is-patched/, { timeout: 4000 });

    // Chat shows focus chip
    const chip = page.locator('button', { hasText: 'weltel-ai' });
    await expect(chip).toBeVisible();
    expect(discarded).toEqual([]);
  });

  test('2. Discovery poll — single in-flight request', async ({ page }) => {
    let activePolls = 0;
    let maxConcurrentPolls = 0;
    let pollCount = 0;

    await mockMcp(page, {
      run_graph: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              response: {
                text: 'Looking it up...',
                carry: {
                  pending_job: {
                    job_id: 'job-123',
                    status: 'pending',
                    query: 'unknown topic',
                  },
                },
              },
            }),
          },
        ],
      }),
      get_context_discovery: async (args: any) => {
        expect(args.job_id).toBe('job-123');
        activePolls++;
        if (activePolls > maxConcurrentPolls) {
          maxConcurrentPolls = activePolls;
        }

        // Delay response (50ms) to verify no concurrent calls fire while in-flight
        await new Promise((resolve) => setTimeout(resolve, 50));

        pollCount++;
        activePolls--;

        const status = pollCount >= 2 ? 'ready' : 'pending';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status }),
            },
          ],
        };
      },
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('tell me about unknown topic');
    await textarea.press('Enter');

    // DISCOVERY_POLL_MS is 3000ms; use expect.poll to wait for 2 poll iterations
    await expect.poll(() => pollCount, { timeout: 12000 }).toBeGreaterThanOrEqual(2);
    // Regression check: peak concurrent requests must be strictly 1
    expect(maxConcurrentPolls).toBe(1);
  });

  test('3. Discovery miss -> re-ask gets a fresh job', async ({ page }) => {
    const requestedJobIds: string[] = [];

    let graphCalls = 0;
    await mockMcp(page, {
      run_graph: async () => {
        graphCalls++;
        const jobId = graphCalls === 1 ? 'job-stale' : 'job-fresh';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                response: {
                  text: 'Searching...',
                  carry: {
                    pending_job: {
                      job_id: jobId,
                      status: 'pending',
                      query: 'missing topic',
                    },
                  },
                },
              }),
            },
          ],
        };
      },
      get_context_discovery: async (args: any) => {
        requestedJobIds.push(args.job_id);
        const status = args.job_id === 'job-stale' ? 'empty' : 'ready';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status }),
            },
          ],
        };
      },
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);

    // First ask
    await textarea.fill('missing topic');
    await textarea.press('Enter');

    // Wait for "I don't have a project that matches that." message (poll after 3s)
    await expect(page.locator("text=I don't have a project that matches that.")).toBeVisible({ timeout: 8000 });

    // Re-ask same question
    await textarea.fill('missing topic');
    await textarea.press('Enter');

    // Wait for second ask discovery poll to register job-fresh
    await expect.poll(() => requestedJobIds, { timeout: 10000 }).toContain('job-fresh');
    expect(requestedJobIds).toContain('job-stale');
  });

  test('4. Dropped-block notice', async ({ page }) => {
    await mockMcp(page, {
      run_graph: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              response: {
                text: 'Here is your update.',
                carry: {
                  blocks: [
                    {
                      type: 'card',
                      id: 'card-ai',
                      props: { title: 'Valid Block' },
                    },
                    {
                      // Schema-invalid block missing required 'type'
                      id: 'invalid-block-1',
                      props: { title: 'Invalid' },
                    },
                  ],
                  patched_block_ids: ['card-ai'],
                },
              },
            }),
          },
        ],
      }),
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('update layout');
    await textarea.press('Enter');

    // Verify dropped block notice is present
    await expect(page.locator("text=(1 block couldn't be rendered)")).toBeVisible();
  });

  test('5. DB failure surfaces as an error turn', async ({ page }) => {
    await mockMcp(page, {
      run_graph: async () => ({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Database connection timeout',
          },
        ],
      }),
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('break db');
    await textarea.press('Enter');

    // Verify error message bubble renders
    const errorMessage = page.locator('text=Database connection timeout');
    await expect(errorMessage).toBeVisible();
  });

  test('6. Keyboard focus after patch', async ({ page }) => {
    await mockMcp(page, {
      run_graph: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              response: {
                text: 'Patching card',
                carry: {
                  blocks: [
                    {
                      type: 'card',
                      id: 'card-ai',
                      props: { title: 'Updated' },
                    },
                  ],
                  patched_block_ids: ['card-ai'],
                },
              },
            }),
          },
        ],
      }),
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('focus test');
    await textarea.press('Enter');

    // Wait for block to be patched
    const targetBlock = page.locator('[data-block-id="card-ai"]');
    await expect(targetBlock).toHaveClass(/is-patched/);

    // Active element should be the patched block node, not the chat input
    const activeElementDataId = await page.evaluate(() => document.activeElement?.getAttribute('data-block-id'));
    expect(activeElementDataId).toBe('card-ai');
  });

  test('7. Bake handoff', async ({ page }) => {
    await mockMcp(page, {
      run_graph: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              response: {
                text: 'Baking layout for your job description.',
                carry: {
                  short_id: 'bake-test-123',
                  query_param: 'j=bake-test-123',
                },
              },
            }),
          },
        ],
      }),
    });

    await page.goto('./?v=text');
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('I need a principal DevOps role layout');
    await textarea.press('Enter');

    // Assert bake short_id chip appears in header
    const bakeChip = page.locator('a', { hasText: 'baked · j=bake-test-123' });
    await expect(bakeChip).toBeVisible();
  });

  function fishSpec(slug: string, title: string, species: string) {
    return {
      slug,
      title,
      species,
      size: 0.5,
      depth: 0.5,
      speed: 0.5,
      glow: 0.5,
      school: 0,
      tags: [],
      metrics: [],
    };
  }

  function graphCarry(carry: Record<string, unknown>, text = 'ok') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            response: { text, carry },
          }),
        },
      ],
    };
  }

  test('8. Recommendation ask chips fire a follow-up turn', async ({ page }) => {
    const discarded: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('block patch had no layout to apply to')) {
        discarded.push(msg.text());
      }
    });

    const questions: string[] = [];
    await mockMcp(page, {
      run_graph: async (args: { user_message?: string }) => {
        questions.push(String(args?.user_message || ''));
        if (questions.length === 1) {
          return graphCarry(
            {
              recommendations: [
                {
                  slug: 'weltel-ai',
                  name: 'WelTel AI',
                  reason: 'closest tag match',
                  in_tank: true,
                },
              ],
            },
            'Not a direct match — you could ask about WelTel AI.',
          );
        }
        return graphCarry({ focus_slug: 'weltel-ai' }, 'WelTel AI is the agent layer.');
      },
    });

    await page.goto('./?v=tank');
    await page.getByTitle('Ask about a project — patches the tank live').click();
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('quantum photonics?');
    await textarea.press('Enter');

    const chip = page.locator('button', { hasText: '💡 Ask about WelTel AI' });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect.poll(() => questions.length).toBe(2);
    expect(questions[1]).toContain('Tell me about WelTel AI');
    expect(discarded).toEqual([]);
  });

  test('9. Add-to-tank chip patches the fishTank roster', async ({ page }) => {
    test.setTimeout(45_000);
    const discarded: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('block patch had no layout to apply to')) {
        discarded.push(msg.text());
      }
    });

    const existing = [
      fishSpec('weltel-ai', 'WelTel AI', 'ai'),
      fishSpec('weltel-devops', 'WelTel DevOps', 'devops'),
      fishSpec('weltel-mobile', 'WelTel Mobile', 'mobile'),
      fishSpec('weltel-platform', 'WelTel Platform', 'platform'),
    ];
    const withFisoul = [...existing, fishSpec('fisoul', 'Fisoul', 'platform')];

    let addTurn = false;
    await mockMcp(page, {
      run_graph: async (args: { user_message?: string }) => {
        const msg = String(args?.user_message || '');
        if (msg.includes('"add_slugs"')) {
          addTurn = true;
          return graphCarry({
            blocks: [
              {
                type: 'fishTank',
                id: 'fish-tank-1',
                props: {
                  renderer: 'webgl',
                  fish: withFisoul,
                  highlightSlugs: ['fisoul'],
                },
              },
            ],
            patched_block_ids: ['fish-tank-1'],
            focus_slug: 'fisoul',
          }, 'Added Fisoul to the tank.');
        }
        return graphCarry({
          recommendations: [
            {
              slug: 'fisoul',
              name: 'Fisoul',
              reason: 'closest name match',
              in_tank: false,
            },
          ],
        }, 'Not a direct match — you could add Fisoul.');
      },
    });

    await page.goto('./?v=tank');
    await page.getByTitle('Ask about a project — patches the tank live').click();
    await expect(page.getByRole('heading', { name: 'Ask Portfolio' })).toBeVisible();

    const textarea = page.getByLabel(/Ask about Andrew/i);
    await textarea.fill('any game projects?');
    await textarea.press('Enter');

    await expect(page.getByText(/could add Fisoul/i)).toBeVisible({ timeout: 20_000 });
    const chip = page.locator('button', { hasText: '+ Add Fisoul to tank' });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect.poll(() => addTurn).toBe(true);
    await page.getByTitle('Close Ask Panel (Esc)').click();
    // focus_slug submerges the tank; the surface Dive CTA is gone.
    await expect(page.locator('.ft-count')).toContainText('5/', { timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Fisoul' })).toBeVisible();
    expect(discarded).toEqual([]);
  });
});
