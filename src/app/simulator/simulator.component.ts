// Author: Preston Lee

import { ChangeDetectorRef, Component } from '@angular/core';
import { Bundle, CodeableConcept, Coding, Consent, ConsentProvision, FhirResource, Organization, Parameters, Patient, Resource } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

import { OrganizationService } from '../organization.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatientService } from '../patient.service';
import { Card, ConsentCategorySettings, ConsentDecision, ConsentExtension, ConsentTemplate, DataSharingCDSHookRequest, DataSharingEngineContext, DenyCard, PermitCard } from '@asushares/core';
import { ConsentBasedComponent } from '../consent/consent-based.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorySelectorComponent } from "../provision-selector/category-selector.component";
import { PurposeSelectorComponent } from '../provision-selector/purpose-selector.component';
import { LibraryService } from '../library/library.service';
import { BackendService } from '../backend/backend.service';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { forkJoin, interval, Observable, switchMap, takeWhile } from 'rxjs';
import { ExportMetadata } from '../backend/export_metadata';
import { CdsService } from '../cds/cds.service';
import { WebDataSharingEngine } from './web_data_sharing_engine';
import { WebRuleProvider } from './web_rule_provider';


@Component({
    selector: 'simulator',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CategorySelectorComponent, CategorySelectorComponent, PurposeSelectorComponent],
    templateUrl: './simulator.component.html',
    styleUrls: ['./simulator.component.scss']
})
export class SimulatorComponent extends ConsentBasedComponent {

    engineType: EngineType = EngineType.CDS_HOOKS;
    categoryMode: FilterMode = FilterMode.ALL;
    purposeMode: FilterMode = FilterMode.ALL;

    dummyProvision: ConsentProvision = ConsentTemplate.templateProvision();

    prefetchStatus: 'ready' | 'exporting' | 'collecting' | 'complete' = 'ready';
    prefetchStatusMessage: string = '';
    prefetchRequestLastPolled: Date | null = null;
    prefetchExportMetadata: ExportMetadata | null = null;
    prefetchResourcesRaw: FhirResource[] | null = null;
    prefetchResourcesLabeled: FhirResource[] | null = null;

    categorySettings: ConsentCategorySettings = new ConsentCategorySettings();

    sharingDecisionMode: ConsentDecision = ConsentDecision.NO_CONSENT;

    loadConsentFailed(c_id: string) {
        this.toastService.showErrorToast('Could Not Load', 'Consent ID ' + c_id + ' could not be loaded. Form put into creation mode instead.');
        this.reset();
    }

    loadConsentSucceeded(consent: Consent) {
        this.toastService.showSuccessToast('Consent Loaded', 'Any saved updates will overwrite the existing consent document.');
    }

    constructor(public override route: ActivatedRoute,
        protected override organizationService: OrganizationService,
        protected override patientService: PatientService,
        protected override consentService: ConsentService,
        protected cdsService: CdsService,
        protected libraryService: LibraryService,
        protected backendService: BackendService,
        protected http: HttpClient,
        protected toastService: ToastService,
        protected cdr: ChangeDetectorRef) {
        super(route, organizationService, patientService, consentService);
        this.route.paramMap.subscribe(pm => {
            let c_id = pm.get('consent_id')!;
            if (c_id) {
                this.loadConsent(c_id);
            } else {
                this.reset();
            }
        });
    }

    reset() {
        this.setStatusReady();
        this.resetSimulationResults();
    }

    engineTypes() {
        return EngineType;
    }
    filterModes() {
        return FilterMode;
    }
    codingsFor(r: FhirResource) {
        let codings: Coding[] = [];
        let data = r as any;
        if (data.code && data.code.coding instanceof Array) {
            codings.push(...data.code.coding);
        }
        // MedicationStatement
        if (data.medication?.concept?.coding instanceof Array) {
            codings.push(...data.medication.concept.coding);
        }
        return codings;
    }


    selectAllCategories(enabled: boolean) {
        this.categorySettings.allCategories().forEach(c => {
            c.enabled = enabled;
        });
    }

    randomize() {
        console.log('Randomizing...');
        // let categorySettings = new ConsentCategorySettings();
        this.categorySettings.allCategories().forEach(c => {
            c.enabled = (Math.random() > 0.5);
        });
        this.categoryMode = Math.random() > 0.5 ? FilterMode.ONLY : FilterMode.EXCEPT;
        this.categorySettings.allPurposes().forEach(p => {
            p.enabled = (Math.random() > 0.5);
        });
        this.purposeMode = Math.random() > 0.5 ? FilterMode.ONLY : FilterMode.EXCEPT;
        // let tmp = ConsentTemplate.templateProvision();
        // categorySettings.updateConsentProvision(tmp);
        // this.dummyProvision = tmp;
        this.categorySettings.updateConsentProvision(this.dummyProvision);
        // // this.cdr.detectChanges();
    }

    categoryNameFor(code: string) {
        return this.categorySettings.categoryForCode(code)?.name || (code + ' (Unknown)');
    }

    resourceShownForLabelFilter(resource: FhirResource) {
        let labelShown = false;
        if (this.categoryMode === FilterMode.ALL) {
            labelShown = true;
        } else if (this.categoryMode === FilterMode.ONLY) {
            // this.dummyProvision.
            this.categorySettings.allCategories().forEach((c) => {
                if (c.enabled) {
                    resource.meta?.security?.forEach((s) => {
                        if (s.code === c.act_code) {
                            // console.log('SHOWN:', resource.resourceType, resource.id, c.act_code, s.code, c.enabled);                            
                            labelShown = true;
                        }
                    });
                }
            });
        } else if (this.categoryMode === FilterMode.EXCEPT) {
            labelShown = true;
            this.categorySettings.allCategories().forEach((c) => {
                resource.meta?.security?.forEach((s) => {
                    if (s.code === c.act_code && c.enabled) {
                        labelShown = false;
                    }
                });
            });
        }
        return labelShown;
    }
    resourceShownForConsentFilter(resource: FhirResource) {
        // TODO Implement Consent decision filtering.
        return true;
    }
    resourceShownForSharingFilter(resource: FhirResource) {
        let labelShown = false;
        if (this.sharingDecisionMode === ConsentDecision.NO_CONSENT) {
            labelShown = true;
        } else if (this.sharingDecisionMode === ConsentDecision.CONSENT_PERMIT) {
            const d = this.consentDecisions[resource.id!];
            if (d.summary == ConsentDecision.CONSENT_PERMIT) {
                labelShown = true;
            }
        } else if (this.sharingDecisionMode === ConsentDecision.CONSENT_DENY) {
            const d = this.consentDecisions[resource.id!];
            if (d.summary == ConsentDecision.CONSENT_DENY) {
                labelShown = true;
            }
        }
        return labelShown;
    }

    resourceShown(resource: FhirResource) {
        let labelShown = this.resourceShownForLabelFilter(resource);
        let consentShown = this.resourceShownForConsentFilter(resource);
        let sharingShown = this.resourceShownForSharingFilter(resource);
        return labelShown && consentShown && sharingShown;
    }

    canSimulate() {
        switch (this.engineType) {
            case EngineType.CDS_HOOKS:
                return this.prefetchStatus == 'complete'
            case EngineType.CQL:
                return this.prefetchStatus == 'ready' || this.prefetchStatus == 'complete';
            case EngineType.AI:
                return false;
            default:
                return false;
        }
    }

    pollUntillCompleted(location: string) {
        this.prefetchStatus = 'exporting';
        return interval(5000)
            .pipe(
                switchMap(() =>
                    this.backendService.exportPoll(location)
                ),
                takeWhile(({ status }) => {
                    return status !== 200;
                })
            )
    }


    collectAll(meta: ExportMetadata) {
        this.setStatusCollecting();
        const allObs: Observable<string>[] = [];
        meta.output.forEach((output) => {
            console.log('Collecting:', output.url);
            // let            headers = new HttpHeaders();
            const obs = this.http.get(output.url, { responseType: 'text' });
            allObs.push(obs);
        });
        console.log('Waiting to retrieve all NDJSON files:', allObs.length);
        return forkJoin(allObs);
    }


    setStatusReady() {
        this.prefetchStatus = 'ready';
        this.prefetchStatusMessage = '';
        this.prefetchRequestLastPolled = null;
        this.prefetchExportMetadata = null;
        this.prefetchResourcesRaw = [];
    }

    setStatusExporting() {
        this.prefetchStatus = 'exporting';
        this.prefetchStatusMessage = '';
    }

    setStatusCollecting() {
        this.prefetchStatus = 'collecting';
        this.prefetchStatusMessage = '';
    }

    setStatusComplete() {
        this.prefetchStatus = 'complete';
        this.prefetchStatusMessage = '';
    }

    recollectPatientData() {
        if (this.prefetchExportMetadata) {
            this.setStatusCollecting();
            this.collectAll(this.prefetchExportMetadata).subscribe({
                next: (data) => {
                    console.log('Collected:', data.length, 'types.');
                    let all: FhirResource[] = [];
                    data.forEach((d) => {
                        // console.log('Parsing:');
                        // let d = response.body as string;
                        // console.log(d);
                        d.split('\n').forEach((line) => {
                            line = line.trim();
                            if (line.length > 0) {
                                let r = JSON.parse(line) as FhirResource;
                                console.log('Parsed resource: ', r.resourceType, '/', r.id);
                                all.push(r);
                            } else {
                                console.log('Skipping empty line.');
                            }
                        });
                    });
                    this.prefetchResourcesRaw = all;
                    console.log(this.prefetchResourcesRaw);
                    this.setStatusComplete();
                },
                error: (err) => {
                    console.error('Failed to collect:', err);
                    this.setStatusReady();
                }
            });
        } else {
            this.setStatusReady();
        }
    }

    getPatientData() {
        if (this.patientSelected) {
            this.backendService.exportRequest(this.patientSelected).subscribe({
                next: outcome => {
                    console.log('Requested export of patient data for:', this.patientSelected!.id);
                    const poll_location = outcome.headers.get('Content-Location');
                    console.log('Content-Location:', poll_location);
                    this.prefetchStatus = 'exporting';
                    if (poll_location) {
                        this.pollUntillCompleted(poll_location).subscribe({
                            next: (outcome) => {
                                console.log('Polling for export to be complete...');
                                this.prefetchRequestLastPolled = new Date();
                                let progress = outcome.headers.get('X-Progress');
                                if (progress) {
                                    this.prefetchStatusMessage = progress;
                                } else {
                                    this.prefetchStatusMessage = 'Exporting...';
                                }
                            },
                            error: (err) => {
                                console.error(err);
                            },
                            complete: () => {
                                console.log('Export is ready!');
                                this.backendService.exportPoll(poll_location).subscribe({
                                    next: (poll_response) => {
                                        console.log('Export metadata.');
                                        if (poll_response.body) {
                                            this.prefetchExportMetadata = poll_response.body as ExportMetadata;
                                            this.recollectPatientData();
                                        } else {
                                            console.error('Polling export of patient data for:', this.patientSelected!.id, 'failed with status:', poll_response.status);
                                            this.setStatusReady();
                                        }
                                    }
                                });
                            }
                        }
                        );
                    }
                    // console.log('Body:', outcome.body);
                }, error: e => {
                    console.error('Failed to request export of patient data for:', this.patientSelected!.id);
                    console.error('Error:', e);
                }
            });
        }
    }

    resetSimulationResults() {
        this.prefetchResourcesLabeled = null;
    }

    simulate() {
        this.resetSimulationResults();
        switch (this.engineType) {
            case EngineType.CDS_HOOKS:
                this.simulateCdsHooks();
                break;
            case EngineType.CQL:
                this.simulateCql();
                break;
            case EngineType.AI:
                this.toastService.showInfoToast('AI Engine Not Implemented', 'The AI engine is not yet implemented.');
                break;
            default:
                break;
        }
    }

    consentDecisions: { [key: string]: Card } = {};

    calculateConsentDecisions(request: DataSharingCDSHookRequest) {
        this.consentDecisions = {};
        const ruleProvider = new WebRuleProvider();
        const engine = new WebDataSharingEngine(ruleProvider, 0.0, false);
        this.prefetchResourcesLabeled?.forEach((r) => {
            let decision = new ConsentExtension(null);
            let shouldShare = !engine.shouldRedactFromLabels(decision, r);
            console.log('Decision:', r.resourceType, r.id, shouldShare);
            if (shouldShare) {
                this.consentDecisions[r.id!] = new PermitCard();
            } else {
                this.consentDecisions[r.id!] = new DenyCard();
            }
        });
    }
    consentDecisionTypes() {
        return ConsentDecision;
    }
    simulateCdsHooks() {
        if (this.patientSelected) {
            const data = new DataSharingCDSHookRequest();
            const bundle: Bundle = { resourceType: 'Bundle', type: 'collection', entry: [] };
            data.context.patientId = [{ value: 'Patient/' + this.patientSelected.id }];
            this.prefetchResourcesRaw?.forEach((r) => {
                bundle.entry!.push({ resource: r });
            });
            data.context.content = bundle;
            this.cdsService.patientConsentConsult(data).subscribe({
                next: (result) => {
                    console.log('Result: ', result);
                    if (result.extension.content?.entry) {
                        console.log('Entries:', result.extension.content.entry.length);
                        this.prefetchResourcesLabeled = result.extension.content.entry.map(e => e.resource).filter(r => r !== undefined);
                        this.calculateConsentDecisions(data);
                    }
                }, error: (err) => {
                    console.error('Error: ', err);
                }
            });
        } else {
            this.toastService.showErrorToast('No Patient Selected', 'Please select a patient before simulating.');
        }
    }

    simulateCql() {
        const parameters: Parameters = {
            resourceType: 'Parameters',
            parameter: [
                {
                    name: 'library',
                    valueString: 'Label_BehavioralHealth'
                },
                {
                    "name": "expression",
                    "valueString": "Applies"
                },
                {
                    "name": "expression",
                    "valueString": "GetBehavioralData"
                },
                {
                    "name": "useServerData",
                    "valueBoolean": false
                },
                {
                    "name": "patient",
                    "valueString": "Patient/cfsb1703736930464"
                },
                {
                    name: 'data',
                    resource: {
                        "resourceType": "Bundle",
                        "type": "collection",
                        "entry": [{
                            "name": "data",
                            "resource": {
                                "resourceType": "Bundle",
                                "type": "collection",
                                "entry": [
                                    {
                                        "resource": {
                                            "resourceType": "Condition",
                                            "id": "cond1",
                                            "code": {
                                                "coding": [
                                                    {
                                                        "system": "http://snomed.info/sct",
                                                        "code": "13746004",
                                                        "display": "Bipolar disorder"
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        "resource": {
                                            "resourceType": "MedicationRequest",
                                            "id": "med1",
                                            "medicationCodeableConcept": {
                                                "coding": [
                                                    {
                                                        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                                                        "code": "94610",
                                                        "display": "Xanax (alprazolam)"
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        "resource": {
                                            "resourceType": "Observation",
                                            "id": "obs1",
                                            "code": {
                                                "coding": [
                                                    {
                                                        "system": "http://loinc.org",
                                                        "code": "19359-9",
                                                        "display": "Cocaine [Presence] in Urine by Screen method"
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        } as any
                        ]
                    }

                }
            ]
        }
        this.libraryService.evaluate('840', parameters).subscribe({
            next: (result) => {
                console.log('Result: ', result);
            }, error: (err) => {
                console.error('Error: ', err);
            }
        });
    }

    fakeExport() {
        this.prefetchExportMetadata = {
            "transactionTime": "2024-12-17T19:38:56.054+00:00",
            "request": "http://localhost:8080/fhir/Patient/fake/$export",
            "requiresAccessToken": false,
            "output": [],
            "error": []
        }
        // this.prefetchExportMetadata = {
        //     "transactionTime": "2024-12-17T21:57:56.046+00:00",
        //     "request": "http://localhost:8080/fhir/Patient/cfsb1702939072210/$export",
        //     "requiresAccessToken": true,
        //     "output": [{
        //         "type": "Condition",
        //         "url": "http://localhost:8080/fhir/Binary/mUW0lNhhvqJ8PcCOxV2tbETGtr655Qn5"
        //     }, {
        //         "type": "AllergyIntolerance",
        //         "url": "http://localhost:8080/fhir/Binary/pQ4id2304wG8st3Kg7fkSl0nmZL8FR9f"
        //     }, {
        //         "type": "Consent",
        //         "url": "http://localhost:8080/fhir/Binary/cMt7UdaQnl5Z1tZzx4dLq6eIaHl95LHH"
        //     }, {
        //         "type": "Observation",
        //         "url": "http://localhost:8080/fhir/Binary/kS1ZWwl8bSy06LGlx5fY0nV388IF2aTU"
        //     }, {
        //         "type": "Procedure",
        //         "url": "http://localhost:8080/fhir/Binary/0my1VqkInaQaAo2X5wqKPsGAVCdnIlsq"
        //     }, {
        //         "type": "Patient",
        //         "url": "http://localhost:8080/fhir/Binary/3u3GtqcBWFHWBIGfCD59IAkSJdGV8z4F"
        //     }, {
        //         "type": "MedicationStatement",
        //         "url": "http://localhost:8080/fhir/Binary/7s3eueqIuNYfX678IH5NI8AQ2laZGiUN"
        //     }],
        //     "error": []
        // };
        this.prefetchResourcesRaw = [
            {
                "resourceType": "Condition",
                "id": "cfsb1703567003500",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "191611001",
                            "display": "Recurrent major depressive episodes, moderate"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567085984",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "386805003",
                            "display": "Mild cognitive disorder"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567132494",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "44054006",
                            "display": "Type 2 diabetes mellitus"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567161720",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "38341003",
                            "display": "Hypertension"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567176824",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "195967001",
                            "display": "Asthma"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567283117",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "23986001",
                            "display": "Glaucoma"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567310341",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "4556007",
                            "display": "Gastritis"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567335345",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "37796009",
                            "display": "Migraine"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567378787",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "734757002",
                            "display": "Weakness of right facial muscle"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567652777",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "31681005",
                            "display": "Trigeminal neuralgia"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567718936",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "371822007",
                            "display": "Patient post percutaneous transluminal coronary angioplasty"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703567927090",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "21522001",
                            "display": "Abdominal pain"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Condition",
                "id": "cfsb1703569931062",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active"
                        }
                    ]
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "29857009",
                            "display": "Chest pain"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "AllergyIntolerance",
                "id": "cfsb1703568095737",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "716186003",
                            "display": "No known allergy"
                        }
                    ]
                },
                "patient": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "AllergyIntolerance",
                "id": "cfsb1703568123369",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "418038007",
                            "display": "Propensity to adverse reactions to substance"
                        }
                    ]
                },
                "patient": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Consent",
                "id": "1040",
                "meta": {
                    "versionId": "2",
                    "lastUpdated": "2024-12-17T21:12:06.842+00:00",
                    "source": "#nSizDobnNwAeO9EE"
                },
                "status": "active",
                "category": [
                    {
                        "id": "e8c9caf5-678f-4cb2-8971-aa58abe5a8f2",
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                                "code": "patient-privacy",
                                "display": "Privacy Consent"
                            }
                        ],
                        "text": "Privacy Consent"
                    },
                    {
                        "id": "a079b3b8-67a5-4604-bb1f-be86e5329a6a",
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "59284-6",
                                "display": "Consent Document"
                            }
                        ],
                        "text": "LOINC Consent Document"
                    }
                ],
                "subject": {
                    "reference": "Patient/cfsb1702939072210",
                    "type": "Patient"
                },
                "decision": "permit",
                "provision": [
                    {
                        "id": "c2acdcc9-0b54-464c-bb58-76c63d7ff1e0",
                        "actor": [
                            {
                                "role": {
                                    "coding": [
                                        {
                                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                            "code": "IRCP"
                                        }
                                    ]
                                }
                            }
                        ],
                        "action": [
                            {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/consentaction",
                                        "code": "access"
                                    }
                                ]
                            }
                        ],
                        "securityLabel": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                                "code": "DEMO",
                                "display": "General ethnic, social, and environmental background."
                            },
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                                "code": "VIO",
                                "display": "Indicators of possible physical or mental harm by violence."
                            }
                        ],
                        "purpose": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                                "code": "HIPAAConsentCD",
                                "display": "For the purposes of providing or supporing care."
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703567855529",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LA27838-4",
                            "display": "Coronary artery disease (CAD) (e.g., angina, myocardial infarction, and atherosclerotic heart disease (ASHD))"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568164562",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "social-history",
                                "display": "Social History"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP133912-8",
                            "display": "Unemployed"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568197525",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "social-history",
                                "display": "Social History"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP173580-4",
                            "display": "Alcohol use"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "note": [
                    {
                        "text": "Occasional drinker"
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568688243",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "social-history",
                                "display": "Social History"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LA18978-9",
                            "display": "Never smoker"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568785255",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "social-history",
                                "display": "Social History"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP231631-5",
                            "display": "Physical abuse"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "valueBoolean": false
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568905705",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP32134-6",
                            "display": "Potassium"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "N",
                                "display": "Normal"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703568960142",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LA24772-8",
                            "display": "Lactic acidosis in blood"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "H",
                                "display": "High"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569010310",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP100019-1",
                            "display": "Cholesterol"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "H",
                                "display": "High"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569115044",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP15275-8",
                            "display": "Triglyceride"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "H",
                                "display": "High"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569173459",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP32023-1",
                            "display": "Cholesterol.in LDL"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "N",
                                "display": "Normal"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569224661",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "LP32022-3",
                            "display": "Cholesterol.in HDL"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "interpretation": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                "code": "N",
                                "display": "Normal"
                            }
                        ]
                    }
                ]
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569300333",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "imaging",
                                "display": "Imaging"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "36813-4",
                            "display": "CT Abdomen and Pelvis W contrast IV"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Observation",
                "id": "cfsb1703569456631",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "imaging",
                                "display": "Imaging"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "36643-5",
                            "display": "XR Chest 2 Views"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Procedure",
                "id": "cfsb1703567985887",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "completed",
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "236886002",
                            "display": "Hysterectomy"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Procedure",
                "id": "cfsb1703568040523",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "completed",
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "171841007",
                            "display": "Endoscopic carpal tunnel release"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Procedure",
                "id": "cfsb1703569556746",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "completed",
                "code": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "5154007",
                            "display": "Speech therapy"
                        }
                    ]
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "Patient",
                "id": "cfsb1702939072210",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "name": [
                    {
                        "family": "Little12",
                        "given": [
                            "Lisa"
                        ]
                    }
                ],
                "gender": "female",
                "birthDate": "1959-12-12",
                "maritalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                            "code": "M",
                            "display": "Married"
                        }
                    ]
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716367408",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "318956006",
                                "display": "Losartan potassium 50 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716415379",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "376209006",
                                "display": "Hydrochlorothiazide 25 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716463607",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "376561007",
                                "display": "Salbutamol (as salbutamol sulfate) 830 microgram/mL solution for inhalation"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716508113",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1156249009",
                                "display": "Budesonide 160 microgram and formoterol fumarate dihydrate 4.5 microgram/actuation powder for inhalation"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716717715",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "320884002",
                                "display": "Montelukast (as montelukast sodium) 10 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716765391",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "374870002",
                                "display": "Benzonatate 200 mg oral capsule"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716801594",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "376803002",
                                "display": "Fluoxetine (as fluoxetine hydrochloride) 40 mg oral capsule"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716838280",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "321880000",
                                "display": "Trazodone hydrochloride 100 mg oral capsule"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716875955",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "419484002",
                                "display": "Buspirone hydrochloride"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "dosage": [
                    {
                        "text": "Buspar (buspirone) 15 mg"
                    }
                ]
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703716991002",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "375196006",
                                "display": "Mirtazapine 45 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717071728",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "323022001",
                                "display": "Gabapentin 800 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717102906",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "765872007",
                                "display": "Topiramate 25 mg oral capsule"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717139909",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "323048009",
                                "display": "Oxcarbazepine 600 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717214368",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "783147000",
                                "display": "Alendronic acid (as alendronate sodium) 70 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717257412",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "317306008",
                                "display": "Omeprazole 20 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717323840",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "317265007",
                                "display": "Sucralfate 1 g oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717375832",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "1193668004",
                                "display": "Azithromycin 250 mg oral capsule"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717416417",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "330729005",
                                "display": "Latanoprost 50 microgram/mL eye drops"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717488632",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "785444002",
                                "display": "Carmellose-containing product in ocular dose form"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                },
                "note": [
                    {
                        "text": "Optive ophthalmic solution (OTC)"
                    }
                ]
            },
            {
                "resourceType": "MedicationStatement",
                "id": "cfsb1703717727782",
                "meta": {
                    "versionId": "1",
                    "lastUpdated": "2024-12-17T00:44:08.219+00:00",
                    "source": "#tGGvNqD5DKPPmXLl"
                },
                "status": "recorded",
                "medication": {
                    "concept": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "377286005",
                                "display": "Hydrocodone bitartrate 5 mg and paracetamol 325 mg oral tablet"
                            }
                        ]
                    }
                },
                "subject": {
                    "reference": "Patient/cfsb1702939072210"
                }
            }
        ];
        this.setStatusComplete();
        // this.recollectPatientData();
    }
}

export enum EngineType {
    CDS_HOOKS = 'cds-hooks',
    CQL = 'cql',
    AI = 'ai'
}

export enum FilterMode {
    ALL = 'all',
    ONLY = 'only',
    EXCEPT = 'except'
}