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

    fakeExport() {
        this.prefetchExportMetadata = {
            "transactionTime": "2024-12-17T19:38:56.054+00:00",
            "request": "http://localhost:8080/fhir/Patient/cfsb1702938770058/$export",
            "requiresAccessToken": true,
            "output": [{
                "type": "Condition",
                "url": "http://localhost:8080/fhir/Binary/5J1UeK9rkucu7ua5Pe1te3BukqU8fLJu"
            }, {
                "type": "AllergyIntolerance",
                "url": "http://localhost:8080/fhir/Binary/WpUeoQVpxUCGUZVsLOey7JVR9PMPFMBh"
            }, {
                "type": "Consent",
                "url": "http://localhost:8080/fhir/Binary/9wDJ65swJaInPzGa1jPaf8HpLvrFwFs7"
            }, {
                "type": "Observation",
                "url": "http://localhost:8080/fhir/Binary/RDAU76vxMBFs4BClnPUKOAqmK4pYNj2V"
            }, {
                "type": "Procedure",
                "url": "http://localhost:8080/fhir/Binary/aXdW3f24uT9yxIsy1Fwm1t1SbH0ZXTrQ"
            }, {
                "type": "Patient",
                "url": "http://localhost:8080/fhir/Binary/vlEiHzFIIZRjUAIgys5EbEqQhakZjovM"
            }, {
                "type": "MedicationStatement",
                "url": "http://localhost:8080/fhir/Binary/OZ5TvAlxfTQyYptsMEcr4Y1lkt5T10Pi"
            }],
            "error": []
        }
        this.recollectPatientData();
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

    resourceShown(resource: FhirResource) {
        let labelShown = this.resourceShownForLabelFilter(resource);
        let consentShown = this.resourceShownForConsentFilter(resource);
        return labelShown && consentShown;
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
            this.collectAll(this.prefetchExportMetadata).subscribe({
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
                    this.prefetchResourcesRaw = all;
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
                        // this.allPatientResources = [];
                        this.prefetchResourcesLabeled = result.extension.content.entry.map(e => e.resource).filter(r => r !== undefined);
                        // this.allResultResources.forEach((r) => {
                        //     r.meta?.security?.forEach((s) => {
                        //         console.log('Security:', s.code);
                        //     });
                        // });
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