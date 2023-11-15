// Author: Preston Lee

import { Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../organization.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute } from '@angular/router';
import { PatientService } from '../patient.service';
import { Datepicker } from 'vanillajs-datepicker';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent extends BaseComponent {

  mode: 'create' | 'update' = 'create';

  consent: Consent = this.template();

  patientSearchText = '';
  patientList: Bundle<Patient> | null = null;
  patientSelected: Patient | null = null;
  patientSearching: boolean = false;

  organizationSearchText = '';
  organizationList: Bundle<Organization> | null = null;
  organizationSelected: Organization[] = [];
  organizationSearching: boolean = false;

  medicalInformation = this.loadConsentProvisionsMedicalInformation();

  loadConsentProvisionsMedicalInformation() {
    let t: {
      [key: string]: {
        behavioralHealth: {
          enabled: boolean,
          act_code: 'BH'
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
        // substanceUse: {
        //   enabled: boolean,
        //   act_code: 'ETH'
        // }
      }
    } = {};
    this.consent.provision?.forEach(p => {
      if (!p.id) {
        console.log("PROVISION ID IS NOT SET!");

      }
      t[p.id!] = {
        behavioralHealth: {
          enabled: false,
          act_code: 'BH'
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
          act_code: 'ACMED'
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
        // substanceUse: {
        //   enabled: false,
        //   act_code: 'ETH'
        // }
      }
      p.securityLabel?.forEach(sl => {
        switch (sl.code) {
          case t[p.id!].behavioralHealth.act_code:
            t[p.id!].behavioralHealth.enabled = true;
            break;

          case t[p.id!].demographics.act_code:
            t[p.id!].demographics.enabled = true;
            break;

          case t[p.id!].diagnoses.act_code:
            t[p.id!].diagnoses.enabled = true;
            break;

          case t[p.id!].disabilities.act_code:
            t[p.id!].disabilities.enabled = true;
            break;

          case t[p.id!].genetics.act_code:
            t[p.id!].genetics.enabled = true;
            break;

          case t[p.id!].infectiousDiseases.act_code:
            t[p.id!].infectiousDiseases.enabled = true;
            break;

          case t[p.id!].medications.act_code:
            t[p.id!].medications.enabled = true;
            break;

          case t[p.id!].sexualAndReproductive.act_code:
            t[p.id!].sexualAndReproductive.enabled = true;
            break;

          case t[p.id!].socialDeterminants.act_code:
            t[p.id!].socialDeterminants.enabled = true;
            break;

          case t[p.id!].violence.act_code:
            t[p.id!].violence.enabled = true;
            break;

          // case t[p.id!].substanceUse.act_code:
          //   t[p.id!].substanceUse.enabled = true;
          //   break;

          default:
            break;
        }
        // t[p.id!].for
      })
    });
    this.medicalInformation = t;
    return t;
  }

  purpose = this.loadConsentProvisionsPurposes();

  loadConsentProvisionsPurposes() {
    let t: {
      [key: string]: {
        treatment: { enabled: boolean, act_code: 'HIPAAConsentCD' },
        research: { enabled: boolean, act_code: 'RESEARCH' }
      }
    } = {};
    this.consent.provision?.forEach(p => {
      if (!p.id) {
        console.log("PROVISION ID IS NOT SET!");

      }
      t[p.id!] = {
        treatment: { enabled: false, act_code: 'HIPAAConsentCD' },
        research: { enabled: false, act_code: 'RESEARCH' }
      }
      p.purpose?.forEach(pur => {
        console.log("PUR " + pur.code);
        switch (pur.code) {
          case t[p.id!].research.act_code:
            t[p.id!].research.enabled = true;
            break;
          case t[p.id!].treatment.act_code:
            t[p.id!].treatment.enabled = true;
            break;
          default:
            break;
        }
      })

    });
    this.purpose = t;
    return t;
  }


  constructor(public route: ActivatedRoute, protected organizationService: OrganizationService, protected patientService: PatientService, protected consentService: ConsentService, protected toastService: ToastService) {
    super();
    this.route.paramMap.subscribe(pm => {
      let c_id = pm.get('consent_id')!;
      if (c_id) {
        this.mode = 'update';
        this.consentService.get(c_id).subscribe({
          next: c => {
            this.consent = this.repairConsent(c);
            this.loadConsentProvisionsMedicalInformation();
            this.loadConsentProvisionsPurposes();
            // this.consent = Object.assign({}, this.consent, c);
            // console.log("MERGED");
            // console.log(this.consent);

            this.toastService.showSuccessToast('Consent Loaded', 'Any saved updates will overwrite the existing consent document.');
            console.log("Loading patient...");
            console.log(this.consent);
            const subject_ref = this.consent?.subject?.reference;
            if (subject_ref) {
              if (subject_ref.startsWith('Patient')) {
                let p_id = subject_ref.replace('Patient/', '');
                this.patientService.get(p_id).subscribe({
                  next: p => {
                    this.patientSelected = p;
                    console.log('Loaded patient: ' + p.id);

                  }
                });
              }
            }
            const ref = this.consent?.controller?.forEach(n => {
              console.log("Loading organization...");

              let o_id = n.reference?.replace('Organization/', '');
              this.organizationService.get(o_id!).subscribe({
                next: o => {
                  console.log('Loaded organization: ' + o.id);

                  this.organizationSelected.push(o);
                }
              })
            });

          },
          error: error => {
            this.toastService.showErrorToast('Could Not Load', 'Consent ID ' + c_id + ' could not be loaded. Form put into creation mode instead.');
            this.reset();
          }
        })
      } else {
        this.reset();
      }
    });
  }

  repairConsent(c: Consent) {
    c.controller = c.controller || [];
    c.provision?.forEach(cp => {
      cp.securityLabel = cp.securityLabel || [];
      cp.purpose = cp.purpose || [];
      // cp.actor?.forEach(a => {

      // })
    });
    // this.consent.provision = this.consent.provision || [];
    // this.consent.grantor = this.consent.grantor || [];
    return c;
  }

  save() {
    this.consentService.post(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastService.showSuccessToast('Consent Created', 'Saved as consent id: ' + oo.id);

        this.consent = this.repairConsent(oo);
        // this.consent = Object.assign({}, oo, this.consent);
        this.mode = 'update';
        // console.log('MERGED: ' + JSON.stringify(this.consent, null, "\t"));

      }, error: error => {
        console.log(error);
        console.log(error.error);
        this.toastService.showErrorToast('Consent Creation Failed', 'The server refused to create the consent document.');
      }
    });
  }

  update() {
    this.consentService.put(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastService.showSuccessToast('Consent Updated', 'Updated consent id: ' + oo.id);
        this.mode = 'update';
      },
      error: error => {
        console.log(error);
        console.log(error.error);
        this.toastService.showErrorToast('Consent Update Failed', 'The server refused to update the consent document.');
      }
    });
  }

  template() {
    let c: Consent = {
      resourceType: 'Consent',
      status: 'draft',
      decision: 'deny',
      category: [
        {
          id: uuidv4(),
          text: 'Privacy Consent',
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/consentscope",
              "code": "patient-privacy",
              "display": "Privacy Consent"
            }
          ]
        },
        {
          id: uuidv4(),
          text: 'LOINC Consent Document',
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "59284-6",
              "display": 'Consent Document'
            }
          ]
        }
      ],
      // grantor: [],
      controller: [],
      provision: [this.templateProvision()]
    };
    return c;
  }

  // templateMedicalInformation() {
  //   let medicalInformation = {
  //     violence: true,
  //     genetics: true,
  //     behavioralHealth: true,
  //     sexualAndReproductive: true,
  //     substanceUse: false
  //   };
  //   return this.medicalInformation;
  // }

  reset() {
    this.consent = this.template();
    this.mode = 'create';
    this.removeSubject();
    this.organizationList = null;
    this.organizationSelected = [];
    this.medicalInformation = this.loadConsentProvisionsMedicalInformation();
    this.purpose = this.loadConsentProvisionsPurposes();
    // this.toastService.showSuccessToast("Form Reset", "Go for it!");
    console.log('Reset complete.');
  }

  addPeriod() {
    // if (this.consent.provision) {
    // const now = new Date();
    // const today_str = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDay();
    const tomorrow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    tomorrow.toDateString()
    const tomorrow_str = tomorrow.getFullYear() + '-' + tomorrow.getMonth() + '-' + tomorrow.getDay();
    this.consent.period = { start: new Date().toISOString().split('T')[0], end: tomorrow.toISOString().split('T')[0] };

    // }
  }

  removePeriod() {
    delete this.consent.period;
  }

  pickPeriodStart() {
    // let el = document.querySelector('input[name="consent_provision_period_start"]');
    // if (el) {
    //   console.log("Creating period start date picker...");
    //   const datepicker = new Datepicker(el as HTMLElement, {
    //     format: 'yyyy-mm-dd',
    //     autohide: true,
    //     todayButton: true,
      
    //   });
    //   datepicker.show();
    //   datepicker.
    // } else {
    //   console.log("Period start input field not found.");
    // }
  }

  pickPeriodEnd() {
    // let el = document.querySelector('input[name="consent_provision_period_end"]');
    // if (el) {
    //   console.log("Creating period end date picker...");
    //   const datepicker = new Datepicker(el as HTMLElement, {
    //     format: 'yyyy-mm-dd',
    //     autohide: true,
    //     todayButton: true,
    //   });
    //   datepicker.show();
    // } else {
    //   console.log("Period end input field not found.");
    // }
  }

  patientSearch(text: string) {
    this.patientSearching = true;
    this.patientService.search(this.patientSearchText).subscribe(b => {
      this.patientList = b;
      this.patientSearching = false;
    });
  }

  // addPatientSubject() {

  // }

  selectPatientSubject(p: Patient) {
    this.patientSelected = p;
    this.consent.subject = { reference: 'Patient/' + p.id, type: 'Patient' };
  }

  removeSubject() {
    this.consent.subject = undefined;
    this.patientSelected = null;
    this.patientSearchText = '';
  }

  organizationSearch(text: string) {
    this.organizationSearching = true;
    this.organizationService.search(this.organizationSearchText).subscribe(b => {
      this.organizationList = b;
      this.organizationSearching = false;
    });
  }

  selectOrganization(o: Organization) {
    this.organizationSelected.push(o);
    this.consent.controller?.push({ type: 'Organization', reference: 'Organization/' + o.id });
  }

  removeOrganization(org: Organization) {
    if (this.consent.controller !== undefined) {
      for (let i = 0; i < this.consent.controller.length; i++) {
        if ('Organization/' + org.id == this.consent.controller[i].reference) {
          this.consent.controller.splice(i, 1);
        }
      }
      for (let i = 0; i < this.organizationSelected.length; i++) {
        if (org.id == this.organizationSelected[i].id) {
          this.organizationSelected.splice(i, 1);
        }
      }
    }
  }

  organizationForReference(ref: string): Organization | null {
    let org = null;
    this.organizationSelected.forEach(o => {
      if ('Organization/' + o.id == ref) {
        org = o;
      }
    });
    return org;
  }

  isSelectedOrganization(o: Organization): boolean {
    let selected = false;
    this.organizationSelected.forEach(n => {
      if (n.id == o.id) {
        selected = true;
      }
    });
    return selected;
  }

  prettyConsentJson() {
    return JSON.stringify(this.consent, null, "\t");
  }

  downloadConsentJsonFile() {
    // this.toastrService.success("JSON download started...", 'Downloading Document');
    // let doc = new YAML.Document(r);
    // console.log(doc.toString());

    // Download mechanism via: https://blog.logrocket.com/programmatic-file-downloads-in-the-browser-9a5186298d5c/
    const blob = new Blob([this.prettyConsentJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consent.json';
    a.click();
  }

  // medicalInformationEnabledFor(provision_id: string, category: string) {
  //   let enabled = false;
  //   // keyof type this.be
  //   this.medicalInformation[provision_id].forEach(n => {
  //     if (n.category == category) {
  //       enabled = n.enabled;
  //     }
  //   })
  //   return enabled;
  // }

  updateMedicalInformation(cp: ConsentProvision) {

    if (cp.id && cp.securityLabel) {
      Object.entries(this.medicalInformation[cp.id]).forEach(([k, n]) => {
        console.log('CLICK ' + k);
        // let n = Object.v this.medicalInformation[cp.id!];

        if (n.enabled) {
          let found = false;
          cp.securityLabel!.forEach(sl => {
            if (n.act_code == sl.code) {
              found = true;
            }
          });
          if (!found) {
            console.log("ENABLING " + n.act_code);
            cp.securityLabel!.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
          }
        } else { // disabled
          let foundAt = -1;
          for (let i = 0; i < cp.securityLabel!.length; i++) {
            if (n.act_code == cp.securityLabel![i].code) {
              foundAt = i;
            }
            if (foundAt >= 0) {
              console.log("DISABLED " + n.act_code);
              cp.securityLabel?.splice(foundAt, 1);
            }
          }
        }
      });
    }
    console.log(this.consent);

  }

  updatePurpose(cp: ConsentProvision) {
    if (!cp.purpose) {
      cp.purpose = [];
    }
    if (cp.id && cp.purpose) {
      Object.entries(this.purpose[cp.id]).forEach(([k, n]) => {
        if (n.enabled) {
          let found = false;
          cp.purpose?.forEach(pur => {
            // console.log("DEBUG" +pur.code);
            if (n.act_code == pur.code) {
              found = true;
            }
          });
          if (!found) {
            console.log("ENABLING " + n.act_code);
            cp.purpose?.push({ code: n.act_code, system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', display: n.act_code });
          }
        } else { // disabled
          let foundAt = -1;
          for (let i = 0; i < cp.purpose!.length; i++) {
            if (n.act_code == cp.purpose![i].code) {
              foundAt = i;
            }
            if (foundAt >= 0) {
              console.log("DISABLED " + n.act_code);
              cp.purpose?.splice(foundAt, 1);
            }
          }
        }
      });
    }
  }

  createCategory() {
    this.consent.category?.push({ id: uuidv4() });
  }

  deleteCategory(cc: CodeableConcept) {
    if (this.consent.category) {
      for (let i = 0; i < this.consent.category?.length; i++) {
        if (this.consent.category[i].id === cc.id) {
          this.consent.category.splice(i, 1);
        }
      }
    }
  }

  templateProvision(): ConsentProvision {
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

  addProvision() {
    this.consent.provision?.push(this.templateProvision());
    this.loadConsentProvisionsMedicalInformation();
    this.loadConsentProvisionsPurposes();
  }

  removeProvision(cp: ConsentProvision) {
    if (this.consent.provision) {
      let at = -1;
      for (let i = 0; i < this.consent.provision.length; i++) {
        if (this.consent.provision[i].id == cp.id) {
          at = i;
          break;
        }
      }
      if (at >= 0) {
        this.consent.provision.splice(at, 1);
      }
    }
    this.loadConsentProvisionsMedicalInformation();
    this.loadConsentProvisionsPurposes();
  }

}
