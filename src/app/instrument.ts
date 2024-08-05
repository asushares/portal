import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
    WebTracerProvider,
    ConsoleSpanExporter,
    SimpleSpanProcessor,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_NAMESPACE, SEMRESATTRS_SERVICE_INSTANCE_ID, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { log } from 'console';

if ('true' == (window as any)['SKYCAPP_TELEMETRY_TRACES_ENABLED']) {
    console.log('Telemetry enabled. Initializing...');
    initializeTelemetry();
} else {
    console.log('Telemetry disabled. Skipping initialization.');
}

function initializeTelemetry() {
    const provider = new WebTracerProvider({
        resource: new Resource({
            [SEMRESATTRS_SERVICE_NAME]: 'provider-portal',
            [SEMRESATTRS_SERVICE_NAMESPACE]: 'sandbox',
            // [SEMRESATTRS_SERVICE_INSTANCE_ID]: 'sandbox',
            // [SEMRESATTRS_SERVICE_VERSION]: 'sandbox'
        })
    });

    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

    let traces_url = (window as any)['SKYCAPP_TELEMETRY_TRACES_URL'];
    if (traces_url && traces_url.length > 0) {
        console.log('Initializing trace exporter URL: ' + traces_url);
        
        provider.addSpanProcessor(
            new BatchSpanProcessor(
                new OTLPTraceExporter({
                    // url: 'http://localhost:4318/v1/traces',
                    url: traces_url,
                    headers: {

                    }

                }),
            ),
        );
        provider.register({
            contextManager: new ZoneContextManager(),
        });

        registerInstrumentations({
            instrumentations: [
                getWebAutoInstrumentations({
                    // not needed to add the following, but it better shows the intention
                    '@opentelemetry/instrumentation-document-load': {},
                    '@opentelemetry/instrumentation-user-interaction': {},
                    '@opentelemetry/instrumentation-fetch': {},
                    '@opentelemetry/instrumentation-xml-http-request': {},
                }),
            ],
        });
    } else {
        console.error('No tracing URL provided. Skipping trace initialization.');
    }

}