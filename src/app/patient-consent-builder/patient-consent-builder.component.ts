// Author: Abhishek Dhadwal

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Bundle, Consent, Patient, Organization } from 'fhir/r5';
import { ConsentCategorySettings } from '@asushares/core';
import { v4 as uuidv4 } from 'uuid';
import { PatientService } from '../patient.service';
import { ConsentService } from '../consent/consent.service';
import { OrganizationService } from '../organization.service';
// no advanced provision component; patient flow uses per-category resource toggles

type CategoryKey = 'Demographics' | 'Diagnoses' | 'Disabilities' | 'Genetics' | 'InfectiousDiseases' | 'Medications' | 'MentalHealth' | 'SexualAndReproductiveHealth' | 'SocialDeterminantsOfHealth' | 'SubstanceUse' | 'Violence';

@Component({
  selector: 'app-patient-consent-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container my-4">
      <div *ngIf="saveAlertVisible" class="alert alert-success alert-dismissible fade show position-fixed" style="top: 1rem; right: 1rem; z-index: 1080; min-width: 260px;" role="alert">
        consent saved successfully
        <button type="button" class="btn-close" aria-label="Close" (click)="dismissSaveAlert()"></button>
      </div>
      <div class="d-flex align-items-center mb-3">
        <h1 class="h4 mb-0">Build consent</h1>
        <a class="btn btn-link ms-auto" [routerLink]="['/portal', patientId]">Back to overview</a>
      </div>

      <nav class="mb-3">
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn" [class.btn-primary]="step==='sensitivities'" [class.btn-outline-primary]="step!=='sensitivities'" (click)="step='sensitivities'">Sensitivities</button>
          <!-- <button class="btn" [class.btn-primary]="step==='categoryResources'" [class.btn-outline-primary]="step!=='categoryResources'" (click)="startCategorySequencing()">resources</button> -->
          
          <button class="btn" [class.btn-primary]="step==='recipients'" [class.btn-outline-primary]="step!=='recipients'" (click)="step='recipients'">Recipients</button>
          <button class="btn" [class.btn-primary]="step==='purposes'" [class.btn-outline-primary]="step!=='purposes'" (click)="step='purposes'">Purposes</button>
          <button class="btn" [class.btn-primary]="step==='review'" [class.btn-outline-primary]="step!=='review'" (click)="step='review'">Review</button>
        </div>
      </nav>

      <div *ngIf="step==='sensitivities'" class="card mb-3">
        <div class="card-header fw-semibold">Sharing preferences</div>
        <div class="card-body">
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="shareMode" id="sm_all" [(ngModel)]="shareMode" value="all">
              <label class="form-check-label" for="sm_all">I want to share all of my data</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="shareMode" id="sm_none" [(ngModel)]="shareMode" value="none">
              <label class="form-check-label" for="sm_none">I want to share none of my data</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="shareMode" id="sm_custom" [(ngModel)]="shareMode" value="custom">
              <label class="form-check-label" for="sm_custom">I want to specify the categories of data I want to share</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="shareMode" id="sm_allExcept" [(ngModel)]="shareMode" value="allExcept">
              <label class="form-check-label" for="sm_allExcept">I want to share everything EXCEPT data from the following categories</label>
            </div>
          </div>
          <div class="row g-3" [hidden]="!(shareMode === 'custom' || shareMode === 'allExcept')">
            <div class="col-sm-6" *ngFor="let c of categoryList">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" [id]="'cat_'+c.key" [(ngModel)]="selected[c.key]">
                <label class="form-check-label text-capitalize" [for]="'cat_'+c.key">{{ c.label }}</label>
              </div>
            </div>
          </div>
          <div class="row g-3 mt-3">
            <div class="col-sm-6">
              <label class="form-label">Valid until</label>
              <input class="form-control" type="date" [(ngModel)]="validUntilStr"/>
              <small class="text-muted">Default is one year from today</small>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary" (click)="go('recipients')">Next</button>
            <!-- <button class="btn btn-primary" (click)="startCategorySequencing()">next</button> -->
          </div>
        </div>
      </div>

      <!--
      <div *ngIf="step==='categoryResources'" class="card mb-3">
        <div class="card-header">resource types for category</div>
        <div class="card-body">
          <div *ngIf="selectedOrder.length === 0" class="text-muted small">no categories selected</div>
          <ng-container *ngIf="selectedOrder.length > 0">
            <div class="mb-2">
              <strong class="text-capitalize">{{ currentCategoryLabel() }}</strong>
              <span class="text-muted small ms-2">{{ currentCategoryIndex + 1 }} / {{ selectedOrder.length }}</span>
            </div>
            <div class="row g-2">
              <div class="col-sm-6 col-md-4" *ngFor="let g of resourceGroups">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" [id]="'rt_'+g.key" [(ngModel)]="resourceToggle[selectedOrder[currentCategoryIndex]][g.key]">
                  <label class="form-check-label" [for]="'rt_'+g.key">{{ g.key }}</label>
                </div>
              </div>
            </div>
            <div class="row g-2 mt-3">
              <div class="col-sm-4">
                <label class="form-label small">from date (optional)</label>
                <input class="form-control form-control-sm" type="date" [(ngModel)]="scope[selectedOrder[currentCategoryIndex]].from"/>
              </div>
              <div class="col-sm-4">
                <label class="form-label small">to date (optional)</label>
                <input class="form-control form-control-sm" type="date" [(ngModel)]="scope[selectedOrder[currentCategoryIndex]].to"/>
              </div>
              <div class="col-sm-4">
                <label class="form-label small">code filter (optional)</label>
                <input class="form-control form-control-sm" type="text" [(ngModel)]="scope[selectedOrder[currentCategoryIndex]].code" placeholder="code or text"/>
              </div>
            </div>
            <div class="mt-3">
              <button class="btn btn-outline-secondary me-2" (click)="prevCategory()">back</button>
              <button class="btn btn-primary" (click)="nextCategory()">next</button>
            </div>
          </ng-container>
        </div>
      </div>
      -->

      <div *ngIf="step==='recipients'" class="card mb-3">
        <div class="card-header fw-semibold">Recipients (organizations)</div>
        <div class="card-body">
          <div class="input-group input-group-sm mb-2" style="max-width: 420px;">
            <input class="form-control" type="text" [(ngModel)]="orgSearchText" placeholder="Search organizations"/>
            <button class="btn btn-outline-primary" type="button" (click)="searchOrganizations()">Search</button>
          </div>
          <div *ngIf="orgResults" class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Name</th><th>ID</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let e of orgResults.entry">
                  <td>{{ e.resource?.name }}</td>
                  <td>{{ e.resource?.id }}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-primary" (click)="addRecipient(e.resource?.id, e.resource?.name)">Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="recipients.length > 0" class="mt-2">
            <span *ngFor="let r of recipients" class="badge text-bg-secondary me-1">{{ r.display }}</span>
          </div>
          <div class="mt-2">
            <button class="btn btn-outline-secondary me-2" (click)="go('sensitivities')">Back</button>
            <button class="btn btn-primary" (click)="go('purposes')">Next</button>
          </div>
        </div>
      </div>

      <div *ngIf="step==='purposes'" class="card mb-3">
        <div class="card-header fw-semibold">Purposes</div>
        <div class="card-body">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="p_treatment" [(ngModel)]="purposes.treatment">
            <label class="form-check-label" for="p_treatment">Treatment</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="p_research" [(ngModel)]="purposes.research">
            <label class="form-check-label" for="p_research">Research</label>
          </div>
          <div class="mt-2">
            <button class="btn btn-outline-secondary me-2" (click)="go('recipients')">Back</button>
            <button class="btn btn-primary" (click)="prepareReview()">Next</button>
          </div>
        </div>
      </div>

      <div *ngIf="step==='review'" class="card">
        <div class="card-header fw-semibold">Review and confirm</div>
        <div class="card-body">
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="attest" [(ngModel)]="attest">
            <label class="form-check-label" for="attest">I affirm this consent is accurate</label>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <h6>Summary</h6>
              <div class="small text-muted" [innerHTML]="narrativeHtml"></div>
            </div>
            <div class="col-md-6">
              <h6>FHIR Consent</h6>
              <pre class="small bg-light p-2 border" style="max-height: 300px; overflow: auto;">{{ consentDraft | json }}</pre>
            </div>
          </div>
          <hr />
          <div class="row g-3 align-items-end">
            <div class="col-md-6">
              <label class="form-label">Signature</label>
              <div class="border rounded p-2 bg-white">
                <canvas #sigCanvas width="600" height="160"
                        style="touch-action: none; width: 100%; max-width: 100%; height: 160px;"
                        (pointerdown)="onPointerDown($event)"
                        (pointermove)="onPointerMove($event)"
                        (pointerup)="onPointerUp()"
                        (pointerleave)="onPointerUp()"
                ></canvas>
                <div class="mt-2 d-flex gap-2">
                  <input class="form-control form-control-sm" type="text" placeholder="Type your name" [(ngModel)]="signerName" style="max-width: 260px;" />
                  <button class="btn btn-sm btn-outline-secondary" type="button" (click)="drawNameAsSignature()">Use typed name</button>
                  <button class="btn btn-sm btn-outline-danger ms-auto" type="button" (click)="clearSignature()">Clear</button>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-outline-secondary me-2" (click)="go('purposes')">Back</button>
            <button class="btn btn-outline-primary me-2" (click)="validate()">Validate</button>
            <button class="btn btn-primary me-2" (click)="save()" [disabled]="!attest">Save consent</button>
            <button class="btn btn-outline-success" (click)="simulateConsent()" [disabled]="!savedConsentId">Simulate consent</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class PatientConsentBuilderComponent implements OnInit {
  patientId: string | null = null;
  step: 'sensitivities' | 'categoryResources' | 'recipients' | 'purposes' | 'review' = 'sensitivities';

  patientEverything: Bundle | null = null;

  categoryList = [
    { key: 'Demographics', label: 'demographics' },
    { key: 'Diagnoses', label: 'diagnoses' },
    { key: 'Disabilities', label: 'disabilities' },
    { key: 'Genetics', label: 'genetics' },
    { key: 'InfectiousDiseases', label: 'infectious diseases' },
    { key: 'Medications', label: 'medications' },
    { key: 'MentalHealth', label: 'mental health' },
    { key: 'SexualAndReproductiveHealth', label: 'sexual & reproductive health' },
    { key: 'SocialDeterminantsOfHealth', label: 'social determinants of health' },
    { key: 'SubstanceUse', label: 'substance use' },
    { key: 'Violence', label: 'violence' }
  ] as { key: CategoryKey, label: string }[];

  selected: Record<CategoryKey, boolean> = {
    Demographics: false,
    Diagnoses: false,
    Disabilities: false,
    Genetics: false,
    InfectiousDiseases: false,
    Medications: false,
    MentalHealth: false,
    SexualAndReproductiveHealth: false,
    SocialDeterminantsOfHealth: false,
    SubstanceUse: false,
    Violence: false
  };

  scope: Record<CategoryKey, { from?: string; to?: string; code?: string }> = {
    Demographics: {}, Diagnoses: {}, Disabilities: {}, Genetics: {}, InfectiousDiseases: {},
    Medications: {}, MentalHealth: {}, SexualAndReproductiveHealth: {}, SocialDeterminantsOfHealth: {}, SubstanceUse: {}, Violence: {}
  };

  orgSearchText = '';
  orgResults: Bundle<Organization> | null = null;
  recipients: { id?: string, display: string }[] = [];

  purposes: { treatment: boolean; research: boolean; other: string } = { treatment: false, research: false, other: '' };

  validUntilStr = '';
  consentDraft: Consent = { resourceType: 'Consent', status: 'active' } as Consent;
  attest = false;
  narrative = '';
  narrativeHtml = '';
  shareMode: 'all' | 'none' | 'custom' | 'allExcept' = 'custom';

  // signature capture
  @ViewChild('sigCanvas')
  set sigCanvasSetter(el: ElementRef<HTMLCanvasElement> | undefined) {
    if (el) {
      this.sigCanvas = el;
      this.initSignatureCanvas();
    }
  }
  private sigCanvas?: ElementRef<HTMLCanvasElement>;
  private sigCtx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  signerName = '';
  signatureDataUrl: string | null = null;
  savedConsentId: string | null = null;
  saveAlertVisible = false;
  private saveAlertTimeout: any = null;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private patientService: PatientService,
              private consentService: ConsentService,
              private organizationService: OrganizationService) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patient_id');
    if (this.patientId) {
      this.patientService.loadEverything(this.patientId);
      this.patientService.currentPatientEverything$.subscribe({
        next: (b) => this.patientEverything = b
      });
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      this.validUntilStr = oneYear.toISOString().substring(0, 10);
      this.initializeConsent();
    }
  }

  private initSignatureCanvas() {
    if (!this.sigCanvas) return;
    const canvas = this.sigCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.sigCtx = ctx;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#222';
    }
  }

  onPointerDown(e: PointerEvent) {
    if (!this.sigCtx || !this.sigCanvas) return;
    const { x, y } = this.canvasPoint(e);
    this.isDrawing = true;
    this.sigCtx.beginPath();
    this.sigCtx.moveTo(x, y);
  }

  onPointerMove(e: PointerEvent) {
    if (!this.isDrawing || !this.sigCtx) return;
    const { x, y } = this.canvasPoint(e);
    this.sigCtx.lineTo(x, y);
    this.sigCtx.stroke();
  }

  onPointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.captureSignature();
  }

  private canvasPoint(e: PointerEvent) {
    const rect = this.sigCanvas!.nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  clearSignature() {
    if (!this.sigCtx || !this.sigCanvas) return;
    const c = this.sigCanvas.nativeElement;
    this.sigCtx.clearRect(0, 0, c.width, c.height);
    this.signatureDataUrl = null;
  }

  drawNameAsSignature() {
    if (!this.sigCtx || !this.sigCanvas) return;
    const c = this.sigCanvas.nativeElement;
    this.sigCtx.clearRect(0, 0, c.width, c.height);
    this.sigCtx.font = '28px cursive, ui-serif, Georgia, Times';
    this.sigCtx.fillStyle = '#222';
    const text = this.signerName || '';
    // center text
    const metrics = this.sigCtx.measureText(text);
    const x = Math.max(10, (c.width - metrics.width) / 2);
    const y = Math.floor(c.height / 2);
    this.sigCtx.fillText(text, x, y);
    this.captureSignature();
  }

  captureSignature() {
    if (!this.sigCanvas) return;
    this.signatureDataUrl = this.sigCanvas.nativeElement.toDataURL('image/png');
  }

  initializeConsent() {
    if (!this.patientId) return;
    this.consentDraft = {
      resourceType: 'Consent',
      status: 'active',
      subject: { reference: 'Patient/' + this.patientId, type: 'Patient' },
      text: { status: 'generated', div: '' } as any,
      decision: 'permit' as any,
      category: [
        {
          id: uuidv4(),
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy', display: 'Privacy Consent' }
          ],
          text: 'Privacy Consent'
        } as any,
        {
          id: uuidv4(),
          coding: [
            { system: 'http://loinc.org', code: '59284-6', display: 'Consent Document' }
          ],
          text: 'LOINC Consent Document'
        } as any
      ],
      controller: [],
      provision: [] as any,
      policyBasis: { url: '', reference: { reference: '' } } as any
    } as Consent;
  }

  go(step: typeof this.step) { this.step = step; }
/* commented out for now because we're not using category sequencing
  currentCategoryLabel(): string {
    if (this.selectedOrder.length === 0) return '';
    const key = this.selectedOrder[this.currentCategoryIndex];
    const item = this.categoryList.find(x => x.key === key);
    return item ? item.label : '';
  }

  // category sequencing state and helpers
  resourceGroups = [
    { key: 'Medications', fhirTypes: ['MedicationRequest','MedicationStatement'] },
    { key: 'Conditions', fhirTypes: ['Condition'] },
    { key: 'Encounters', fhirTypes: ['Encounter'] },
    { key: 'Procedures', fhirTypes: ['Procedure'] },
    { key: 'Observations', fhirTypes: ['Observation'] },
    { key: 'Allergies', fhirTypes: ['AllergyIntolerance'] },
    { key: 'Immunizations', fhirTypes: ['Immunization'] },
    { key: 'CarePlans', fhirTypes: ['CarePlan'] },
    { key: 'Documents', fhirTypes: ['DocumentReference'] }
  ] as { key: string, fhirTypes: string[] }[];

  resourceToggle: Record<CategoryKey, Record<string, boolean>> = {
    Demographics: {}, Diagnoses: {}, Disabilities: {}, Genetics: {}, InfectiousDiseases: {},
    Medications: {}, MentalHealth: {}, SexualAndReproductiveHealth: {}, SocialDeterminantsOfHealth: {}, SubstanceUse: {}, Violence: {}
  } as any;

  selectedOrder: CategoryKey[] = [];
  currentCategoryIndex = 0;

  startCategorySequencing() {
    this.selectedOrder = this.categoryList.filter(x => this.selected[x.key]).map(x => x.key);
    this.currentCategoryIndex = 0;
    for (const k of this.selectedOrder) {
      if (!this.resourceToggle[k] || Object.keys(this.resourceToggle[k]).length === 0) {
        this.resourceToggle[k] = {} as any;
        for (const g of this.resourceGroups) this.resourceToggle[k][g.key] = true;
      }
    }
    this.step = 'categoryResources';
  }

  nextCategory() {
    if (this.currentCategoryIndex < this.selectedOrder.length - 1) {
      this.currentCategoryIndex++;
    } else {
      this.step = 'recipients';
    }
  }

  prevCategory() {
    if (this.currentCategoryIndex > 0) this.currentCategoryIndex--;
    else this.step = 'sensitivities';
  }
*/
  searchOrganizations() {
    if (!this.orgSearchText || this.orgSearchText.trim() === '') return;
    this.organizationService.search(this.orgSearchText).subscribe(b => this.orgResults = b);
  }

  addRecipient(id?: string, display?: string) {
    if (!display) return;
    this.recipients.push({ id, display });
  }

  private buildProvisions() {
    // build one master provision with all selected categories
    const pAll: any = {
      id: uuidv4(),
      type: (this.shareMode === 'none' || this.shareMode === 'custom') ? 'deny' : 'permit',
      actor: [ { reference: { reference: '' }, role: { coding: [ { system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType', code: 'IRCP' } ] } } ],
      action: [ { coding: [ { system: 'http://terminology.hl7.org/CodeSystem/consentaction', code: 'access' } ] } ],
      securityLabel: [],
      purpose: []
    };

    // set top-level decision explicitly
    (this.consentDraft as any).decision = (this.shareMode === 'none' || this.shareMode === 'custom') ? 'deny' : 'permit';

    const settingsAll = new ConsentCategorySettings();
    if (this.shareMode === 'custom' || this.shareMode === 'allExcept') {
      // custom: reflect user toggles
      settingsAll.demographics.enabled = !!this.selected.Demographics;
      settingsAll.diagnoses.enabled = !!this.selected.Diagnoses;
      settingsAll.disabilities.enabled = !!this.selected.Disabilities;
      settingsAll.genetics.enabled = !!this.selected.Genetics;
      settingsAll.infectiousDiseases.enabled = !!this.selected.InfectiousDiseases;
      settingsAll.medications.enabled = !!this.selected.Medications;
      settingsAll.mentalHealth.enabled = !!this.selected.MentalHealth;
      settingsAll.sexualAndReproductive.enabled = !!this.selected.SexualAndReproductiveHealth;
      settingsAll.socialDeterminants.enabled = !!this.selected.SocialDeterminantsOfHealth;
      settingsAll.substanceUse.enabled = !!this.selected.SubstanceUse;
      settingsAll.violence.enabled = !!this.selected.Violence;
      settingsAll.treatment.enabled = !!this.purposes.treatment;
      settingsAll.research.enabled = !!this.purposes.research;
      // semantics:
      //  - custom (deny these categories): decision is deny; enabled categories represent masked labels
      //  - allExcept (permit others): decision is permit; enabled categories represent masked labels
      // In both cases we attach the enabled category labels; engine interprets with decision
      settingsAll.updateConsentProvision(pAll);
    } else {
      // all/none: no subcategory securityLabels; only purposes (if any)
      settingsAll.treatment.enabled = !!this.purposes.treatment;
      settingsAll.research.enabled = !!this.purposes.research;
      // apply purposes only
      settingsAll.updateConsentProvisionPurpose(pAll, settingsAll.treatment);
      settingsAll.updateConsentProvisionPurpose(pAll, settingsAll.research);
    }

    const provisions: any[] = [pAll];

    // recipients as controllers (match expected: no display)
    this.consentDraft.controller = this.recipients.map(r => ({ reference: r.id ? ('Organization/' + r.id) : undefined, type: 'Organization' } as any));

    // assign provisions
    this.consentDraft.provision = provisions as any;
  }

  private periodForScope(s: { from?: string; to?: string }) {
    if (!s.from && !s.to && this.validUntilStr) {
      return { end: this.validUntilStr };
    }
    const p: any = {};
    if (s.from) p.start = s.from;
    p.end = s.to || this.validUntilStr;
    return p;
  }

  prepareReview() {
    this.buildProvisions();
    this.narrative = this.buildNarrative();
    this.narrativeHtml = this.buildNarrativeHtml();
    this.step = 'review';
  }

  private buildNarrative(): string {
    const orgs = this.recipients.map(r => r.display).join(', ') || 'none';
    const ps = [ this.purposes.treatment ? 'treatment' : '', this.purposes.research ? 'research' : '' ].filter(Boolean).join(', ') || 'none';
    const decision = this.shareMode === 'none' ? 'deny' : (this.shareMode === 'custom' ? 'deny' : 'permit');
    if (this.shareMode === 'all') {
      return `decision: ${decision}; with: ${orgs}; purposes: ${ps}; valid until: ${this.validUntilStr}`;
    }
    if (this.shareMode === 'none') {
      return `decision: ${decision}; valid until: ${this.validUntilStr}`;
    }
    // custom and allExcept show categories list
    const on = this.categoryList.filter(x => this.selected[x.key]).map(x => x.label).join(', ') || 'none';
    const off = this.categoryList.filter(x => !this.selected[x.key]).map(x => x.label).join(', ') || 'none';
    if (this.shareMode === 'custom') {
      return `decision: ${decision}; masked: ${on}; with: ${orgs}; purposes: ${ps}; valid until: ${this.validUntilStr}`;
    }
    // allExcept
    return `decision: ${decision}; masked: ${on}; with: ${orgs}; purposes: ${ps}; valid until: ${this.validUntilStr}`;
  }

  private buildNarrativeHtml(): string {
    const esc = (s: string) => (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const badge = (text: string) => `<span class="badge text-bg-secondary me-1">${esc(text)}</span>`;
    const orgs = this.recipients.map(r => badge(esc(r.display))).join(' ') || '<span class="text-muted">none</span>';
    const ps = [ this.purposes.treatment ? 'treatment' : '', this.purposes.research ? 'research' : '' ]
      .filter(Boolean).map(badge).join(' ') || '<span class="text-muted">none</span>';
    const htmlInner = `
      <div class="small">
        <div class="mb-1"><strong>with</strong>: ${orgs}</div>
        <div class="mb-1"><strong>purposes</strong>: ${ps}</div>
        <div class="mb-1"><strong>valid until</strong>: ${esc(this.validUntilStr)}</div>
      </div>
    `;
    // expected output keeps text.div empty; return HTML only for UI
    (this.consentDraft as any).text = { status: 'generated', div: '' };
    return `<div>${htmlInner}</div>`;
  }

  validate() {
    this.buildProvisions();
    this.consentService.validate(this.consentDraft).subscribe({ next: () => {}, error: () => {} });
  }

  save() {
    this.buildProvisions();
    // do not include verification to match expected
    this.consentService.post(this.consentDraft).subscribe({
      next: (c) => {
        this.consentDraft = c;
        this.savedConsentId = c.id || null;
        this.showSaveAlert();
      }
    });
  }

  simulateConsent() {
    if (!this.savedConsentId) return;
    this.router.navigate(['/simulator', this.savedConsentId]);
  }

  private showSaveAlert() {
    this.saveAlertVisible = true;
    if (this.saveAlertTimeout) clearTimeout(this.saveAlertTimeout);
    this.saveAlertTimeout = setTimeout(() => {
      this.saveAlertVisible = false;
      this.saveAlertTimeout = null;
    }, 3000);
  }

  dismissSaveAlert() {
    this.saveAlertVisible = false;
    if (this.saveAlertTimeout) {
      clearTimeout(this.saveAlertTimeout);
      this.saveAlertTimeout = null;
    }
  }
}


