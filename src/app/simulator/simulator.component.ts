// Author: Preston Lee

import { ChangeDetectorRef, Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, FhirResource, Organization, Parameters, Patient, Resource } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../organization.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatientService } from '../patient.service';
import { ConsentCategorySettings, ConsentTemplate, DataSharingCDSHookRequest } from '@asushares/core';
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


@Component({
    selector: 'simulator',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CategorySelectorComponent, CategorySelectorComponent, PurposeSelectorComponent],
    templateUrl: './simulator.component.html',
    styleUrls: ['./simulator.component.scss']
})
export class SimulatorComponent extends ConsentBasedComponent {

    engineType: EngineType = EngineType.CQL;
    categoryMode: FilterMode = FilterMode.INCLUDE;
    purposeMode: FilterMode = FilterMode.INCLUDE;

    dummyProvision: ConsentProvision = ConsentTemplate.templateProvision();

    status: 'ready' | 'exporting' | 'collecting' | 'complete' = 'ready';
    statusMessage: string = '';
    statusLastPolled: Date | null = null;
    exportMetadata: ExportMetadata | null = null;
    allPatientResources: FhirResource[] | null = null;

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
    }

    engineTypes() {
        return EngineType;
    }
    filterModes() {
        return FilterMode;
    }

    fakeExport() {
        this.exportMetadata = {
            "transactionTime": "2024-12-17T01:52:56.056+00:00",
            "request": "http://localhost:8080/fhir/Patient/cfsb1699034947598/$export",
            "requiresAccessToken": true,
            "output": [{
                "type": "Condition",
                "url": "http://localhost:8080/fhir/Binary/YPPS1SEWkAjGRk7yLqpyfLlEoGbGDreN"
            }, {
                "type": "AllergyIntolerance",
                "url": "http://localhost:8080/fhir/Binary/HSD00QfATy3bEegW1gfDWybRswKrt2sp"
            }, {
                "type": "MedicationRequest",
                "url": "http://localhost:8080/fhir/Binary/FaVFsXWuYGbyyep7rGNPFyf5xWVXBgXa"
            }, {
                "type": "Consent",
                "url": "http://localhost:8080/fhir/Binary/AJ7EnGbPX9bCol90O69Pg7xydJnmKTbc"
            }, {
                "type": "Observation",
                "url": "http://localhost:8080/fhir/Binary/vsU6YOjnVlHpPKLDkJgwjxxE1R0BsW29"
            }, {
                "type": "Procedure",
                "url": "http://localhost:8080/fhir/Binary/P1WG5pr0LwexjkPgaavFsDzPFfAOqdBt"
            }, {
                "type": "Patient",
                "url": "http://localhost:8080/fhir/Binary/VxlOU6aYcm8Kgt2rbNih3TkLfps0Tn3B"
            }],
            "error": []
        }
        this.recollectPatientData();
    }

    randomize() {
        console.log('Randomizing...');
        let categorySettings = new ConsentCategorySettings();
        categorySettings.allCategories().forEach(c => {
            c.enabled = (Math.random() > 0.5);
        });
        this.categoryMode = Math.random() > 0.5 ? FilterMode.INCLUDE : FilterMode.EXCLUDE;
        categorySettings.allPurposes().forEach(p => {
            p.enabled = (Math.random() > 0.5);
        });
        this.purposeMode = Math.random() > 0.5 ? FilterMode.INCLUDE : FilterMode.EXCLUDE;
        let tmp = ConsentTemplate.templateProvision();
        categorySettings.updateConsentProvision(tmp);
        this.dummyProvision = tmp;
        // this.cdr.detectChanges();
    }


    pollUntillCompleted(location: string) {
        this.status = 'exporting';
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
        this.status = 'ready';
        this.statusMessage = '';
        this.statusLastPolled = null;
        this.exportMetadata = null;
        this.allPatientResources = [];
    }

    setStatusExporting() {
        this.status = 'exporting';
        this.statusMessage = '';
    }

    setStatusCollecting() {
        this.status = 'collecting';
        this.statusMessage = '';
    }

    setStatusComplete() {
        this.status = 'complete';
        this.statusMessage = '';
    }

    recollectPatientData() {
        if (this.exportMetadata) {
            this.collectAll(this.exportMetadata).subscribe({
                next: (data) => {
                    console.log('Collected:', data.length, 'types.');
                    let all: FhirResource[] = [];
                    data.forEach((d) => {
                        console.log('Parsing:');
                        // let d = response.body as string;
                        console.log(d);
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
                    this.allPatientResources = all;
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
                    this.status = 'exporting';
                    if (poll_location) {
                        this.pollUntillCompleted(poll_location).subscribe({
                            next: (outcome) => {
                                console.log('Polling for export to be complete...');
                                let progress = outcome.headers.get('X-Progress');
                                if (progress) {
                                    this.statusMessage = progress;
                                } else {
                                    this.statusMessage = 'Exporting...';
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
                                            this.exportMetadata = poll_response.body as ExportMetadata;
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

    simulate() {
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

    simulateCdsHooks() {
        const data = new DataSharingCDSHookRequest();
        const bundle: Bundle = { resourceType: 'Bundle', type: 'collection', entry: [] };
        this.allPatientResources?.forEach((r) => {
            bundle.entry!.push({ resource: r });
        });
        data.context.content = bundle;
        this.cdsService.patientConsentConsult(data).subscribe({
            next: (result) => {
                console.log('Result: ', result);
            }, error: (err) => {
                console.error('Error: ', err);
            }
        });
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
}

export enum EngineType {
    CDS_HOOKS = 'cds-hooks',
    CQL = 'cql',
    AI = 'ai'
}

export enum FilterMode {
    INCLUDE = 'include',
    EXCLUDE = 'exclude'
}