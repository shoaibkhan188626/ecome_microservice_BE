import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { Resource } from "@opentelemetry/resources";

// Import semantic conventions - handle both old and new versions
let SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT;

try {
  // Try new stable attributes first
  const semconv = await import("@opentelemetry/semantic-conventions");
  SEMRESATTRS_SERVICE_NAME =
    semconv.ATTR_SERVICE_NAME ||
    semconv.SemanticResourceAttributes?.SERVICE_NAME ||
    "service.name";
  SEMRESATTRS_SERVICE_VERSION =
    semconv.ATTR_SERVICE_VERSION ||
    semconv.SemanticResourceAttributes?.SERVICE_VERSION ||
    "service.version";
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT =
    semconv.ATTR_DEPLOYMENT_ENVIRONMENT ||
    semconv.SemanticResourceAttributes?.DEPLOYMENT_ENVIRONMENT ||
    "deployment.environment";
} catch {
  // Fallback to hardcoded strings
  SEMRESATTRS_SERVICE_NAME = "service.name";
  SEMRESATTRS_SERVICE_VERSION = "service.version";
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = "deployment.environment";
}

let sdk = null;
let prometheusExporter = null;

/**
 * Initialize OpenTelemetry with Prometheus exporter
 */
export const initTracing = (serviceName, port = 9090) => {
  if (sdk) {
    console.log(`OpenTelemetry already initialized for ${serviceName}`);
    return { sdk, prometheusExporter };
  }

  // Create Prometheus exporter (exposes /metrics endpoint)
  prometheusExporter = new PrometheusExporter({ port }, () => {
    console.log(
      `Prometheus metrics available at http://localhost:${port}/metrics`,
    );
  });

  // Create SDK with auto-instrumentation
  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV || "development",
    }),
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable HTTP instrumentation
        "@opentelemetry/instrumentation-http": {
          enabled: true,
        },
        // Enable Express instrumentation
        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },
        // Enable MongoDB instrumentation
        "@opentelemetry/instrumentation-mongodb": {
          enabled: true,
        },
        // Enable Redis instrumentation
        "@opentelemetry/instrumentation-ioredis": {
          enabled: true,
        },
      }),
    ],
  });

  // Start SDK
  sdk.start();

  console.log(`✅ OpenTelemetry initialized for ${serviceName}`);

  return { sdk, prometheusExporter };
};

/**
 * Shutdown OpenTelemetry gracefully
 */
export const shutdownTracing = async () => {
  if (sdk) {
    await sdk.shutdown();
    console.log("OpenTelemetry shut down");
    sdk = null;
    prometheusExporter = null;
  }
};

/**
 * Get Prometheus exporter (for metrics endpoint)
 */
export const getPrometheusExporter = () => prometheusExporter;

export default {
  initTracing,
  shutdownTracing,
  getPrometheusExporter,
};
