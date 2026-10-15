// Build first, then run: node apps/api/scripts/check-telemetry.cjs
// The collector runs in a separate worker so it cannot trace its own exports.
const assert = require('node:assert/strict')
const { Worker } = require('node:worker_threads')
const { once } = require('node:events')

async function check() {
  const collector = new Worker(
    `
    const { parentPort } = require('node:worker_threads');
    const server = require('node:http').createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        parentPort.postMessage({ batch: JSON.parse(body) });
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
      });
    });
    server.listen(0, '127.0.0.1', () => parentPort.postMessage({ port: server.address().port }));
  `,
    { eval: true },
  )
  const batches = []
  collector.on('message', (message) => {
    if (message.batch) batches.push(message.batch)
  })
  const [{ port }] = await once(collector, 'message')
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `http://127.0.0.1:${port}`
  process.env.OTEL_SERVICE_NAME = 'unishare-telemetry-check'
  process.env.OTEL_TRACES_SAMPLER = 'always_on'
  process.env.OTEL_SDK_DISABLED = 'false'
  const { telemetry } = require('../dist/src/telemetry.js')
  const { context, trace } = require('@opentelemetry/api')
  const server = require('node:http').createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ span: trace.getSpan(context.active())?.spanContext() }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}`
    let root
    await trace.getTracer('unishare-check').startActiveSpan('request', async (span) => {
      root = span.spanContext()
      try {
        const response = await fetch(`${endpoint}/operation`)
        const incoming = await response.json()
        assert.equal(incoming.span.traceId, root.traceId)
        assert.notEqual(incoming.span.spanId, root.spanId)
      } finally {
        span.end()
      }
    })
    const probe = await fetch(`${endpoint}/health?check=1`)
    assert.equal((await probe.json()).span, undefined, 'probe must not create a server span')
    await telemetry.shutdown()
    const spans = batches.flatMap((batch) =>
      batch.resourceSpans.flatMap((resource) =>
        resource.scopeSpans.flatMap((scope) => scope.spans),
      ),
    )
    const related = spans.filter((span) => span.traceId === root.traceId)
    assert.equal(related.length, 3, 'operation, native fetch client, and incoming HTTP server')
    const incoming = related.find((span) => span.kind === 2)
    const outgoing = related.find((span) => span.kind === 3)
    assert.ok(incoming)
    assert.ok(outgoing)
    assert.equal(incoming.parentSpanId, outgoing.spanId)
    assert.equal(outgoing.parentSpanId, root.spanId)
    console.log(
      'PASS: Node HTTP + native fetch share a trace, parent links export, health probes excluded',
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await collector.terminate()
  }
}
check().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
