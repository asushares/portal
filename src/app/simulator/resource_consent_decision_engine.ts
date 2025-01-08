// Author: Preston Lee

import { Consent, FhirResource } from "fhir/r5";
import { SimpleConsentDecision } from "./consent_decision";

export class ResourceConsentDecisionEngine {

    constructor(public consents: Consent[], public resources: FhirResource[]) {
    }

    decisionForConsent(resource: FhirResource, consent: Consent): SimpleConsentDecision {
        return SimpleConsentDecision.DENY;
    }
    decisionFor(resource: FhirResource): SimpleConsentDecision {
        let decision = SimpleConsentDecision.DENY;
        this.consents.forEach(consent => {
            let result = this.decisionForConsent(resource, consent);
            if (result == SimpleConsentDecision.PERMIT) {
                decision = SimpleConsentDecision.PERMIT;
            }
        });
        return decision;

    }
}