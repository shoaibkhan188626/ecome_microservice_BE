import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";

let meterProvider = null;
let prometheusExporter = null;
let meter = null;

/**
 * Initialize OpenTelemetry metrics with Prometheus exporter
 */
export const initTracing = (serviceName, port = 9090) => {
  if (meterProvider) {
    console.log(`Metrics already initialized for ${serviceName}`);
    return { meterProvider, prometheusExporter, meter };
  }

  // Create Prometheus exporter
  prometheusExporter = new PrometheusExporter({ port }, () => {
    console.log(
      `✅ Prometheus metrics available at http://localhost:${port}/metrics`,
    );
  });

  // Create meter provider with resource attributes
  meterProvider = new MeterProvider({
    resource: new Resource({
      "service.name": serviceName,
      "service.version": "1.0.0",
      "deployment.environment": process.env.NODE_ENV || "development",
    }),
    readers: [prometheusExporter],
  });

  // Get meter for creating metrics
  meter = meterProvider.getMeter(serviceName);

  console.log(`✅ Metrics initialized for ${serviceName}`);

  return { meterProvider, prometheusExporter, meter };
};

/**
 * Shutdown metrics gracefully
 */
export const shutdownTracing = async () => {
  if (meterProvider) {
    await meterProvider.shutdown();
    console.log("Metrics shut down");
    meterProvider = null;
    prometheusExporter = null;
    meter = null;
  }
};

/**
 * Get the meter instance
 */
export const getMeter = () => {
  if (!meter) {
    throw new Error("Metrics not initialized. Call initTracing() first.");
  }
  return meter;
};

/**
 * Get Prometheus exporter
 */
export const getPrometheusExporter = () => prometheusExporter;

export default {
  initTracing,
  shutdownTracing,
  getMeter,
  getPrometheusExporter,
};
