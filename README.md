# DSH Activity Indicators

See which conversation is processing its prompt or producing output, even while another chat is open. A separate UI plugin for **DeepSeek Harness 0.2.1-rc.2**, covering sidebar chats, subagents, nested subagent dropdowns and their parent chat indicators.

| State | Indicator |
| --- | --- |
| Queued or between model calls | Normal slow grey spinner |
| Prefill / waiting for the first output token | Fast grey spinner (650 ms) |
| Generating text, reasoning or tool-call output | Fast blue spinner (650 ms) |
| Finished, cancelled, awaiting approval or a question | Native DSH status |

Blue persists until the model finishes its call, including temporary gaps between chunks. Each new model call begins grey again. Active subagent phases roll up through their ancestor chats; an ordinary chat fork does not affect its parent. Generating takes precedence when several children have different phases. Reduced-motion preferences preserve the colours and disable added rotation.

## Install and test

In **Plugins → Add plugin**, enter:

```text
https://github.com/averyjohnkucan-arch/dsh-activity-indicators
```

Enable the bundle, restart DSH and reload the browser page. Use Node 22.19 or newer. No build step is needed for a GitHub installation: `client.js` is committed.

For local installation, add the packaged `.tgz` through the same installer or run:

```sh
dsh plugin --profile web add link:/absolute/path/dsh-activity-indicators
```

Open two chats and submit work in both. With DSH Model Scheduler installed, the queued chat stays slow grey; the admitted chat becomes fast grey before its first token, then fast blue while generating. Ask for subagent work and inspect the dropdown while it runs. Stop a request and check that its indicator clears. Disable this plugin to restore the previous indicators.

## Phase accuracy and compatibility

DSH exposes request start and output deltas, rather than an engine-level prefill-start event. Fast grey means an admitted model call has not emitted output yet; it can include model loading, checkpoint restoration and network latency. It is not a measurement of GPU prefill kernels.

The optional [DSH Model Scheduler](https://github.com/averyjohnkucan-arch/dsh-model-scheduler) supplies admission information so queued managed requests stay slow. Its existing `activityStatus()` API must be present (tested against 0.1.7). Without it, a pending model call is grey and fast even if its provider queues internally. All provider streams still turn blue on real output. Image/video jobs and tool execution are not model-token generation and retain slow grey indicators.

This plugin takes presentation priority over the scheduler's older blue working indicators. It does not alter model scheduling, inference settings, prompts or chat history. Host lifecycle events track phases for all agents without opening each chat. The browser uses one authenticated read-only poll every 250 ms while visible; failed polls clear phase styling. Enable/restart during an existing call can leave it neutral until the next observed output chunk.

DSH 0.2.1-rc.2 has no individual subagent indicator slot. The plugin uses supported slot priority to substitute a local copy of its MIT-licensed subagent views, preserving navigation, keyboard handling, metrics, locale and expansion. Sidebar indicators use scoped styles through the row-action slot. See `THIRD_PARTY_LICENSES.md`. No DSH or provider files are patched. Other DSH versions need compatibility testing.

## Development

```sh
npm ci
npm run build
npm run check
npm test
npm pack
```

Tests cover phase transitions, empty versus nonempty token deltas, reasoning and tool calls, scheduler admission and handoff, cancellation cleanup, Cordis lifecycle and authentication, nested subagent rollup, and the actual browser module's slot registration and rendered CSS. No GPU is needed. Live GPU generation is left for installation testing.
