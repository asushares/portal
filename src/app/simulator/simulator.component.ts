// Author: Preston Lee

import { Component } from '@angular/core';
import { Bundle, CodeableConcept, Consent, ConsentProvision, Organization, Patient } from 'fhir/r5';

import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../organization.service';
import { BaseComponent } from '../base/base.component';
import { ToastService } from '../toast/toast.service';
import { ConsentService } from '../consent/consent.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatientService } from '../patient.service';
import { ConsentTemplate } from '@asushares/core';
import { ConsentBasedComponent } from '../consent/consent-based.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'simulator',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './simulator.component.html',
    styleUrls: ['./simulator.component.scss']
})
export class SimulatorComponent extends ConsentBasedComponent {

engineType: EngineType = EngineType.CQL;

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
        protected toastService: ToastService) {
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
}

export enum EngineType {
    MATCHING = 'matching',
    CQL = 'cql',
    AI = 'ai'
}