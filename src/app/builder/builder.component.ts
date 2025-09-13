// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient, Identifier, Reference, Attachment, ConsentVerification, ConsentPolicyBasis, Narrative } from 'fhir/r5';

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
    this.initializeNewProperties();
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

  // Initialize text narrative if not present
  initializeText() {
    if (!this.consent.text) {
      this.consent.text = { div: '', status: 'generated' };
    }
  }

  // Identifier management
  addIdentifier() {
    if (!this.consent.identifier) {
      this.consent.identifier = [];
    }
    this.consent.identifier.push({
      use: 'usual',
      type: { coding: [{ code: 'MR', system: 'http://terminology.hl7.org/CodeSystem/v2-0203' }] },
      value: ''
    });
  }

  removeIdentifier(index: number) {
    if (this.consent.identifier) {
      this.consent.identifier.splice(index, 1);
    }
  }

  // Grantee management
  addGrantee() {
    if (!this.consent.grantee) {
      this.consent.grantee = [];
    }
    this.consent.grantee.push({ reference: '', type: 'Patient' });
  }

  removeGrantee(index: number) {
    if (this.consent.grantee) {
      this.consent.grantee.splice(index, 1);
    }
  }

  // Grantor management
  addGrantor() {
    if (!this.consent.grantor) {
      this.consent.grantor = [];
    }
    this.consent.grantor.push({ reference: '', type: 'Patient' });
  }

  removeGrantor(index: number) {
    if (this.consent.grantor) {
      this.consent.grantor.splice(index, 1);
    }
  }

  // Manager management
  addManager() {
    if (!this.consent.manager) {
      this.consent.manager = [];
    }
    this.consent.manager.push({ reference: '', type: 'Organization' });
  }

  removeManager(index: number) {
    if (this.consent.manager) {
      this.consent.manager.splice(index, 1);
    }
  }

  // Policy text management
  addPolicyText() {
    if (!this.consent.policyText) {
      this.consent.policyText = [];
    }
    this.consent.policyText.push({ reference: '', type: 'DocumentReference' });
  }

  removePolicyText(index: number) {
    if (this.consent.policyText) {
      this.consent.policyText.splice(index, 1);
    }
  }

  // Source attachment management
  addSourceAttachment() {
    if (!this.consent.sourceAttachment) {
      this.consent.sourceAttachment = [];
    }
    this.consent.sourceAttachment.push({
      contentType: 'application/pdf',
      language: 'en-US',
      url: ''
    });
  }

  removeSourceAttachment(index: number) {
    if (this.consent.sourceAttachment) {
      this.consent.sourceAttachment.splice(index, 1);
    }
  }

  // Source reference management
  addSourceReference() {
    if (!this.consent.sourceReference) {
      this.consent.sourceReference = [];
    }
    this.consent.sourceReference.push({ reference: '', type: 'Consent' });
  }

  removeSourceReference(index: number) {
    if (this.consent.sourceReference) {
      this.consent.sourceReference.splice(index, 1);
    }
  }

  // Regulatory basis management
  addRegulatoryBasis() {
    if (!this.consent.regulatoryBasis) {
      this.consent.regulatoryBasis = [];
    }
    this.consent.regulatoryBasis.push({
      coding: [{
        system: 'http://example.com/codes',
        code: '',
        display: ''
      }]
    });
  }

  removeRegulatoryBasis(index: number) {
    if (this.consent.regulatoryBasis) {
      this.consent.regulatoryBasis.splice(index, 1);
    }
  }

  // Verification management
  addVerification() {
    if (!this.consent.verification) {
      this.consent.verification = [];
    }
    this.consent.verification.push({
      verified: false,
      verificationDate: [],
      verificationType: { coding: [{ code: 'VERIFIED' }] }
    });
  }

  removeVerification(index: number) {
    if (this.consent.verification) {
      this.consent.verification.splice(index, 1);
    }
  }

  // Initialize policy basis if not present
  initializePolicyBasis() {
    if (!this.consent.policyBasis) {
      this.consent.policyBasis = { url: '', reference: { reference: '' } };
    }
  }

  // Helper method to ensure arrays are initialized
  ensureArrayInitialized(property: keyof Consent) {
    if (!this.consent[property]) {
      (this.consent as any)[property] = [];
    }
  }

  // Initialize all new properties when resetting
  initializeNewProperties() {
    this.initializeText();
    this.initializePolicyBasis();
  }

  // Getter/setter methods for complex two-way binding
  getTextDiv(): string {
    return this.consent.text?.div || '';
  }

  setTextDiv(value: string) {
    this.initializeText();
    if (this.consent.text) {
      this.consent.text.div = value;
    }
  }

  getIdentifierUse(index: number): string {
    return this.consent.identifier?.[index]?.use || '';
  }

  setIdentifierUse(index: number, value: string) {
    if (this.consent.identifier?.[index]) {
      this.consent.identifier[index].use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getIdentifierTypeCode(index: number): string {
    return this.consent.identifier?.[index]?.type?.coding?.[0]?.code || '';
  }

  setIdentifierTypeCode(index: number, value: string) {
    if (this.consent.identifier?.[index]) {
      if (!this.consent.identifier[index].type) {
        this.consent.identifier[index].type = { coding: [{}] };
      }
      if (!this.consent.identifier[index].type!.coding) {
        this.consent.identifier[index].type!.coding = [{}];
      }
      if (!this.consent.identifier[index].type!.coding[0]) {
        this.consent.identifier[index].type!.coding[0] = {};
      }
      this.consent.identifier[index].type!.coding[0].code = value;
    }
  }

  getPolicyBasisUrl(): string {
    return this.consent.policyBasis?.url || '';
  }

  setPolicyBasisUrl(value: string) {
    this.initializePolicyBasis();
    if (this.consent.policyBasis) {
      this.consent.policyBasis.url = value;
    }
  }

  getPolicyBasisReference(): string {
    return this.consent.policyBasis?.reference?.reference || '';
  }

  setPolicyBasisReference(value: string) {
    this.initializePolicyBasis();
    if (this.consent.policyBasis) {
      if (!this.consent.policyBasis.reference) {
        this.consent.policyBasis.reference = { reference: '' };
      }
      this.consent.policyBasis.reference.reference = value;
    }
  }

  getRegulatoryBasisSystem(index: number): string {
    return this.consent.regulatoryBasis?.[index]?.coding?.[0]?.system || '';
  }

  setRegulatoryBasisSystem(index: number, value: string) {
    if (this.consent.regulatoryBasis?.[index]) {
      if (!this.consent.regulatoryBasis[index].coding) {
        this.consent.regulatoryBasis[index].coding = [{}];
      }
      if (!this.consent.regulatoryBasis[index].coding[0]) {
        this.consent.regulatoryBasis[index].coding[0] = {};
      }
      this.consent.regulatoryBasis[index].coding[0].system = value;
    }
  }

  getRegulatoryBasisCode(index: number): string {
    return this.consent.regulatoryBasis?.[index]?.coding?.[0]?.code || '';
  }

  setRegulatoryBasisCode(index: number, value: string) {
    if (this.consent.regulatoryBasis?.[index]) {
      if (!this.consent.regulatoryBasis[index].coding) {
        this.consent.regulatoryBasis[index].coding = [{}];
      }
      if (!this.consent.regulatoryBasis[index].coding[0]) {
        this.consent.regulatoryBasis[index].coding[0] = {};
      }
      this.consent.regulatoryBasis[index].coding[0].code = value;
    }
  }

  getRegulatoryBasisDisplay(index: number): string {
    return this.consent.regulatoryBasis?.[index]?.coding?.[0]?.display || '';
  }

  setRegulatoryBasisDisplay(index: number, value: string) {
    if (this.consent.regulatoryBasis?.[index]) {
      if (!this.consent.regulatoryBasis[index].coding) {
        this.consent.regulatoryBasis[index].coding = [{}];
      }
      if (!this.consent.regulatoryBasis[index].coding[0]) {
        this.consent.regulatoryBasis[index].coding[0] = {};
      }
      this.consent.regulatoryBasis[index].coding[0].display = value;
    }
  }

  getVerificationVerifiedBy(index: number): string {
    return this.consent.verification?.[index]?.verifiedBy?.reference || '';
  }

  setVerificationVerifiedBy(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedBy) {
        this.consent.verification[index].verifiedBy = { reference: '' };
      }
      this.consent.verification[index].verifiedBy!.reference = value;
    }
  }

  getVerificationVerifiedWith(index: number): string {
    return this.consent.verification?.[index]?.verifiedWith?.reference || '';
  }

  setVerificationVerifiedWith(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedWith) {
        this.consent.verification[index].verifiedWith = { reference: '' };
      }
      this.consent.verification[index].verifiedWith!.reference = value;
    }
  }

  getVerificationDate(index: number): string {
    return this.consent.verification?.[index]?.verificationDate?.[0] || '';
  }

  setVerificationDate(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verificationDate) {
        this.consent.verification[index].verificationDate = [];
      }
      this.consent.verification[index].verificationDate[0] = value;
    }
  }

  getVerificationTypeCode(index: number): string {
    return this.consent.verification?.[index]?.verificationType?.coding?.[0]?.code || '';
  }

  setVerificationTypeCode(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verificationType) {
        this.consent.verification[index].verificationType = { coding: [{}] };
      }
      if (!this.consent.verification[index].verificationType!.coding) {
        this.consent.verification[index].verificationType!.coding = [{}];
      }
      if (!this.consent.verification[index].verificationType!.coding[0]) {
        this.consent.verification[index].verificationType!.coding[0] = {};
      }
      this.consent.verification[index].verificationType!.coding[0].code = value;
    }
  }

  // Grantee identifier methods
  getGranteeIdentifierUse(index: number): string {
    return this.consent.grantee?.[index]?.identifier?.use || '';
  }

  setGranteeIdentifierUse(index: number, value: string) {
    if (this.consent.grantee?.[index]) {
      if (!this.consent.grantee[index].identifier) {
        this.consent.grantee[index].identifier = { use: 'usual' };
      }
      this.consent.grantee[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getGranteeIdentifierTypeCode(index: number): string {
    return this.consent.grantee?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  setGranteeIdentifierTypeCode(index: number, value: string) {
    if (this.consent.grantee?.[index]) {
      if (!this.consent.grantee[index].identifier) {
        this.consent.grantee[index].identifier = { use: 'usual' };
      }
      if (!this.consent.grantee[index].identifier!.type) {
        this.consent.grantee[index].identifier!.type = { coding: [{}] };
      }
      if (!this.consent.grantee[index].identifier!.type!.coding) {
        this.consent.grantee[index].identifier!.type!.coding = [{}];
      }
      if (!this.consent.grantee[index].identifier!.type!.coding[0]) {
        this.consent.grantee[index].identifier!.type!.coding[0] = {};
      }
      this.consent.grantee[index].identifier!.type!.coding[0].code = value;
    }
  }

  getGranteeIdentifierValue(index: number): string {
    return this.consent.grantee?.[index]?.identifier?.value || '';
  }

  setGranteeIdentifierValue(index: number, value: string) {
    if (this.consent.grantee?.[index]) {
      if (!this.consent.grantee[index].identifier) {
        this.consent.grantee[index].identifier = { use: 'usual' };
      }
      this.consent.grantee[index].identifier!.value = value;
    }
  }

  // Grantor identifier methods
  getGrantorIdentifierUse(index: number): string {
    return this.consent.grantor?.[index]?.identifier?.use || '';
  }

  setGrantorIdentifierUse(index: number, value: string) {
    if (this.consent.grantor?.[index]) {
      if (!this.consent.grantor[index].identifier) {
        this.consent.grantor[index].identifier = { use: 'usual' };
      }
      this.consent.grantor[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getGrantorIdentifierTypeCode(index: number): string {
    return this.consent.grantor?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  setGrantorIdentifierTypeCode(index: number, value: string) {
    if (this.consent.grantor?.[index]) {
      if (!this.consent.grantor[index].identifier) {
        this.consent.grantor[index].identifier = { use: 'usual' };
      }
      if (!this.consent.grantor[index].identifier!.type) {
        this.consent.grantor[index].identifier!.type = { coding: [{}] };
      }
      if (!this.consent.grantor[index].identifier!.type!.coding) {
        this.consent.grantor[index].identifier!.type!.coding = [{}];
      }
      if (!this.consent.grantor[index].identifier!.type!.coding[0]) {
        this.consent.grantor[index].identifier!.type!.coding[0] = {};
      }
      this.consent.grantor[index].identifier!.type!.coding[0].code = value;
    }
  }

  getGrantorIdentifierValue(index: number): string {
    return this.consent.grantor?.[index]?.identifier?.value || '';
  }

  setGrantorIdentifierValue(index: number, value: string) {
    if (this.consent.grantor?.[index]) {
      if (!this.consent.grantor[index].identifier) {
        this.consent.grantor[index].identifier = { use: 'usual' };
      }
      this.consent.grantor[index].identifier!.value = value;
    }
  }

  // Manager identifier methods
  getManagerIdentifierUse(index: number): string {
    return this.consent.manager?.[index]?.identifier?.use || '';
  }

  setManagerIdentifierUse(index: number, value: string) {
    if (this.consent.manager?.[index]) {
      if (!this.consent.manager[index].identifier) {
        this.consent.manager[index].identifier = { use: 'usual' };
      }
      this.consent.manager[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getManagerIdentifierTypeCode(index: number): string {
    return this.consent.manager?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  setManagerIdentifierTypeCode(index: number, value: string) {
    if (this.consent.manager?.[index]) {
      if (!this.consent.manager[index].identifier) {
        this.consent.manager[index].identifier = { use: 'usual' };
      }
      if (!this.consent.manager[index].identifier!.type) {
        this.consent.manager[index].identifier!.type = { coding: [{}] };
      }
      if (!this.consent.manager[index].identifier!.type!.coding) {
        this.consent.manager[index].identifier!.type!.coding = [{}];
      }
      if (!this.consent.manager[index].identifier!.type!.coding[0]) {
        this.consent.manager[index].identifier!.type!.coding[0] = {};
      }
      this.consent.manager[index].identifier!.type!.coding[0].code = value;
    }
  }

  getManagerIdentifierValue(index: number): string {
    return this.consent.manager?.[index]?.identifier?.value || '';
  }

  setManagerIdentifierValue(index: number, value: string) {
    if (this.consent.manager?.[index]) {
      if (!this.consent.manager[index].identifier) {
        this.consent.manager[index].identifier = { use: 'usual' };
      }
      this.consent.manager[index].identifier!.value = value;
    }
  }

  // Policy Text identifier methods
  getPolicyTextIdentifierUse(index: number): string {
    return this.consent.policyText?.[index]?.identifier?.use || '';
  }

  setPolicyTextIdentifierUse(index: number, value: string) {
    if (this.consent.policyText?.[index]) {
      if (!this.consent.policyText[index].identifier) {
        this.consent.policyText[index].identifier = { use: 'usual' };
      }
      this.consent.policyText[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getPolicyTextIdentifierTypeCode(index: number): string {
    return this.consent.policyText?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  setPolicyTextIdentifierTypeCode(index: number, value: string) {
    if (this.consent.policyText?.[index]) {
      if (!this.consent.policyText[index].identifier) {
        this.consent.policyText[index].identifier = { use: 'usual' };
      }
      if (!this.consent.policyText[index].identifier!.type) {
        this.consent.policyText[index].identifier!.type = { coding: [{}] };
      }
      if (!this.consent.policyText[index].identifier!.type!.coding) {
        this.consent.policyText[index].identifier!.type!.coding = [{}];
      }
      if (!this.consent.policyText[index].identifier!.type!.coding[0]) {
        this.consent.policyText[index].identifier!.type!.coding[0] = {};
      }
      this.consent.policyText[index].identifier!.type!.coding[0].code = value;
    }
  }

  getPolicyTextIdentifierValue(index: number): string {
    return this.consent.policyText?.[index]?.identifier?.value || '';
  }

  setPolicyTextIdentifierValue(index: number, value: string) {
    if (this.consent.policyText?.[index]) {
      if (!this.consent.policyText[index].identifier) {
        this.consent.policyText[index].identifier = { use: 'usual' };
      }
      this.consent.policyText[index].identifier!.value = value;
    }
  }

  // Source Reference identifier methods
  getSourceReferenceIdentifierUse(index: number): string {
    return this.consent.sourceReference?.[index]?.identifier?.use || '';
  }

  setSourceReferenceIdentifierUse(index: number, value: string) {
    if (this.consent.sourceReference?.[index]) {
      if (!this.consent.sourceReference[index].identifier) {
        this.consent.sourceReference[index].identifier = { use: 'usual' };
      }
      this.consent.sourceReference[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getSourceReferenceIdentifierTypeCode(index: number): string {
    return this.consent.sourceReference?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  setSourceReferenceIdentifierTypeCode(index: number, value: string) {
    if (this.consent.sourceReference?.[index]) {
      if (!this.consent.sourceReference[index].identifier) {
        this.consent.sourceReference[index].identifier = { use: 'usual' };
      }
      if (!this.consent.sourceReference[index].identifier!.type) {
        this.consent.sourceReference[index].identifier!.type = { coding: [{}] };
      }
      if (!this.consent.sourceReference[index].identifier!.type!.coding) {
        this.consent.sourceReference[index].identifier!.type!.coding = [{}];
      }
      if (!this.consent.sourceReference[index].identifier!.type!.coding[0]) {
        this.consent.sourceReference[index].identifier!.type!.coding[0] = {};
      }
      this.consent.sourceReference[index].identifier!.type!.coding[0].code = value;
    }
  }

  getSourceReferenceIdentifierValue(index: number): string {
    return this.consent.sourceReference?.[index]?.identifier?.value || '';
  }

  setSourceReferenceIdentifierValue(index: number, value: string) {
    if (this.consent.sourceReference?.[index]) {
      if (!this.consent.sourceReference[index].identifier) {
        this.consent.sourceReference[index].identifier = { use: 'usual' };
      }
      this.consent.sourceReference[index].identifier!.value = value;
    }
  }

  // Verification identifier methods
  getVerificationVerifiedByIdentifierUse(index: number): string {
    return this.consent.verification?.[index]?.verifiedBy?.identifier?.use || '';
  }

  setVerificationVerifiedByIdentifierUse(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedBy) {
        this.consent.verification[index].verifiedBy = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedBy!.identifier) {
        this.consent.verification[index].verifiedBy!.identifier = { use: 'usual' };
      }
      this.consent.verification[index].verifiedBy!.identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getVerificationVerifiedByIdentifierTypeCode(index: number): string {
    return this.consent.verification?.[index]?.verifiedBy?.identifier?.type?.coding?.[0]?.code || '';
  }

  setVerificationVerifiedByIdentifierTypeCode(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedBy) {
        this.consent.verification[index].verifiedBy = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedBy!.identifier) {
        this.consent.verification[index].verifiedBy!.identifier = { use: 'usual' };
      }
      if (!this.consent.verification[index].verifiedBy!.identifier!.type) {
        this.consent.verification[index].verifiedBy!.identifier!.type = { coding: [{}] };
      }
      if (!this.consent.verification[index].verifiedBy!.identifier!.type!.coding) {
        this.consent.verification[index].verifiedBy!.identifier!.type!.coding = [{}];
      }
      if (!this.consent.verification[index].verifiedBy!.identifier!.type!.coding[0]) {
        this.consent.verification[index].verifiedBy!.identifier!.type!.coding[0] = {};
      }
      this.consent.verification[index].verifiedBy!.identifier!.type!.coding[0].code = value;
    }
  }

  getVerificationVerifiedByIdentifierValue(index: number): string {
    return this.consent.verification?.[index]?.verifiedBy?.identifier?.value || '';
  }

  setVerificationVerifiedByIdentifierValue(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedBy) {
        this.consent.verification[index].verifiedBy = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedBy!.identifier) {
        this.consent.verification[index].verifiedBy!.identifier = { use: 'usual' };
      }
      this.consent.verification[index].verifiedBy!.identifier!.value = value;
    }
  }

  getVerificationVerifiedWithIdentifierUse(index: number): string {
    return this.consent.verification?.[index]?.verifiedWith?.identifier?.use || '';
  }

  setVerificationVerifiedWithIdentifierUse(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedWith) {
        this.consent.verification[index].verifiedWith = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedWith!.identifier) {
        this.consent.verification[index].verifiedWith!.identifier = { use: 'usual' };
      }
      this.consent.verification[index].verifiedWith!.identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  getVerificationVerifiedWithIdentifierTypeCode(index: number): string {
    return this.consent.verification?.[index]?.verifiedWith?.identifier?.type?.coding?.[0]?.code || '';
  }

  setVerificationVerifiedWithIdentifierTypeCode(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedWith) {
        this.consent.verification[index].verifiedWith = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedWith!.identifier) {
        this.consent.verification[index].verifiedWith!.identifier = { use: 'usual' };
      }
      if (!this.consent.verification[index].verifiedWith!.identifier!.type) {
        this.consent.verification[index].verifiedWith!.identifier!.type = { coding: [{}] };
      }
      if (!this.consent.verification[index].verifiedWith!.identifier!.type!.coding) {
        this.consent.verification[index].verifiedWith!.identifier!.type!.coding = [{}];
      }
      if (!this.consent.verification[index].verifiedWith!.identifier!.type!.coding[0]) {
        this.consent.verification[index].verifiedWith!.identifier!.type!.coding[0] = {};
      }
      this.consent.verification[index].verifiedWith!.identifier!.type!.coding[0].code = value;
    }
  }

  getVerificationVerifiedWithIdentifierValue(index: number): string {
    return this.consent.verification?.[index]?.verifiedWith?.identifier?.value || '';
  }

  setVerificationVerifiedWithIdentifierValue(index: number, value: string) {
    if (this.consent.verification?.[index]) {
      if (!this.consent.verification[index].verifiedWith) {
        this.consent.verification[index].verifiedWith = { reference: '' };
      }
      if (!this.consent.verification[index].verifiedWith!.identifier) {
        this.consent.verification[index].verifiedWith!.identifier = { use: 'usual' };
      }
      this.consent.verification[index].verifiedWith!.identifier!.value = value;
    }
  }

  // Utility methods for better user experience
  getArrayLength(property: keyof Consent): number {
    const value = this.consent[property];
    return Array.isArray(value) ? value.length : 0;
  }

  hasArrayItems(property: keyof Consent): boolean {
    return this.getArrayLength(property) > 0;
  }

  // Method to validate required fields
  validateRequiredFields(): string[] {
    const errors: string[] = [];
    
    if (!this.consent.status) {
      errors.push('Status is required');
    }
    
    if (!this.consent.subject) {
      errors.push('Subject is required');
    }
    
    return errors;
  }

  // Method to get a summary of the consent
  getConsentSummary(): string {
    const parts: string[] = [];
    
    if (this.consent.id) {
      parts.push(`ID: ${this.consent.id}`);
    }
    
    if (this.consent.status) {
      parts.push(`Status: ${this.consent.status}`);
    }
    
    if (this.consent.decision) {
      parts.push(`Decision: ${this.consent.decision}`);
    }
    
    if (this.consent.subject?.reference) {
      parts.push(`Subject: ${this.consent.subject.reference}`);
    }
    
    const provisionCount = this.consent.provision?.length || 0;
    parts.push(`Provisions: ${provisionCount}`);
    
    return parts.join(' | ');
  }

  // Method to clear all optional arrays
  clearOptionalArrays() {
    this.consent.identifier = undefined;
    this.consent.grantee = undefined;
    this.consent.grantor = undefined;
    this.consent.manager = undefined;
    this.consent.policyText = undefined;
    this.consent.sourceAttachment = undefined;
    this.consent.sourceReference = undefined;
    this.consent.regulatoryBasis = undefined;
    this.consent.verification = undefined;
  }

  // Method to initialize all arrays as empty
  initializeAllArrays() {
    this.consent.identifier = [];
    this.consent.grantee = [];
    this.consent.grantor = [];
    this.consent.manager = [];
    this.consent.policyText = [];
    this.consent.sourceAttachment = [];
    this.consent.sourceReference = [];
    this.consent.regulatoryBasis = [];
    this.consent.verification = [];
  }

  // Method to export consent as a clean JSON (removing empty arrays and undefined values)
  exportCleanConsent(): Consent {
    const cleanConsent = { ...this.consent };
    
    // Remove empty arrays
    Object.keys(cleanConsent).forEach(key => {
      const value = (cleanConsent as any)[key];
      if (Array.isArray(value) && value.length === 0) {
        delete (cleanConsent as any)[key];
      }
    });
    
    // Remove undefined values
    Object.keys(cleanConsent).forEach(key => {
      const value = (cleanConsent as any)[key];
      if (value === undefined || value === null || value === '') {
        delete (cleanConsent as any)[key];
      }
    });
    
    return cleanConsent;
  }

}
