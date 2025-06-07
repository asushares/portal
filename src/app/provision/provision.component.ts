// Author: Preston Lee

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Consent, ConsentProvision } from 'fhir/r5';
import { v4 as uuidv4 } from 'uuid';

import { BaseComponent } from '../base/base.component';
import { ConsentCategorySettings, ConsentTemplate } from '@asushares/core';
import { FormsModule } from '@angular/forms';
import { CategorySelectorComponent } from "../provision-selector/category-selector.component";
import { ProvisionCentricComponent } from './provision-centric.component';
import { PurposeSelectorComponent } from '../provision-selector/purpose-selector.component';

@Component({
    selector: 'provision',
    templateUrl: './provision.component.html',
    styleUrl: './provision.component.scss',
    imports: [NgIf, FormsModule, NgFor, CategorySelectorComponent, PurposeSelectorComponent]
})
export class ProvisionComponent extends ProvisionCentricComponent implements OnChanges {

  @Input() container: Consent | ConsentProvision | null = null;

  constructor() {
    super();
    console.log('ProvisionComponent constructor', this.container);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ProvisionComponent ngOnChanges', this.container);
    // this.sharingSettings = this.loadSharingSettingsFromProvision();
    this.loadSharingSettingsFromProvision();
  }


  removeSubProvision(cp: ConsentProvision) {
    if (this.provision?.provision) {
      let at = -1;
      for (let i = 0; i < this.provision?.provision.length; i++) {
        if (this.provision?.provision[i].id == cp.id) {
          at = i;
          break;
        }
      }
      if (at >= 0) {
        this.provision.provision.splice(at, 1);
      }
    }
    // this.sharingSettings = this.loadSharingSettingsFromProvision();
    this.loadSharingSettingsFromProvision();
  }

  addSubProvision() {
    if (this.provision) {
      if (!this.provision.provision) {
        this.provision!.provision = [];
      }
      console.log("PUSHING");

      this.provision.provision.push(ConsentTemplate.templateProvision());
      this.loadSharingSettingsFromProvision();
      // this.loadPurposeSettings();
    }
  }

  loadSharingSettingsFromProvision() {
    if (this.provision) {
      console.log("Loading all sharing settings from provision id: ", this.provision.id);
      const tmp = new ConsentCategorySettings();
      tmp.loadAllFromConsentProvision(this.provision);
      this.categorySettings = tmp;
    } else {
      console.warn("PROVISION WAS NULL WHEN LOADING SHARING SETTINGS!");
    }
  }


}
