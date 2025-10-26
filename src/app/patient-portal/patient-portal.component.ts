// Author: Abhishek Dhadwal

import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../patient.service';
import { Bundle, Consent, FhirResource, Patient } from 'fhir/r5';
import { ConsentService } from '../consent/consent.service';
import { CdsService } from '../cds/cds.service';
import { Card, ConsentCategorySettings, ConsentDecision, ConsoleDataSharingEngine, DataSharingCDSHookRequest, DummyRuleProvider } from '@asushares/core';
import { ToastrService } from 'ngx-toastr';

type ResourceIndex = { [key: string]: FhirResource[] };

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container my-4" *ngIf="patientEverything; else loadingTpl">
      <div class="d-flex align-items-center mb-3">
        <div>
          <h1 class="h4 mb-0">Patient Overview</h1>
          <small class="text-muted" *ngIf="patientName">{{ patientName }}</small>
        </div>
        <div class="ms-auto d-flex gap-2 align-items-center">
          <span class="badge text-bg-light border text-uppercase">view as</span>
          <select class="form-select form-select-sm" [(ngModel)]="viewAs" (ngModelChange)="onViewAsChange($event)">
            <option value="patient">patient</option>
            <option *ngFor="let c of patientConsents" [value]="c.id">{{ labelForConsent(c) }}</option>
          </select>
          <ng-container *ngIf="viewAs !== 'patient'">
            <span class="badge text-bg-light border text-uppercase ms-3">confidence</span>
            <input type="range" class="form-range" min="0" max="1" step="0.01" [(ngModel)]="confidenceThreshold" (change)="onConfidenceChange()" style="width: 150px;" />
            <span class="badge rounded-pill" [ngClass]="thresholdBadgeClass()">{{ (confidenceThreshold * 100) | number:'1.0-0' }}%</span>
          </ng-container>
          <a class="btn btn-sm btn-primary ms-2" [routerLink]="['/portal', patientId, 'consent']">Build Consent</a>
        </div>
      </div>

      <div class="row">
        <div class="col-md-3">
          <div class="list-group small">
            <div class="list-group-item d-flex align-items-center justify-content-between">
              <label class="form-check-label me-2 fw-semibold">Show Sensitivity Categories</label>
              <div class="form-check form-switch m-0">
                <input class="form-check-input" type="checkbox" [disabled]="!isEverythingComplete" [(ngModel)]="labelsEnabled" (ngModelChange)="onLabelsToggle($event); filtersVisible = $event || (viewAs !== 'patient')" />
              </div>
            </div>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('medications', $event)">Medications</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('conditions', $event)">Conditions</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('encounters', $event)">Encounters</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('labs', $event)">Lab Results</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('allergies', $event)">Allergies</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('procedures', $event)">Procedures</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('careplans', $event)">Care Plans</a>
            <a class="list-group-item list-group-item-action" href="#" (click)="scrollTo('documents', $event)">Documents And Notes</a>
          </div>
          <div *ngIf="filtersVisible" class="mt-3 position-sticky" style="top: 0.5rem;">
            <div class="card">
              <div class="card-header py-2">Post-Simulation Filtering</div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label small mb-1 fw-semibold">Data Category Security Labels</label>
                  <div class="d-flex gap-2 align-items-center">
                    <select class="form-select form-select-sm" [(ngModel)]="filterCategoryMode">
                      <option value="all">Show everything</option>
                      <option value="only">Only data labeled as</option>
                      <option value="except">Except data labeled as</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary" type="button" (click)="setAllFilterCategories(true)">all</button>
                    <button class="btn btn-sm btn-outline-secondary" type="button" (click)="setAllFilterCategories(false)">none</button>
                  </div>
                  <div *ngIf="filterCategoryMode !== 'all'" class="mt-2 small">
                    <div class="form-check form-check-inline" *ngFor="let c of filterCategorySettings.allCategories()">
                      <input class="form-check-input" type="checkbox" [id]="'fc_'+c.act_code" [(ngModel)]="c.enabled">
                      <label class="form-check-label" [for]="'fc_'+c.act_code">{{ c.name }}</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="form-label small mb-1 fw-semibold">Sharing Decision</label>
                  <select class="form-select form-select-sm" [(ngModel)]="sharingDecisionMode">
                    <option value="all">everything</option>
                    <option value="permit">only shared data</option>
                    <option value="deny">only redacted data</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-9">
          <ng-container *ngFor="let s of sections">
            <div class="card mb-3" [attr.id]="s.id">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span class="text-capitalize fw-semibold">{{ s.title }}</span>
                <span class="badge text-bg-secondary rounded-pill">{{ getCount(s.types) }}</span>
              </div>
              <div class="card-body p-0">
                <div *ngIf="getCount(s.types) === 0" class="p-3 text-muted small">no data</div>
                <div *ngIf="getCount(s.types) > 0" class="table-responsive">
                  <table class="table table-sm table-hover mb-0">
                    <thead>
                      <tr>
                        <th *ngFor="let h of s.headers; let i = index" class="small text-uppercase text-muted fw-semibold">
                          <button class="btn btn-link p-0 text-decoration-none" (click)="sortSection(s.id, s.keys[i])">
                            {{ h }}
                            <span *ngIf="sortState[s.id]?.key === s.keys[i]">{{ sortState[s.id]?.dir === 'asc' ? '▲' : '▼' }}</span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of getRows(s.types, s.id) | slice:0:initialRows" [hidden]="!resourceShown(row.rid)" [class.text-muted]="isDenied(row.rid)" [class.denied-row]="isDenied(row.rid)" [class.table-danger]="isDenied(row.rid)" (click)="onRowClick(s.id, row.cols)">
                        <td *ngFor="let col of row.cols; let ci = index" [attr.title]="col">
                          <span [class]="ci === 0 ? 'truncate' : ''">{{ col }}</span>
                          <ng-container *ngIf="labelsEnabled && ci === 0 && labelsForId(row.rid).length > 0">
                            <span class="badge rounded-pill ms-1" [ngClass]="labelClassFor(lb)" [attr.title]="labelTitleFor(lb)" *ngFor="let lb of labelsForId(row.rid)">{{ categoryNameFor(lb) }}</span>
                          </ng-container>
                          <ng-container *ngIf="isDenied(row.rid) && ci === 0">
                            <span class="badge rounded-pill ms-1 text-bg-danger" title="denied by consent">redacted</span>
                          </ng-container>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div *ngIf="getCount(s.types) > initialRows" class="p-2 text-center">
                    <button class="btn btn-link btn-sm" (click)="initialRows = initialRows + 25">show more</button>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
    <ng-template #loadingTpl>
      <div class="container my-5 text-center text-muted">loading patient data...</div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .truncate { display: inline-block; max-width: 22rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
    thead th { letter-spacing: .02rem; }
    .badge { font-size: .72rem; }
    .denied-row { text-decoration-thickness: 2px; opacity: .75; }
  `]
})
export class PatientPortalComponent implements OnInit, OnDestroy {
  patientId: string | null = null;
  patientEverything: Bundle | null = null;
  index: ResourceIndex = {};
  private byResourceKey: Map<string, any> = new Map<string, any>();
  private byFullUrl: Map<string, any> = new Map<string, any>();
  patientName = '';
  viewAs: string = 'patient';
  confidenceThreshold: number = 0.0;
  initialRows = 25;
  sortState: { [sectionId: string]: { key: string, dir: 'asc' | 'desc' } } = {};

  // consent-driven view state
  patientConsents: Consent[] = [];
  private consentDeniedCache: Map<string, Set<string>> = new Map<string, Set<string>>();
  private currentDeniedIds: Set<string> = new Set<string>();
  // labeling state
  labelsEnabled: boolean = false;
  isEverythingComplete: boolean = false;
  private labelsByResourceId: { [id: string]: string[] } = {};
  private loadingCompleteTimer: any = null;

  // post-consent filters
  filtersVisible: boolean = false;
  sharingDecisionMode: 'all' | 'permit' | 'deny' = 'all';
  filterCategoryMode: 'all' | 'only' | 'except' = 'all';
  filterCategorySettings = new ConsentCategorySettings();

  sections = [
    { id: 'medications', title: 'medications', types: ['MedicationStatement','MedicationRequest'], headers: ['medication','dosage','frequency','route','status'], keys: ['medication','dosage','frequency','route','status'] },
    { id: 'conditions', title: 'conditions', types: ['Condition'], headers: ['condition','date','status'], keys: ['condition','date','status'] },
    { id: 'encounters', title: 'encounters', types: ['Encounter'], headers: ['date','type','provider','reason'], keys: ['date','type','provider','reason'] },
    { id: 'labs', title: 'lab results', types: ['Observation'], headers: ['test','date','result','units','range'], keys: ['test','date','result','units','range'] },
    { id: 'allergies', title: 'allergies', types: ['AllergyIntolerance'], headers: ['allergen','reaction','severity'], keys: ['allergen','reaction','severity'] },
    { id: 'procedures', title: 'procedures', types: ['Procedure'], headers: ['procedure','date','status'], keys: ['procedure','date','status'] },
    { id: 'careplans', title: 'care plans', types: ['CarePlan'], headers: ['care plan','start','end','status'], keys: ['care plan','start','end','status'] },
    { id: 'documents', title: 'documents and notes', types: ['DocumentReference'], headers: ['document','author','date','organization'], keys: ['document','author','date','organization'] },
  ];

  constructor(private route: ActivatedRoute, private patientService: PatientService, private consentService: ConsentService, private cdsService: CdsService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patient_id');
    if (this.patientId) {
      // clear prior state in portal to avoid duplicate rendering on re-entry
      this.patientEverything = null;
      this.index = {};
      this.byResourceKey.clear();
      this.byFullUrl.clear();
      this.labelsByResourceId = {};
      this.currentDeniedIds = new Set<string>();
      this.patientService.loadEverything(this.patientId);
      this.patientService.currentPatientEverything$.subscribe({
        next: (bundle) => {
          this.patientEverything = bundle;
          this.rebuildIndex();
          this.derivePatientName();
          if (this.loadingCompleteTimer) {
            clearTimeout(this.loadingCompleteTimer);
          }
          this.loadingCompleteTimer = setTimeout(() => {
            this.isEverythingComplete = true;
          }, 600);
        }
      });
      // load consents for dropdown
      this.consentService.indexForPatient(this.patientId).subscribe({
        next: (b) => {
          const entries = (b.entry || []) as any[];
          this.patientConsents = entries.map(e => e.resource as Consent).filter(c => !!c);
        },
        error: () => {}
      });
    }
  }
  // consent view handling
  onViewAsChange(val: string) {
    if (val === 'patient') {
      this.currentDeniedIds = new Set<string>();
      // reset filters and hide panel for base view
      this.sharingDecisionMode = 'all';
      this.filterCategoryMode = 'all';
      this.filtersVisible = false;
      return;
    }
    const consent = this.patientConsents.find(c => c.id === val);
    if (!consent) {
      this.currentDeniedIds = new Set<string>();
      return;
    }
    const cacheKey = `${consent.id}|${this.confidenceThreshold.toFixed(2)}`;
    const cached = this.consentDeniedCache.get(cacheKey);
    if (cached) {
      this.currentDeniedIds = cached;
      return;
    }
    // run labeling and decision engine
    if (!this.patientEverything) return;
    const data = new DataSharingCDSHookRequest();
    const bundle: Bundle = { resourceType: 'Bundle', type: 'collection', entry: [] } as Bundle;
    const entries = this.patientEverything.entry || [];
    for (const e of entries as any[]) {
      if (e.resource) {
        (bundle.entry as any[]).push({ resource: e.resource });
      }
    }
    data.context.patientId = [{ value: 'Patient/' + this.patientId }];
    data.context.content = bundle;
    this.filtersVisible = true;
    this.toastr.clear();
    const toastId = this.toastr.info('labeling resources...', 'view as', { timeOut: 0, extendedTimeOut: 0, closeButton: true }).toastId;
    this.cdsService.patientConsentConsult(data, this.confidenceThreshold.toFixed(2)).subscribe({
      next: (result: Card | any) => {
        this.toastr.clear(toastId);
        const toastId2 = this.toastr.info('computing decisions...', 'view as', { timeOut: 0, extendedTimeOut: 0, closeButton: true }).toastId;
        const labeledResources: FhirResource[] = (result?.extension?.content?.entry || [])
          .map((x: any) => x.resource)
          .filter((r: any) => !!r);
        const engine = new ConsoleDataSharingEngine(new DummyRuleProvider(), this.confidenceThreshold, false, false);
        const categorySettings = new ConsentCategorySettings();
        const decisions = engine.computeConsentDecisionsForResources(labeledResources, consent, categorySettings) as { [id: string]: any };
        const denied = new Set<string>();
        Object.keys(decisions || {}).forEach(id => {
          const card = decisions[id];
          if (card && card.summary === ConsentDecision.CONSENT_DENY) {
            denied.add(id);
          }
        });
        // log accepted and denied resources with labels for debugging
        try {
          const acceptedLog: any[] = [];
          const deniedLog: any[] = [];
          (labeledResources as any[]).forEach((r: any) => {
            const rid = r?.id;
            if (!rid) return;
            const labels: string[] = (r?.meta?.security || []).map((s: any) => s?.code).filter((c: any) => !!c);
            const entry = { type: r?.resourceType, id: rid, labels };
            const card = decisions?.[rid];
            if (card?.summary === ConsentDecision.CONSENT_DENY) {
              deniedLog.push(entry);
            } else {
              acceptedLog.push(entry);
            }
          });
          console.log('consent decision results', { accepted: acceptedLog, denied: deniedLog });
        } catch {}
        this.consentDeniedCache.set(cacheKey, denied);
        this.currentDeniedIds = denied;
        this.toastr.clear(toastId2);
        this.toastr.success('applied consent view', 'view as');
      },
      error: () => {
        this.toastr.clear();
        this.toastr.error('simulation failed', 'view as');
        this.currentDeniedIds = new Set<string>();
      }
    });
  }

  onConfidenceChange() {
    if (this.viewAs === 'patient') return;
    // re-run view with new threshold
    this.onViewAsChange(this.viewAs);
  }

  onLabelsToggle(enabled: boolean) {
    if (!enabled) return;
    if (!this.patientEverything) return;
    const data = new DataSharingCDSHookRequest();
    const bundle: Bundle = { resourceType: 'Bundle', type: 'collection', entry: [] } as Bundle;
    const entries = this.patientEverything.entry || [];
    for (const e of entries as any[]) {
      if (e.resource) (bundle.entry as any[]).push({ resource: e.resource });
    }
    data.context.patientId = [{ value: 'Patient/' + this.patientId }];
    data.context.content = bundle;
    this.filtersVisible = true;
    this.cdsService.patientConsentConsult(data, '0.0').subscribe({
      next: (result: Card | any) => {
        const labeledResources: any[] = (result?.extension?.content?.entry || [])
          .map((x: any) => x.resource)
          .filter((r: any) => !!r && !!r.id);
        const map: { [id: string]: string[] } = {};
        labeledResources.forEach((r: any) => {
          const labels: string[] = (r?.meta?.security || []).map((s: any) => s?.code).filter((c: any) => !!c);
          map[r.id] = labels;
        });
        this.labelsByResourceId = map;
      },
      error: () => {
        this.labelsByResourceId = {};
        this.labelsEnabled = false;
      }
    });
  }

  labelForConsent(c: Consent): string {
    const catText = c.category?.[0]?.text || c.category?.[0]?.coding?.[0]?.display || 'consent';
    const status = c.status || '';
    const name = catText.trim();
    const parts: string[] = [];
    if (name) parts.push(name);
    if (status) parts.push(status);
    if (c.id) parts.push(c.id);
    return parts.join(' · ');
  }

  isDenied(rid?: string): boolean {
    if (!rid) return false;
    return this.currentDeniedIds.has(rid);
  }

  labelsForId(rid?: string): string[] {
    if (!rid) return [];
    return this.labelsByResourceId[rid] || [];
  }

  labelClassFor(label: string): string {
    // color wheel determined byhash
    let h = 0;
    for (let i = 0; i < label.length; i++) h = ((h << 5) - h) + label.charCodeAt(i) | 0;
    const palette = ['text-bg-primary','text-bg-secondary','text-bg-success','text-bg-danger','text-bg-warning','text-bg-info','text-bg-dark'];
    const idx = Math.abs(h) % palette.length;
    return palette[idx];
  }

  labelTitleFor(code: string): string {
    const map: { [k: string]: string } = {
      'SUD': 'records possibly pertaining to commonly abused substances',
      'MENCAT': 'all manner of mental health and wellbeing information',
      'DEMO': 'general ethnic, social, and environmental background',
      'DIA': 'medically recognized conditions you have experienced',
      'DIS': 'physical or mental conditions limiting movement, sense, or activity',
      'GDIS': 'genomic and molecular data that may indicate susceptability to heritable disease',
      'DISEASE': 'past or present transmissible ailments',
      'DRGIS': 'drugs prescribed to you',
      'SEX': 'information related to sexuality and reproductive health',
      'SOCIAL': 'environmental and contextual factors that may impact your health',
      'VIO': 'indicators of possible physical or mental harm by violence'
    };
    return map[code] || code;
  }

  categoryNameFor(code: string): string {
    const cat = this.filterCategorySettings.categoryForCode(code as any);
    return (cat && (cat as any).name) ? (cat as any).name : code;
  }

  // filters: logic mirrors simulator semantics
  setAllFilterCategories(enabled: boolean) {
    this.filterCategorySettings.allCategories().forEach(c => c.enabled = enabled);
  }

  private resourceShownForLabelFilter(resourceId?: string): boolean {
    if (!resourceId) return true;
    if (this.filterCategoryMode === 'all') return true;
    const labels = this.labelsByResourceId[resourceId] || [];
    if (this.filterCategoryMode === 'only') {
      let ok = false;
      this.filterCategorySettings.allCategories().forEach(c => {
        if (c.enabled && labels.includes(c.act_code)) ok = true;
      });
      return ok;
    }
    if (this.filterCategoryMode === 'except') {
      let ok = true;
      this.filterCategorySettings.allCategories().forEach(c => {
        if (c.enabled && labels.includes(c.act_code)) ok = false;
      });
      return ok;
    }
    return true;
  }

  private resourceShownForSharingFilter(resourceId?: string): boolean {
    if (!resourceId) return true;
    if (this.sharingDecisionMode === 'all') return true;
    const denied = this.currentDeniedIds.has(resourceId);
    if (this.sharingDecisionMode === 'permit') return !denied;
    if (this.sharingDecisionMode === 'deny') return denied;
    return true;
  }

  resourceShown(resourceId?: string): boolean {
    if (this.viewAs === 'patient') return true;
    return this.resourceShownForLabelFilter(resourceId) && this.resourceShownForSharingFilter(resourceId);
  }

  ngOnDestroy(): void {}

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private rebuildIndex() {
    this.index = {};
    this.byResourceKey = new Map<string, any>();
    this.byFullUrl = new Map<string, any>();
    const entries = this.patientEverything?.entry || [];
    const seen: Set<string> = new Set<string>();
    for (const e of entries as any[]) {
      const r = e.resource as FhirResource;
      if (!r || !r.resourceType) continue;
      const key = (r as any).id ? `${r.resourceType}/${(r as any).id}` : (e.fullUrl || `${r.resourceType}|${Math.random()}`);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!this.index[r.resourceType]) this.index[r.resourceType] = [];
      this.index[r.resourceType].push(r);
      if ((r as any).id && r.resourceType) {
        this.byResourceKey.set(`${r.resourceType}/${(r as any).id}`, r);
      }
      if (e.fullUrl) {
        this.byFullUrl.set(e.fullUrl, r);
      }
    }
  }

  private derivePatientName() {
    const p = (this.index['Patient'] && this.index['Patient'][0] as Patient) || null;
    if (p && p.name && p.name.length > 0) {
      const parts: string[] = [];
      if (p.name[0].given) parts.push(...p.name[0].given);
      if (p.name[0].family) parts.push(p.name[0].family);
      this.patientName = parts.join(' ');
    }
  }

  // helpers
  private textFromConcept(cc: any): string {
    if (!cc) return '';
    if (cc.text) return cc.text;
    if (Array.isArray(cc.coding) && cc.coding.length > 0) {
      for (const c of cc.coding) {
        if (c?.display) return c.display;
      }
      for (const c of cc.coding) {
        if (c?.code) return c.code;
      }
    }
    return '';
  }

  private resolveRef(owner: any, ref?: string): any | undefined {
    if (!ref) return undefined;
    if (ref.startsWith('#')) {
      const id = ref.substring(1);
      return (owner.contained || []).find((c: any) => c.id === id);
    }
    if (this.byFullUrl.has(ref)) return this.byFullUrl.get(ref);
    const parts = ref.split('/');
    const key = parts.slice(-2).join('/');
    return this.byResourceKey.get(key);
  }

  private resolveMedicationDisplay(r: any): string {
    // direct codeable concepts
    const direct = this.textFromConcept(r?.medication?.concept) || this.textFromConcept(r?.medicationCodeableConcept) || r?.medication?.display || '';
    if (direct) return direct;
    // reference or contained
    const ref = r?.medication?.reference || r?.medicationReference?.reference;
    if (ref) {
      const med = this.resolveRef(r, ref);
      if (med?.code) {
        const t = this.textFromConcept(med.code);
        if (t) return t;
      }
      return r?.medication?.display || r?.medicationReference?.display || '';
    }
    return '';
  }

  private decodeBase64ToText(b64: string): string {
    try {
      // browser safe atob; decode utf-8 if present
      const binary = atob(b64);
      // attempt utf-8 decode
      try {
        const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
        const dec = new TextDecoder('utf-8', { fatal: false });
        return dec.decode(bytes);
      } catch {
        return binary;
      }
    } catch {
      return '';
    }
  }

  onRowClick(sectionId: string, row: string[]) {
    if (sectionId !== 'documents') return;
    // find the matching DocumentReference by comparing key fields then decode content on demand
    const docs = this.index['DocumentReference'] || [];
    const clickedDoc = row[0];
    const clickedAuthor = row[1];
    const clickedDate = row[2];
    const clickedOrg = row[3];
    let match: any = null;
    for (const d of docs as any[]) {
      const doc = this.textFromConcept(d.type) || d.category?.[0]?.text || '';
      const author = d.author?.[0]?.display || '';
      const date = d.date || d.created || '';
      const org = d.custodian?.display || '';
      if (doc === clickedDoc && author === clickedAuthor && date === clickedDate && org === clickedOrg) {
        match = d; break;
      }
    }
    if (match) {
      const dataB64 = match.content?.[0]?.attachment?.data || '';
      const text = dataB64 ? this.decodeBase64ToText(dataB64) : 'no note content present';
      alert(text);
    }
  }

  getCount(types: string[]): number {
    let n = 0;
    for (const t of types) n += (this.index[t]?.length || 0);
    return n;
  }

  sortSection(sectionId: string, key: string) {
    const cur = this.sortState[sectionId];
    if (cur && cur.key === key) {
      this.sortState[sectionId] = { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
    } else {
      this.sortState[sectionId] = { key, dir: 'asc' };
    }
  }

  getRows(types: string[], sectionId?: string): { cols: string[], rid?: string }[] {
    const rows: { cols: string[], rid?: string }[] = [];
    const add = (rid: string | undefined, cols: any[]) => rows.push({ rid, cols: cols.map(v => (v ?? '').toString()) });
    const textOf = (cc: any) => cc?.text || cc?.coding?.[0]?.display || cc?.coding?.[0]?.code || '';
    const firstDisplay = (codingArr: any[] | undefined) => (codingArr && codingArr.length > 0 ? (codingArr[0].display || codingArr[0].code || '') : '');
    const conceptText = (cc: any): string => this.textFromConcept(cc);
    const resolveMedName = (r: any): string => {
      // r5 codeablereference can be medication.concept or medication.reference
      if (r.medication?.concept) return this.textFromConcept(r.medication.concept);
      if (r.medicationCodeableConcept) return this.textFromConcept(r.medicationCodeableConcept);
      const ref: string | undefined = r.medication?.reference || r.medicationReference?.reference;
      if (ref) {
        if (ref.startsWith('#')) {
          const localId = ref.substring(1);
          const contained = (r.contained || []) as any[];
          const m = contained.find((x: any) => x.resourceType === 'Medication' && x.id === localId);
          if (m) return textOf(m.code) || firstDisplay(m.code?.coding);
        }
        if (ref.startsWith('Medication/')) {
          const meds = this.index['Medication'] || [];
          const m = meds.find((x: any) => x.id && (('Medication/' + x.id) === ref));
          if (m) return this.textFromConcept((m as any).code);
        }
        return r.medication?.display || r.medicationReference?.display || '';
      }
      return '';
    };

    for (const t of types) {
      const arr = this.index[t] || [];
      for (const r of arr) {
        if (t === 'MedicationStatement' || t === 'MedicationRequest') {
          const rr: any = r as any;
          let med = '';
          if (t === 'MedicationRequest') {
            med = this.resolveMedicationDisplay(rr);
          } else {
            med = this.resolveMedicationDisplay(rr);
          }
          if (!med) med = resolveMedName(rr); // fallback to legacy for safety
          if (!med) {
            console.warn('Unresolved medication fields present:', {
              id: rr.id,
              resourceType: rr.resourceType,
              medication: rr.medication,
              medicationCodeableConcept: rr.medicationCodeableConcept,
              medicationReference: rr.medicationReference
            });
        }
          const dosage = rr.dosage?.[0]?.text || rr.dosageInstruction?.[0]?.text || '';
          const freq = rr.dosage?.[0]?.timing?.repeat?.frequency || rr.dosageInstruction?.[0]?.timing?.repeat?.frequency || '';
          const route = textOf(rr.dosage?.[0]?.route) || textOf(rr.dosageInstruction?.[0]?.route) || '';
          const status = rr.status || '';
          add((rr as any).id, [med, dosage, freq, route, status]);
        } else if (t === 'Condition') {
          const cond = textOf((r as any).code);
          const date = (r as any).recordedDate || (r as any).onsetDateTime || '';
          const status = textOf((r as any).clinicalStatus);
          add((r as any).id, [cond, date, status]);
        } else if (t === 'Encounter') {
          const date = (r as any).period?.start || '';
          const type = textOf((r as any).type?.[0]);
          const provider = (r as any).serviceProvider?.display || '';
          const reason = textOf((r as any).reasonCode?.[0]);
          add((r as any).id, [date, type, provider, reason]);
        } else if (t === 'Observation') {
          const isLab = (r as any).category?.some((c: any) => c.coding?.some((cc: any) => (cc.code === 'laboratory' || cc.display?.toLowerCase() === 'laboratory')));
          if (!isLab) continue;
          const test = textOf((r as any).code);
          const date = (r as any).effectiveDateTime || '';
          const val = (r as any).valueQuantity?.value ?? (r as any).valueString ?? '';
          const unit = (r as any).valueQuantity?.unit || '';
          const range = (r as any).referenceRange?.[0]?.text || '';
          add((r as any).id, [test, date, val, unit, range]);
        } else if (t === 'AllergyIntolerance') {
          const allergen = textOf((r as any).code);
          const reaction = (r as any).reaction?.[0]?.manifestation?.[0]?.text || '';
          const severity = (r as any).reaction?.[0]?.severity || '';
          add((r as any).id, [allergen, reaction, severity]);
        } else if (t === 'Procedure') {
          const proc = textOf((r as any).code);
          const date = (r as any).performedDateTime || '';
          const status = (r as any).status || '';
          add((r as any).id, [proc, date, status]);
        } else if (t === 'CarePlan') {
          const plan = (r as any).title || (r as any).category?.[0]?.text || '';
          const start = (r as any).period?.start || '';
          const end = (r as any).period?.end || '';
          const status = (r as any).status || '';
          add((r as any).id, [plan, start, end, status]);
        } else if (t === 'DocumentReference') {
          const doc = textOf((r as any).type) || (r as any).category?.[0]?.text || '';
          const author = (r as any).author?.[0]?.display || '';
          const date = (r as any).date || (r as any).created || '';
          const org = (r as any).custodian?.display || '';
          const dataB64 = (r as any).content?.[0]?.attachment?.data || '';
          const safeData = dataB64 ? '[click to view]' : '';
          add((r as any).id, [doc, author, date, org]);
        }
      }
    }
    if (sectionId && this.sortState[sectionId]) {
      const { key, dir } = this.sortState[sectionId];
      const keys = this.sections.find(s => s.id === sectionId)?.keys || [];
      const colIndex = keys.indexOf(key);
      if (colIndex >= 0) {
        rows.sort((a, b) => {
          const av = a.cols[colIndex] || '';
          const bv = b.cols[colIndex] || '';
          if (av === bv) return 0;
          return dir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
        });
      }
    }
    return rows;
  }

  thresholdBadgeClass(): string {
    if (this.confidenceThreshold >= 0.8) return 'text-bg-success';
    if (this.confidenceThreshold >= 0.4) return 'text-bg-warning';
    return 'text-bg-secondary';
  }
}


