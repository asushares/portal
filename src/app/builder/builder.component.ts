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
        this.mode = 'update';

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
  }

  reset() {
    this.consent = ConsentTemplate.templateConsent();
    this.mode = 'create';
    this.removeSubject();
    this.organizationList = null;
    this.organizationSelected = [];
    this.initializeNewProperties();
    console.log('Reset complete.');
  }

  addPeriod() {
    const tomorrow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    this.consent.period = { start: new Date().toISOString().split('T')[0], end: tomorrow.toISOString().split('T')[0] };
  }

  removePeriod() {
    delete this.consent.period;
  }

  pickPeriodStart() {
    // Placeholder for future date picker implementation
  }

  pickPeriodEnd() {
    // Placeholder for future date picker implementation
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
    // Download mechanism via: https://blog.logrocket.com/programmatic-file-downloads-in-the-browser-9a5186298d5c/
    const blob = new Blob([this.prettyConsentJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consent.json';
    a.click();
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

  // Generic array management methods
  private addToArray<T>(array: T[] | undefined, item: T): T[] {
    if (!array) {
      array = [];
    }
    array.push(item);
    return array;
  }

  private removeFromArray<T>(array: T[] | undefined, index: number): void {
    if (array && index >= 0 && index < array.length) {
      array.splice(index, 1);
    }
  }

  // Specific array management methods using generic utilities
  addGrantee() {
    this.consent.grantee = this.addToArray(this.consent.grantee, { reference: '', type: 'Patient' });
  }

  removeGrantee(index: number) {
    this.removeFromArray(this.consent.grantee, index);
  }

  addGrantor() {
    this.consent.grantor = this.addToArray(this.consent.grantor, { reference: '', type: 'Patient' });
  }

  removeGrantor(index: number) {
    this.removeFromArray(this.consent.grantor, index);
  }

  addManager() {
    this.consent.manager = this.addToArray(this.consent.manager, { reference: '', type: 'Organization' });
  }

  removeManager(index: number) {
    this.removeFromArray(this.consent.manager, index);
  }

  addPolicyText() {
    this.consent.policyText = this.addToArray(this.consent.policyText, { reference: '', type: 'DocumentReference' });
  }

  removePolicyText(index: number) {
    this.removeFromArray(this.consent.policyText, index);
  }

  addSourceAttachment() {
    this.consent.sourceAttachment = this.addToArray(this.consent.sourceAttachment, {
      contentType: 'application/pdf',
      language: 'en-US',
      url: ''
    });
  }

  removeSourceAttachment(index: number) {
    this.removeFromArray(this.consent.sourceAttachment, index);
  }

  addSourceReference() {
    this.consent.sourceReference = this.addToArray(this.consent.sourceReference, { reference: '', type: 'Consent' });
  }

  removeSourceReference(index: number) {
    this.removeFromArray(this.consent.sourceReference, index);
  }

  addRegulatoryBasis() {
    this.consent.regulatoryBasis = this.addToArray(this.consent.regulatoryBasis, {
      coding: [{
        system: 'http://example.com/codes',
        code: '',
        display: ''
      }]
    });
  }

  removeRegulatoryBasis(index: number) {
    this.removeFromArray(this.consent.regulatoryBasis, index);
  }

  addVerification() {
    this.consent.verification = this.addToArray(this.consent.verification, {
      verified: false,
      verificationDate: [],
      verificationType: { coding: [{ code: 'VERIFIED' }] }
    });
  }

  removeVerification(index: number) {
    this.removeFromArray(this.consent.verification, index);
  }

  // Initialize policy basis if not present
  initializePolicyBasis() {
    if (!this.consent.policyBasis) {
      this.consent.policyBasis = { url: '', reference: { reference: '' } };
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
    return this.getArrayIdentifierUse(this.consent.identifier || [], index);
  }

  setIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.identifier || [], index, value);
  }

  getIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.identifier || [], index);
  }

  setIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.identifier || [], index, value);
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

  // Generic coding getter/setter methods
  private getCodingValue(array: any[], index: number, property: string, nestedProperty?: string): string {
    if (nestedProperty) {
      return array?.[index]?.[property]?.coding?.[0]?.[nestedProperty] || '';
    }
    return array?.[index]?.coding?.[0]?.[property] || '';
  }

  private setCodingValue(array: any[], index: number, property: string, value: string, nestedProperty?: string) {
    if (array?.[index]) {
      if (nestedProperty) {
        if (!array[index][property]) {
          array[index][property] = { coding: [{}] };
        }
        if (!array[index][property].coding) {
          array[index][property].coding = [{}];
        }
        if (!array[index][property].coding[0]) {
          array[index][property].coding[0] = {};
        }
        array[index][property].coding[0][nestedProperty] = value;
      } else {
        if (!array[index].coding) {
          array[index].coding = [{}];
        }
        if (!array[index].coding[0]) {
          array[index].coding[0] = {};
        }
        array[index].coding[0][property] = value;
      }
    }
  }

  getRegulatoryBasisSystem(index: number): string {
    return this.getCodingValue(this.consent.regulatoryBasis || [], index, 'system');
  }

  setRegulatoryBasisSystem(index: number, value: string) {
    this.setCodingValue(this.consent.regulatoryBasis || [], index, 'system', value);
  }

  getRegulatoryBasisCode(index: number): string {
    return this.getCodingValue(this.consent.regulatoryBasis || [], index, 'code');
  }

  setRegulatoryBasisCode(index: number, value: string) {
    this.setCodingValue(this.consent.regulatoryBasis || [], index, 'code', value);
  }

  getRegulatoryBasisDisplay(index: number): string {
    return this.getCodingValue(this.consent.regulatoryBasis || [], index, 'display');
  }

  setRegulatoryBasisDisplay(index: number, value: string) {
    this.setCodingValue(this.consent.regulatoryBasis || [], index, 'display', value);
  }

  // Generic reference getter/setter methods
  private getReferenceValue(array: any[], index: number, property: string): string {
    return array?.[index]?.[property]?.reference || '';
  }

  private setReferenceValue(array: any[], index: number, property: string, value: string) {
    if (array?.[index]) {
      if (!array[index][property]) {
        array[index][property] = { reference: '' };
      }
      array[index][property].reference = value;
    }
  }

  getVerificationVerifiedBy(index: number): string {
    return this.getReferenceValue(this.consent.verification || [], index, 'verifiedBy');
  }

  setVerificationVerifiedBy(index: number, value: string) {
    this.setReferenceValue(this.consent.verification || [], index, 'verifiedBy', value);
  }

  getVerificationVerifiedWith(index: number): string {
    return this.getReferenceValue(this.consent.verification || [], index, 'verifiedWith');
  }

  setVerificationVerifiedWith(index: number, value: string) {
    this.setReferenceValue(this.consent.verification || [], index, 'verifiedWith', value);
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
    return this.getCodingValue(this.consent.verification || [], index, 'verificationType', 'code');
  }

  setVerificationTypeCode(index: number, value: string) {
    this.setCodingValue(this.consent.verification || [], index, 'verificationType', value, 'code');
  }

  // Generic identifier utility methods
  private getArrayIdentifierUse(array: any[], index: number): string {
    return array?.[index]?.identifier?.use || '';
  }

  private setArrayIdentifierUse(array: any[], index: number, value: string) {
    if (array?.[index]) {
      if (!array[index].identifier) {
        array[index].identifier = { use: 'usual' };
      }
      array[index].identifier!.use = value as "usual" | "official" | "temp" | "secondary" | "old";
    }
  }

  private getArrayIdentifierTypeCode(array: any[], index: number): string {
    return array?.[index]?.identifier?.type?.coding?.[0]?.code || '';
  }

  private setArrayIdentifierTypeCode(array: any[], index: number, value: string) {
    if (array?.[index]) {
      if (!array[index].identifier) {
        array[index].identifier = { use: 'usual' };
      }
      if (!array[index].identifier!.type) {
        array[index].identifier!.type = { coding: [{}] };
      }
      if (!array[index].identifier!.type!.coding) {
        array[index].identifier!.type!.coding = [{}];
      }
      if (!array[index].identifier!.type!.coding[0]) {
        array[index].identifier!.type!.coding[0] = {};
      }
      array[index].identifier!.type!.coding[0].code = value;
    }
  }

  private getArrayIdentifierValue(array: any[], index: number): string {
    return array?.[index]?.identifier?.value || '';
  }

  private setArrayIdentifierValue(array: any[], index: number, value: string) {
    if (array?.[index]) {
      if (!array[index].identifier) {
        array[index].identifier = { use: 'usual' };
      }
      array[index].identifier!.value = value;
    }
  }

  // Specific identifier methods using generic utilities
  getGranteeIdentifierUse(index: number): string {
    return this.getArrayIdentifierUse(this.consent.grantee || [], index);
  }

  setGranteeIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.grantee || [], index, value);
  }

  getGranteeIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.grantee || [], index);
  }

  setGranteeIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.grantee || [], index, value);
  }

  getGranteeIdentifierValue(index: number): string {
    return this.getArrayIdentifierValue(this.consent.grantee || [], index);
  }

  setGranteeIdentifierValue(index: number, value: string) {
    this.setArrayIdentifierValue(this.consent.grantee || [], index, value);
  }

  getGrantorIdentifierUse(index: number): string {
    return this.getArrayIdentifierUse(this.consent.grantor || [], index);
  }

  setGrantorIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.grantor || [], index, value);
  }

  getGrantorIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.grantor || [], index);
  }

  setGrantorIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.grantor || [], index, value);
  }

  getGrantorIdentifierValue(index: number): string {
    return this.getArrayIdentifierValue(this.consent.grantor || [], index);
  }

  setGrantorIdentifierValue(index: number, value: string) {
    this.setArrayIdentifierValue(this.consent.grantor || [], index, value);
  }

  getManagerIdentifierUse(index: number): string {
    return this.getArrayIdentifierUse(this.consent.manager || [], index);
  }

  setManagerIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.manager || [], index, value);
  }

  getManagerIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.manager || [], index);
  }

  setManagerIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.manager || [], index, value);
  }

  getManagerIdentifierValue(index: number): string {
    return this.getArrayIdentifierValue(this.consent.manager || [], index);
  }

  setManagerIdentifierValue(index: number, value: string) {
    this.setArrayIdentifierValue(this.consent.manager || [], index, value);
  }

  getPolicyTextIdentifierUse(index: number): string {
    return this.getArrayIdentifierUse(this.consent.policyText || [], index);
  }

  setPolicyTextIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.policyText || [], index, value);
  }

  getPolicyTextIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.policyText || [], index);
  }

  setPolicyTextIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.policyText || [], index, value);
  }

  getPolicyTextIdentifierValue(index: number): string {
    return this.getArrayIdentifierValue(this.consent.policyText || [], index);
  }

  setPolicyTextIdentifierValue(index: number, value: string) {
    this.setArrayIdentifierValue(this.consent.policyText || [], index, value);
  }

  getSourceReferenceIdentifierUse(index: number): string {
    return this.getArrayIdentifierUse(this.consent.sourceReference || [], index);
  }

  setSourceReferenceIdentifierUse(index: number, value: string) {
    this.setArrayIdentifierUse(this.consent.sourceReference || [], index, value);
  }

  getSourceReferenceIdentifierTypeCode(index: number): string {
    return this.getArrayIdentifierTypeCode(this.consent.sourceReference || [], index);
  }

  setSourceReferenceIdentifierTypeCode(index: number, value: string) {
    this.setArrayIdentifierTypeCode(this.consent.sourceReference || [], index, value);
  }

  getSourceReferenceIdentifierValue(index: number): string {
    return this.getArrayIdentifierValue(this.consent.sourceReference || [], index);
  }

  setSourceReferenceIdentifierValue(index: number, value: string) {
    this.setArrayIdentifierValue(this.consent.sourceReference || [], index, value);
  }

  // Verification identifier methods (special case due to nested structure)
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
