// Author: Preston Lee

import { AbstractDataSharingEngine, DataSharingEngineContext } from "@asushares/core";
import { Consent, Coding } from "fhir/r5";

export class WebDataSharingEngine extends AbstractDataSharingEngine {

    createAuditEvent(consents: Consent[], engineContext: DataSharingEngineContext, outcodeCode: Coding): void {
        console.log('WebDataSharingEngine.createAuditEvent', consents, engineContext, outcodeCode);
    }

}