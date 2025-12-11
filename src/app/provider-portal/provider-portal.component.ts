// Author: Abhishek Dhadwal
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Bundle, Consent, FhirResource, Organization, Patient } from 'fhir/r5';
import { ToastrService } from 'ngx-toastr';
import { OrganizationService } from '../organization.service';
import { ConsentService } from '../consent/consent.service';
import { PatientService } from '../patient.service';
import { CdsService } from '../cds/cds.service';
import { BackendService } from '../backend/backend.service';
import { Card, DataSharingCDSHookRequest } from '@asushares/core';

type ResourceGroups = { [resourceType: string]: FhirResource[] };

@Component({
  selector: 'app-provider-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container my-4">
      <div class="d-flex align-items-center mb-3">
        <h1 class="h4 mb-0">Provider Portal</h1>
      </div>

      <!-- step 1: select organization and purposes -->
      <div *ngIf="step==='provider'" class="card mb-3">
        <div class="card-header fw-semibold">Select Organization and Purposes</div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-6">
              <label class="form-label">Organization</label>
              <div class="input-group input-group-sm">
                <input class="form-control" [(ngModel)]="orgSearchText" placeholder="search organizations"/>
                <button class="btn btn-outline-primary" type="button" (click)="searchOrganizations()">Search</button>
              </div>
              <div *ngIf="orgResults" class="table-responsive mt-2 scroll-table">
                <table class="table table-sm align-middle">
                  <thead><tr><th>Name</th><th>ID</th><th></th></tr></thead>
                  <tbody>
                  <tr *ngFor="let e of orgResults.entry">
                    <td>{{ e.resource?.name }}</td>
                    <td>{{ e.resource?.id }}</td>
                    <td><button class="btn btn-sm btn-outline-primary" (click)="selectOrganization(e.resource)">Select</button></td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div *ngIf="selectedOrg" class="mt-2">
                <span class="badge text-bg-secondary">Selected: {{ selectedOrg?.name }} ({{ selectedOrg?.id }})</span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2 fw-semibold small text-uppercase text-muted">Purposes</div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="p_treatment" [(ngModel)]="purposes.treatment">
                <label class="form-check-label" for="p_treatment">Treatment (HIPAAConsentCD)</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="p_research" [(ngModel)]="purposes.research">
                <label class="form-check-label" for="p_research">Research (RESEARCH)</label>
              </div>
              <div class="mt-3">
                <label class="form-label small mb-1">Consent Mode</label>
                <select class="form-select form-select-sm" [(ngModel)]="consentMode">
                  <option value="standard">Standard</option>
                  <option value="mostRecent">Most Recent</option>
                  <option value="highest">Highest Watermark</option>
                </select>
              </div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary" (click)="continueToPatients()" [disabled]="!selectedOrg">Continue</button>
          </div>
        </div>
      </div>

      <!-- step 2: patients available to org -->
      <div *ngIf="step==='patients'" class="card mb-3">
        <div class="card-header d-flex align-items-center">
          <span class="fw-semibold">Available Patients</span>
          <span class="ms-auto small text-muted">org: {{ selectedOrg?.name }} ({{ selectedOrg?.id }})</span>
        </div>
        <div class="card-body">
          <div *ngIf="patients.length === 0" class="text-muted small">No patients found</div>
          <div *ngIf="patients.length > 0" class="table-responsive">
            <table class="table table-sm align-middle">
              <thead><tr><th>Name</th><th>ID</th><th>Consents</th><th></th></tr></thead>
              <tbody>
              <tr *ngFor="let p of patients">
                <td>{{ p.display }}</td>
                <td>{{ p.id }}</td>
                <td>{{ (consentsByPatient[p.id] || []).length }}</td>
                <td><button class="btn btn-sm btn-outline-primary" (click)="selectPatient(p.id)">Select</button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-2">
            <button class="btn btn-outline-secondary" (click)="step='provider'">Back</button>
          </div>
        </div>
      </div>

      <!-- step 3: patient view (allowed-only) -->
      <div *ngIf="step==='view'" class="card mb-3">
        <div class="card-header d-flex align-items-center gap-2">
          <span class="fw-semibold">Patient Data (Allowed Only)</span>
          <span class="ms-auto small text-muted">patient: {{ selectedPatientDisplay }} ({{ selectedPatientId }})</span>
        </div>
        <div class="card-body">
          <div class="row g-3 align-items-center">
            <div class="col-md-6">
              <label class="form-label small mb-1">Consent</label>
              <select class="form-select form-select-sm" [(ngModel)]="selectedConsentId" (ngModelChange)="applyConsent()" [disabled]="consentSelectorDisabled">
                <option *ngFor="let c of patientConsents" [value]="c.id">{{ labelForConsent(c) }}</option>
              </select>
              <div *ngIf="consentSelectorDisabled" class="muted-caption">Auto-applied by Consent Mode</div>
            </div>
            <div class="col-md-6 text-end">
              <button class="btn btn-outline-success btn-sm" type="button" (click)="transferToServer()" [disabled]="!redactedBundle">Transfer to Server</button>
            </div>
          </div>
          <hr />
          <div *ngIf="!redactedBundle" class="text-muted small">Select a consent to view data</div>
          <div *ngIf="redactedBundle">
            <div class="mb-2">
              <span class="badge text-bg-secondary">resources: {{ totalAllowedCount() }}</span>
              <span class="badge text-bg-light border ms-1" *ngFor="let k of resourceTypeKeys()">{{ k }}: {{ grouped[k].length }}</span>
            </div>
            <!-- simulator-like table -->
            <div class="table-responsive mb-3">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Source Data Link</th>
                    <th>Codings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of allowedResources()">
                    <td>
                      <a [href]="resourceHref(r)" target="_blank">
                        {{ r.resourceType }}
                      </a>
                    </td>
                    <td>
                      <span *ngFor="let c of codingsFor(r)" class="badge rounded-pill text-bg-light me-1">
                        {{ c.display || c.code }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngFor="let k of resourceTypeKeys()" class="mb-3">
              <div class="fw-semibold text-capitalize mb-1">{{ k }}</div>
              <ul class="list-group list-group-flush small">
                <li class="list-group-item" *ngFor="let r of grouped[k] | slice:0:20">
                  <span class="text-muted">{{ r.id }}</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-2">
            <button class="btn btn-outline-secondary" (click)="step='patients'">back</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .badge { font-size: .72rem; }
    .scroll-table { max-height: 260px; overflow: auto; }
    .muted-caption { font-size: .78rem; color: #6c757d; margin-top: .25rem; }
    .table-sm th, .table-sm td { vertical-align: middle; }
    .truncate { display: inline-block; max-width: 22rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
  `]
})
export class ProviderPortalComponent {
  step: 'provider' | 'patients' | 'view' = 'provider';

  // step 1
  orgSearchText = '';
  orgResults: Bundle<Organization> | null = null;
  selectedOrg: Organization | null = null;
  purposes = { treatment: true, research: false };
  consentMode: 'standard' | 'mostRecent' | 'highest' = 'standard';

  // step 2
  consentsRaw: Consent[] = [];
  consentsByPatient: { [patientId: string]: Consent[] } = {};
  patients: { id: string, display: string }[] = [];

  // step 3
  selectedPatientId: string | null = null;
  selectedPatientDisplay = '';
  patientConsents: Consent[] = [];
  selectedConsentId: string | null = null;
  redactedBundle: Bundle | null = null;
  grouped: ResourceGroups = {};
  consentSelectorDisabled = false;

  constructor(private orgService: OrganizationService,
              private consentService: ConsentService,
              private patientService: PatientService,
              private cdsService: CdsService,
              private backendService: BackendService,
              private http: HttpClient,
              private toastr: ToastrService) {}

  // step 1
  searchOrganizations() {
    if (!this.orgSearchText || this.orgSearchText.trim() === '') return;
    this.orgService.search(this.orgSearchText).subscribe({
      next: b => this.orgResults = b,
      error: () => this.toastr.error('unable to search organizations', 'error')
    });
  }

  selectOrganization(o?: Organization) {
    if (!o) return;
    this.selectedOrg = o;
  }

  continueToPatients() {
    if (!this.selectedOrg || !this.selectedOrg.id) return;
    this.loadConsentsForController(this.selectedOrg.id);
  }

  // step 2
  private loadConsentsForController(orgId: string) {
    const base = this.consentService.url();
    const url = `${base}?controller=Organization/${encodeURIComponent(orgId)}&status=active&_count=100&_sort=-_lastUpdated`;
    const headers = (this.consentService as any).backendService.headers();
    this.http.get<Bundle<Consent>>(url, { headers }).subscribe({
      next: (b) => {
        const entries = (b.entry || []).map(e => e.resource as Consent).filter(Boolean);
        const filtered = this.filterConsentsByPurpose(entries);
        this.consentsRaw = filtered;
        const allByPatient: { [patientId: string]: Consent[] } = {};
        filtered.forEach(c => {
          const ref = c.subject?.reference || '';
          const pid = ref.startsWith('Patient/') ? ref.substring('Patient/'.length) : '';
          if (!pid) return;
          if (!allByPatient[pid]) allByPatient[pid] = [];
          allByPatient[pid].push(c);
        });
        // apply consent mode
        this.consentsByPatient = {};
        Object.keys(allByPatient).forEach(pid => {
          const list = allByPatient[pid];
          if (this.consentMode === 'standard') {
            this.consentsByPatient[pid] = list;
          } else if (this.consentMode === 'mostRecent') {
            // server returned sorted by lastUpdated desc; pick first
            this.consentsByPatient[pid] = list.length ? [list[0]] : [];
          } else {
            const pick = this.pickHighestWatermark(list);
            this.consentsByPatient[pid] = pick ? [pick] : [];
          }
        });
        this.loadPatientSummaries(Object.keys(this.consentsByPatient));
      },
      error: () => this.toastr.error('unable to load consents', 'error')
    });
  }

  private filterConsentsByPurpose(consents: Consent[]): Consent[] {
    const wantTreatment = !!this.purposes.treatment;
    const wantResearch = !!this.purposes.research;
    if (!wantTreatment && !wantResearch) return consents;
    const wanted = new Set<string>();
    if (wantTreatment) wanted.add('HIPAAConsentCD');
    if (wantResearch) wanted.add('RESEARCH');
    const ok = (c: Consent) => {
      const provs = (c.provision || []) as any[];
      for (const p of provs) {
        const arr = (p.purpose || []) as any[];
        for (const pu of arr) {
          if (pu?.code && wanted.has(pu.code)) return true;
        }
      }
      return false;
    };
    return consents.filter(ok);
  }

  private loadPatientSummaries(ids: string[]) {
    this.patients = [];
    if (ids.length === 0) {
      this.step = 'patients';
      return;
    }
    let remaining = ids.length;
    ids.forEach(id => {
      this.patientService.get(id).subscribe({
        next: (p) => {
          const disp = this.patientDisplay(p);
          this.patients.push({ id, display: disp });
          remaining--;
          if (remaining === 0) this.step = 'patients';
        },
        error: () => {
          this.patients.push({ id, display: id });
          remaining--;
          if (remaining === 0) this.step = 'patients';
        }
      });
    });
  }

  private patientDisplay(p: Patient): string {
    if (!p || !p.name || p.name.length === 0) return p.id || '';
    const parts: string[] = [];
    if (p.name[0].given) parts.push(...p.name[0].given);
    if (p.name[0].family) parts.push(p.name[0].family);
    return parts.join(' ');
  }

  selectPatient(id: string) {
    this.selectedPatientId = id;
    this.selectedPatientDisplay = (this.patients.find(x => x.id === id)?.display) || id;
    this.patientConsents = (this.consentsByPatient[id] || []);
    this.selectedConsentId = this.patientConsents.length > 0 ? (this.patientConsents[0].id || null) : null;
    this.consentSelectorDisabled = (this.consentMode !== 'standard');
    this.step = 'view';
    this.applyConsent();
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

  private pickHighestWatermark(consents: Consent[]): Consent | null {
    if (!consents || consents.length === 0) return null;
    const decisionOf = (c: Consent) => ((c as any)?.decision || '').toString().toLowerCase();
    const countLabels = (c: Consent) => {
      const provs: any[] = ((c as any).provision || []) as any[];
      let n = 0;
      provs.forEach(p => n += ((p?.securityLabel || []).length));
      return n;
    };
    const deny = consents.filter(c => decisionOf(c) === 'deny');
    // 1) any deny with 0 labels
    const denyZero = deny.find(c => countLabels(c) === 0);
    if (denyZero) return denyZero;
    // 2) among deny, fewest labels
    if (deny.length > 0) {
      let best = deny[0];
      let bestN = countLabels(best);
      for (let i = 1; i < deny.length; i++) {
        const n = countLabels(deny[i]);
        if (n < bestN) { best = deny[i]; bestN = n; }
      }
      return best;
    }
    // 3) among permit, most labels
    const permit = consents.filter(c => decisionOf(c) === 'permit');
    if (permit.length > 0) {
      let best = permit[0];
      let bestN = countLabels(best);
      for (let i = 1; i < permit.length; i++) {
        const n = countLabels(permit[i]);
        if (n > bestN) { best = permit[i]; bestN = n; }
      }
      return best;
    }
    // fallback: first
    return consents[0] || null;
  }
  applyConsent() {
    if (!this.selectedPatientId || !this.selectedConsentId) {
      this.redactedBundle = null;
      this.grouped = {};
      return;
    }
    const consent = this.patientConsents.find(c => c.id === this.selectedConsentId);
    if (!consent) {
      this.redactedBundle = null;
      this.grouped = {};
      return;
    }
    this.fetchEverythingAndRedact(this.selectedPatientId, consent);
  }

  private fetchEverythingAndRedact(patientId: string, consent: Consent) {
    const headers = this.backendService.headers();
    const startUrl = `${this.backendService.url}/Patient/${encodeURIComponent(patientId)}/$everything?_count=1000`;
    const entries: any[] = [];
    const collect = (url: string) => {
      this.http.get<Bundle>(url, { headers }).subscribe({
        next: (b) => {
          (b.entry || []).forEach(e => { if (e.resource) entries.push({ resource: e.resource }); });
          const nextLink = (b.link || []).find((l: any) => l.relation === 'next') as any;
          if (nextLink && nextLink.url) {
            collect(nextLink.url);
          } else {
            const everything: Bundle = { resourceType: 'Bundle', type: 'collection', entry: entries } as Bundle;
            this.labelAndBuildRedacted(patientId, everything, consent);
          }
        },
        error: () => this.toastr.error('unable to fetch patient data', 'error')
      });
    };
    collect(startUrl);
  }

  private labelAndBuildRedacted(patientId: string, everything: Bundle, consent: Consent) {
    const req = new DataSharingCDSHookRequest();
    req.context.patientId = [{ value: 'Patient/' + patientId }];
    req.context.content = everything;
    const toastId = this.toastr.info('labeling resources...', 'cds', { timeOut: 0, extendedTimeOut: 0 }).toastId;
    this.cdsService.patientConsentConsult(req, '0.0').subscribe({
      next: (result: Card | any) => {
        this.toastr.clear(toastId);
        const labeledResources: FhirResource[] = (result?.extension?.content?.entry || [])
          .map((x: any) => x.resource)
          .filter((r: any) => !!r);
        const labelsById: { [id: string]: string[] } = {};
        (labeledResources as any[]).forEach((r: any) => {
          if (!r?.id) return;
          labelsById[r.id] = ((r.meta?.security || []) as any[]).map(s => s?.code).filter(Boolean);
        });
        const masked = new Set<string>();
        try {
          (consent.provision || []).forEach((p: any) => (p.securityLabel || []).forEach((sl: any) => { if (sl?.code) masked.add(sl.code); }));
        } catch {}
        const denied = new Set<string>();
        Object.keys(labelsById).forEach(rid => {
          const labels = labelsById[rid] || [];
          if (labels.some(c => masked.has(c))) denied.add(rid);
        });
        // build redacted bundle: include only allowed
        const allowedEntries: any[] = [];
        (everything.entry || []).forEach(e => {
          const r: any = e.resource;
          const rid = r?.id as string | undefined;
          if (rid && denied.has(rid)) return;
          allowedEntries.push({ resource: r });
        });
        this.redactedBundle = { resourceType: 'Bundle', type: 'collection', entry: allowedEntries } as Bundle;
        this.grouped = this.groupByType(allowedEntries.map(x => x.resource as FhirResource));
        this.toastr.success('applied consent view', 'view');
      },
      error: () => {
        this.toastr.clear(toastId);
        this.toastr.error('cds labeling failed', 'error');
      }
    });
  }

  private groupByType(resources: FhirResource[]): ResourceGroups {
    const g: ResourceGroups = {};
    resources.forEach(r => {
      const t = (r as any)?.resourceType || 'Unknown';
      if (!g[t]) g[t] = [];
      g[t].push(r);
    });
    return g;
  }

  resourceTypeKeys(): string[] {
    return Object.keys(this.grouped).sort();
    }

  totalAllowedCount(): number {
    return (this.redactedBundle?.entry || []).length;
  }

  transferToServer() {
    if (!this.redactedBundle) return;
    const url = prompt('enter HAPI FHIR base URL (e.g., https://example.com/fhir)');
    if (!url || !url.trim()) return;
    const target = url.replace(/\/+$/,'');
    // convert allowed-only bundle to transaction so resources are created on the recipient
    const entries = (this.redactedBundle.entry || []).map(e => e.resource as any).filter(Boolean);
    // ensure non-numeric ids to satisfy HAPI rule and rewrite references
    const idMap: { [oldRef: string]: string } = {};
    entries.forEach(r => {
      if (r?.id && this.isPureNumericId(r.id)) {
        const oldRef = `${r.resourceType}/${r.id}`;
        r.id = `id-${r.id}`;
        const newRef = `${r.resourceType}/${r.id}`;
        idMap[oldRef] = newRef;
      }
    });
    const rewriteRefs = (obj: any) => {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach(rewriteRefs);
        return;
      }
      if (typeof obj !== 'object') return;
      Object.keys(obj).forEach(k => {
        const v = obj[k];
        if (k === 'reference' && typeof v === 'string' && idMap[v]) {
          obj[k] = idMap[v];
        } else {
          rewriteRefs(v);
        }
      });
    };
    entries.forEach(rewriteRefs);
    const tx: Bundle = { resourceType: 'Bundle', type: 'transaction', entry: [] } as Bundle;
    entries.forEach((r: any) => {
      const hasId = !!r.id;
      const rt = r.resourceType;
      const req: any = hasId ? { method: 'PUT', url: `${rt}/${r.id}` } : { method: 'POST', url: `${rt}` };
      (tx.entry as any[]).push({ resource: r, request: req });
    });
    let headers = this.backendService.headers();
    headers = headers.set('Content-Type', 'application/fhir+json').set('Accept', 'application/fhir+json');
    this.http.post(target, tx, { headers }).subscribe({
      next: () => this.toastr.success('data transferred', 'success'),
      error: () => this.toastr.error('transfer failed', 'error')
    });
  }

  // helpers for simulator-like view
  allowedResources(): FhirResource[] {
    return (this.redactedBundle?.entry || []).map(e => e.resource as FhirResource);
  }

  codingsFor(r: FhirResource) {
    const codings: any[] = [];
    const data: any = r as any;
    if (data?.code?.coding instanceof Array) codings.push(...data.code.coding);
    if (data?.medication?.concept?.coding instanceof Array) codings.push(...data.medication.concept.coding);
    return codings;
  }

  resourceHref(r: FhirResource): string {
    const rt = (r as any)?.resourceType || '';
    const id = (r as any)?.id || '';
    return `${this.backendService.url}/${rt}/${id}`;
  }

  private isPureNumericId(id: string): boolean {
    return /^[0-9]+$/.test(id);
  }
}


