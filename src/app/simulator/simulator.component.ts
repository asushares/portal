// Author: Preston Lee

import { ChangeDetectorRef, Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../organization.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatientService } from '../patient.service';
import { ConsentCategorySettings, ConsentTemplate } from '@asushares/core';
import { ConsentBasedComponent } from '../consent/consent-based.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorySelectorComponent } from "../provision-selector/category-selector.component";
import { PurposeSelectorComponent } from '../provision-selector/purpose-selector.component';


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
    }

    engineTypes() {
        return EngineType;
    }
    filterModes() {
        return FilterMode;
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
}

export enum EngineType {
    MATCHING = 'matching',
    CQL = 'cql',
    AI = 'ai'
}

export enum FilterMode {
    INCLUDE = 'include',
    EXCLUDE = 'exclude'
}