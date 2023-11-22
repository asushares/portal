// Author: Preston Lee

import { Bundle } from "fhir/r5"

export class PatientConsentConsultRequestData {

    hook = "patient-consent-consult";
    hookInstance = "patient-consent-consult";
    context: {
        actor:
        {
            value: string
        }[]
        ,
        purposeOfUse: [],
        category: [],
        patientId:
        {
            value: string
        }[],
        // class = [];
        content: Bundle | null;
    } = {
            actor: [
                {
                    value: "Organization/42"
                }
            ],
            purposeOfUse: [],
            category: [],
            patientId: [
                {
                    value: "Patient/42"
                }
            ],
            // class = [];
            content: null
        };

    constructor(content: Bundle | null) {
        this.context.content = content;
    }

}
