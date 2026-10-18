// Load before Nest, pg and application modules so automatic instrumentation can
// patch their imports. No exporter or background timer is started in local/test
// runs unless an OTLP endpoint is explicitly configured.
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'

export const telemetry =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT && process.env.OTEL_SDK_DISABLED !== 'true'
    ? new NodeSDK({
        serviceName: process.env.OTEL_SERVICE_NAME ?? 'unishare-api',
        traceExporter: new OTLPTraceExporter(),
        metricReaders: [],
        logRecordProcessors: [],
        instrumentations: [
          new HttpInstrumentation({
            ignoreIncomingRequestHook: (req) =>
              ['/health', '/metrics'].includes((req.url ?? '').split('?')[0]),
          }),
          new ExpressInstrumentation(),
          new PgInstrumentation({ enhancedDatabaseReporting: false, requireParentSpan: true }),
          new UndiciInstrumentation(),
        ],
      })
    : undefined

telemetry?.start()
