// Author: Preston Lee

import { AbstractDataSharingEngine, AbstractSensitivityRuleProvider, DataSharingEngineContext, RulesFile } from "@asushares/core";
import { Consent, Coding } from "fhir/r5";

export class WebRuleProvider extends AbstractSensitivityRuleProvider {

    override rulesSchema() {
       return null;
    }
    override loadRulesFile(): RulesFile {
        return new RulesFile();
    }


}