// Author: Preston Lee

import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { BaseComponent } from "../base/base.component";
import { ConsentProvision } from "fhir/r5";
import { ConsentCategorySettings } from "@asushares/core";

@Component({
  selector: 'provision-centric',
  standalone: true,
  template: 'not-implemented'
})
export abstract class ProvisionCentricComponent extends BaseComponent implements OnChanges {

  @Input() provision: ConsentProvision | null = null;
  @Input() categorySettings: ConsentCategorySettings | null = null;

  abstract ngOnChanges(changes: SimpleChanges): void;

}
