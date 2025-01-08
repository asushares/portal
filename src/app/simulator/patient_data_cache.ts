// Author: Preston Lee

import { FhirResource } from "fhir/r5";

export class PatientDataCache {
    public data: { [key: string]: FhirResource[] } = {};
}