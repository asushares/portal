// Author: Preston Lee

import { AbstractSensitivityRuleProvider, RulesFile } from "@asushares/core";

export class WebRuleProvider extends AbstractSensitivityRuleProvider {

    rulesSchema() {
        return null;
    }
    loadRulesFile(): RulesFile {
        return new RulesFile();
    }


}