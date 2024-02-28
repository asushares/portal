// Author: Preston Lee

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consent, ConsentProvision } from 'fhir/r5';
import { v4 as uuidv4 } from 'uuid';

import { BaseComponent } from '../base/base.component';


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
    this.loadMedicalInformation();
    this.loadPurposes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.loadMedicalInformation();
    this.loadPurposes();
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
    this.loadMedicalInformation();
    this.loadPurposes();
  }


  medicalInformation = this.loadMedicalInformation();

  loadMedicalInformation() {
    let t: {
      [key: string]: {
        substanceUse: {
          enabled: boolean,
          act_code: 'ACSUBSTAB'
        },
        mentalHealth: {
          enabled: boolean,
          act_code: 'MENCAT'
        },
        demographics: {
          enabled: boolean,
          act_code: 'DEMO'
        },
        diagnoses: {
          enabled: boolean,
          act_code: 'DIA'
        },
        disabilities: {
          enabled: boolean,
          act_code: 'DIS'
        },
        genetics: {
          enabled: boolean,
          act_code: 'GDIS'
        },
        infectiousDiseases: {
          enabled: boolean,
          act_code: 'DISEASE'
        },
        medications: {
          enabled: boolean,
          act_code: 'DRGIS'
        },
        sexualAndReproductive: {
          enabled: boolean,
          act_code: 'SEX'
        },
        socialDeterminants: {
          enabled: boolean,
          act_code: 'SOCIAL'
        },
        violence: {
          enabled: boolean,
          act_code: 'VIO'
        }
      }
    } = {};
    // this.consent.provision?.forEach(p => {
    if (!this.provision?.id) {
      console.log("PROVISION ID IS NOT SET!");

    }
    t[this.provision?.id!] = {
      substanceUse: {
        enabled: false,
        act_code: 'ACSUBSTAB'
      },
      mentalHealth: {
        enabled: false,
        act_code: 'MENCAT'
      },
    demographics: {
        enabled: false,
        act_code: 'DEMO'
      },
      diagnoses: {
        enabled: false,
        act_code: 'DIA'
      },
      disabilities: {
        enabled: false,
        act_code: 'DIS'
      },
      genetics: {
        enabled: false,
        act_code: 'GDIS'
      },
      infectiousDiseases: {
        enabled: false,
        act_code: 'DISEASE'
      },
      medications: {
        enabled: false,
        act_code: 'DRGIS'
      },
      sexualAndReproductive: {
        enabled: false,
        act_code: 'SEX'
      },
      socialDeterminants: {
        enabled: false,
        act_code: 'SOCIAL'
      },
      violence: {
        enabled: false,
        act_code: 'VIO'
      }
    }
    if (this.provision) {

      this.provision.securityLabel?.forEach(sl => {
        switch (sl.code) {
          case t[this.provision?.id!].substanceUse.act_code:
            t[this.provision?.id!].substanceUse.enabled = true;
            break;

          case t[this.provision?.id!].mentalHealth.act_code:
            t[this.provision?.id!].mentalHealth.enabled = true;
            break;

          case t[this.provision?.id!].demographics.act_code:
            t[this.provision?.id!].demographics.enabled = true;
            break;

          case t[this.provision?.id!].diagnoses.act_code:
            t[this.provision?.id!].diagnoses.enabled = true;
            break;

          case t[this.provision?.id!].disabilities.act_code:
            t[this.provision?.id!].disabilities.enabled = true;
            break;

          case t[this.provision?.id!].genetics.act_code:
            t[this.provision?.id!].genetics.enabled = true;
            break;

          case t[this.provision?.id!].infectiousDiseases.act_code:
            t[this.provision?.id!].infectiousDiseases.enabled = true;
            break;

          case t[this.provision?.id!].medications.act_code:
            t[this.provision?.id!].medications.enabled = true;
            break;

          case t[this.provision?.id!].sexualAndReproductive.act_code:
            t[this.provision?.id!].sexualAndReproductive.enabled = true;
            break;

          case t[this.provision?.id!].socialDeterminants.act_code:
            t[this.provision?.id!].socialDeterminants.enabled = true;
            break;

          case t[this.provision?.id!].violence.act_code:
            t[this.provision?.id!].violence.enabled = true;
            break;

          default:
            break;
        }
      })
    }
    this.medicalInformation = t;
    return t;
  }

  purpose = this.loadPurposes();

  loadPurposes() {

    let t: {
      [key: string]: {
        treatment: { enabled: boolean, act_code: 'HIPAAConsentCD' },
        research: { enabled: boolean, act_code: 'RESEARCH' }
      }
    } = {};
    if (this.provision) {
      // this.consent.provision?.forEach(p => {
      if (!this.provision.id) {
        console.log("PROVISION ID IS NOT SET!");

      }
      t[this.provision.id!] = {
        treatment: { enabled: false, act_code: 'HIPAAConsentCD' },
        research: { enabled: false, act_code: 'RESEARCH' }
      }
      this.provision.purpose?.forEach(pur => {
        console.log("PURPOSE: " + pur.code);
        switch (pur.code) {
          case t[this.provision?.id!].research.act_code:
            t[this.provision?.id!].research.enabled = true;
            break;
          case t[this.provision?.id!].treatment.act_code:
            t[this.provision?.id!].treatment.enabled = true;
            break;
          default:
            break;
        }
      })
    }
    // });
    this.purpose = t;
    return t;
  }


  updateMedicalInformation(cp: ConsentProvision) {

    if (this.provision && this.provision.id && this.provision.securityLabel) {
      Object.entries(this.medicalInformation[this.provision.id]).forEach(([k, n]) => {
        console.log('CLICK ' + k);
        // let n = Object.v this.medicalInformation[this.provision.id!];

        if (n.enabled) {
          let found = false;
          this.provision?.securityLabel!.forEach(sl => {
            if (n.act_code == sl.code) {
              found = true;
            }
          });
          if (!found) {
            console.log("ENABLING " + n.act_code);
            this.provision?.securityLabel!.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
          }
        } else { // disabled
          let foundAt = -1;
          for (let i = 0; i < this.provision!.securityLabel!.length; i++) {
            if (n.act_code == this.provision!.securityLabel![i].code) {
              foundAt = i;
            }
            if (foundAt >= 0) {
              console.log("DISABLED " + n.act_code);
              this.provision?.securityLabel?.splice(foundAt, 1);
            }
          }
        }
      });
    }
    // console.log(this.consent);

  }

  updatePurpose(cp: ConsentProvision) {
    if (this.provision) {
      if (!this.provision.purpose) {
        this.provision.purpose = [];
      }
      if (this.provision.id && this.provision.purpose) {
        Object.entries(this.purpose[this.provision.id]).forEach(([k, n]) => {
          if (n.enabled) {
            let found = false;
            this.provision?.purpose?.forEach(pur => {
              // console.log("DEBUG" +pur.code);
              if (n.act_code == pur.code) {
                found = true;
              }
            });
            if (!found) {
              console.log("ENABLING " + n.act_code);
              this.provision?.purpose?.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
            }
          } else { // disabled
            let foundAt = -1;
            for (let i = 0; i < this.provision!.purpose!.length; i++) {
              if (n.act_code == this.provision?.purpose![i].code) {
                foundAt = i;
              }
              if (foundAt >= 0) {
                console.log("DISABLED " + n.act_code);
                this.provision?.purpose?.splice(foundAt, 1);
              }
            }
          }
        });
      }
    }
  }


  addSubProvision() {
    if (this.provision) {
      if (!this.provision.provision) {
        this.provision!.provision = [];
      }
      console.log("PUSHING");
      
      this.provision.provision.push(ProvisionComponent.templateProvision());
      this.loadMedicalInformation();
      this.loadPurposes();
    }
  }


  static templateProvision(): ConsentProvision {
    return {
      id: uuidv4(),
      actor: [{
        reference: {
          reference: ''
        },
        role: {
          coding: [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "IRCP"
            }
          ]
        }
      }],
      action: [{
        coding: [
          {
            "system": "http://terminology.hl7.org/CodeSystem/consentaction",
            "code": "access"
          }
        ]
      }],
      securityLabel: [],
      purpose: [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
          "code": "RESEARCH",
          "display": "RESEARCH"
        }
      ]
    }
  }

}
