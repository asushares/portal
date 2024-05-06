// Author: Preston Lee

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consent, ConsentProvision } from 'fhir/r5';
import { v4 as uuidv4 } from 'uuid';

import { BaseComponent } from '../base/base.component';
import { ConsentCategorySettings, ConsentTemplate } from '@asushares/core';

@Component({
  selector: 'provision',
  templateUrl: './provision.component.html',
  styleUrl: './provision.component.scss'
})
export class ProvisionComponent extends BaseComponent implements OnChanges {

  @Input() container: Consent | ConsentProvision | null = null;
  @Input() provision: ConsentProvision | null = null;

  constructor() {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.sharingSettings = this.loadSharingSettings();
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
    this.sharingSettings = this.loadSharingSettings();
  }


  sharingSettings: { [key: string]: ConsentCategorySettings } | null = null;

  loadSharingSettings() {
    let t: { [key: string]: ConsentCategorySettings } = {};
    if (this.provision?.id) {
      console.log("Loading settings from provision id: " + this.provision.id);
      t[this.provision.id] = new ConsentCategorySettings();
      t[this.provision.id].loadFromConsentProvision(this.provision);      
    } else {
      console.log("PROVISION ID IS NOT SET!");
    }
    return t;
  }


  // loadPurposeSettings() {

  //   let t: { [key: string]: InformationPurposeSetting } = {};
  //   if (!this.provision?.id) {
  //     console.log("PROVISION ID IS NOT SET!");
  //   }
  //   if (this.provision?.id) {
  //     if (this.provision.purpose) {
  //       this.medicalInformation[this.provision.id].applyPurposeCodings(this.provision.purpose);
  //     }
  //   }
  //   return t;
  // }


  updateCategorySetting(cp: ConsentProvision) {
    if (cp.id && this.sharingSettings && this.sharingSettings[cp.id]) {
      this.sharingSettings[cp.id].updateConsentProvision(cp);
    }
    // if (this.provision && this.provision.id && this.provision.securityLabel) {
    //   Object.entries(this.medicalInformation[this.provision.id]).forEach(([k, n]) => {
    //     console.log('CLICK ' + k);
    //     // let n = Object.v this.medicalInformation[this.provision.id!];

    //     if (n.enabled) {
    //       let found = false;
    //       this.provision?.securityLabel!.forEach(sl => {
    //         if (n.act_code == sl.code) {
    //           found = true;
    //         }
    //       });
    //       if (!found) {
    //         console.log("ENABLING " + n.act_code);
    //         this.provision?.securityLabel!.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
    //       }
    //     } else { // disabled
    //       let foundAt = -1;
    //       for (let i = 0; i < this.provision!.securityLabel!.length; i++) {
    //         if (n.act_code == this.provision!.securityLabel![i].code) {
    //           foundAt = i;
    //         }
    //         if (foundAt >= 0) {
    //           console.log("DISABLED " + n.act_code);
    //           this.provision?.securityLabel?.splice(foundAt, 1);
    //         }
    //       }
    //     }
    //   });
    // }

  }

  updatePurposeSetting(cp: ConsentProvision) {
    if (cp.id && this.sharingSettings && this.sharingSettings[cp.id]) {
      this.sharingSettings[cp.id].updateConsentProvision(cp);
    }
    // if (this.provision) {
    //   if (!this.provision.purpose) {
    //     this.provision.purpose = [];
    //   }
    //   if (this.provision.id && this.provision.purpose) {
    //     Object.entries(this.purpose[this.provision.id]).forEach(([k, n]) => {
    //       if (n.enabled) {
    //         let found = false;
    //         this.provision?.purpose?.forEach(pur => {
    //           // console.log("DEBUG" +pur.code);
    //           if (n.act_code == pur.code) {
    //             found = true;
    //           }
    //         });
    //         if (!found) {
    //           console.log("ENABLING " + n.act_code);
    //           this.provision?.purpose?.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
    //         }
    //       } else { // disabled
    //         let foundAt = -1;
    //         for (let i = 0; i < this.provision!.purpose!.length; i++) {
    //           if (n.act_code == this.provision?.purpose![i].code) {
    //             foundAt = i;
    //           }
    //           if (foundAt >= 0) {
    //             console.log("DISABLED " + n.act_code);
    //             this.provision?.purpose?.splice(foundAt, 1);
    //           }
    //         }
    //       }
    //     });
    //   }
    // }
  }


  addSubProvision() {
    if (this.provision) {
      if (!this.provision.provision) {
        this.provision!.provision = [];
      }
      console.log("PUSHING");

      this.provision.provision.push(ConsentTemplate.templateProvision());
      this.loadSharingSettings();
      // this.loadPurposeSettings();
    }
  }




}
