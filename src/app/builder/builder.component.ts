// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../organization.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PatientService } from '../patient.service';
import { ConsentTemplate } from '@asushares/core';
import { ConsentBasedComponent } from '../consent/consent-based.component';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvisionComponent } from '../provision/provision.component';
import { CodeableConceptComponent } from '../codeable-concept/codeable-concept.component';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss'],
  imports: [NgIf, FormsModule, NgFor, ProvisionComponent, CodeableConceptComponent, Highlight, HighlightLineNumbers, RouterModule]
})
export class BuilderComponent extends ConsentBasedComponent implements OnInit {

  mode: 'create' | 'update' = 'create';

  patientSearchText = '';
  patientList: Bundle<Patient> | null = null;
  patientSearching: boolean = false;

  organizationSearchText = '';
  organizationList: Bundle<Organization> | null = null;
  organizationSearching: boolean = false;

  loadConsentFailed(c_id: string) {
    this.toastrService.error('Consent ID ' + c_id + ' could not be loaded. Form put into creation mode instead.', 'Could Not Load');
    this.reset();
  }

  loadConsentSucceeded(consent: Consent) {
    this.toastrService.success('Any saved updates will overwrite the existing consent document.', 'Consent Loaded');
  }

  constructor(public override route: ActivatedRoute,
    protected override organizationService: OrganizationService,
    protected override patientService: PatientService,
    protected override consentService: ConsentService,
    protected toastrService: ToastrService) {
    super(route, organizationService, patientService, consentService);

  }
  ngOnInit() {
    this.route.paramMap.subscribe(pm => {
      let c_id = pm.get('consent_id')!;
      if (c_id) {
        this.mode = 'update';
        this.loadConsent(c_id);
      } else {
        this.reset();
      }
    });
  }


  save() {
    this.consentService.post(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastrService.success('Saved as consent id: ' + oo.id, 'Consent Created');

        this.consent = this.repairConsent(oo);
        // this.consent = Object.assign({}, oo, this.consent);
        this.mode = 'update';
        // console.log('MERGED: ' + JSON.stringify(this.consent, null, "\t"));

      }, error: error => {
        console.log(error);
        console.log(error.error);
        this.toastrService.error('The server refused to create the consent document.', 'Consent Creation Failed');
      }
    });
  }

  update() {
    this.consentService.put(this.consent).subscribe({
      next: oo => {
        console.log(oo);
        this.toastrService.success('Updated consent id: ' + oo.id, 'Consent Updated');
        this.mode = 'update';
      },
      error: error => {
        console.log(error);
        console.log(error.error);
        this.toastrService.error('The server refused to update the consent document.', 'Consent Update Failed');
      }
    });
  }

  addProvision() {
    this.consent.provision?.push(ConsentTemplate.templateProvision());
    // this.loadConsentProvisionsMedicalInformation();
    // this.loadConsentProvisionsPurposes();
  }

  removeProvision(cp: ConsentProvision) {
    if (this.consent?.provision) {
      let at = -1;
      for (let i = 0; i < this.consent?.provision.length; i++) {
        if (this.consent?.provision[i].id == cp.id) {
          at = i;
          break;
        }
      }
      if (at >= 0) {
        this.consent.provision.splice(at, 1);
      }
    }
    // this.loadMedicalInformation();
    // this.loadPurposes();
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
    this.consent = ConsentTemplate.templateConsent();
    this.mode = 'create';
    this.removeSubject();
    this.organizationList = null;
    this.organizationSelected = [];
    // this.medicalInformation = this.loadConsentProvisionsMedicalInformation();
    // this.purpose = this.loadConsentProvisionsPurposes();
    // this.toastrService.success("Go for it!", "Form Reset");
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


}
