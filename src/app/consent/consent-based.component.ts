import { ActivatedRoute } from "@angular/router";

import { Consent, Organization, Patient } from "fhir/r5";

import { BaseComponent } from "../base/base.component";
import { OrganizationService } from "../organization.service";
import { PatientService } from "../patient.service";
import { ToastService } from "../toast/toast.service";
import { ConsentService } from "./consent.service";
import { ConsentTemplate } from "@asushares/core";

export abstract class ConsentBasedComponent extends BaseComponent {


    public consent: Consent = ConsentTemplate.templateConsent();
    public patientSelected: Patient | null = null;

    organizationSelected: Organization[] = [];

    constructor(public route: ActivatedRoute,
        protected organizationService: OrganizationService,
        protected patientService: PatientService,
        protected consentService: ConsentService) {
        super();
    }

    loadConsent(c_id: string) {
        this.consentService.get(c_id).subscribe({
            next: c => {
                this.consent = this.repairConsent(c);
                // this.loadConsentProvisionsMedicalInformation();
                // this.loadConsentProvisionsPurposes();
                this.loadConsentSucceeded(this.consent);
                console.log("Loading patient...");
                console.log(this.consent);
                const subject_ref = this.consent?.subject?.reference;
                if (subject_ref) {
                    if (subject_ref.startsWith('Patient')) {
                        let p_id = subject_ref.replace('Patient/', '');
                        this.patientService.get(p_id).subscribe({
                            next: p => {
                                this.patientSelected = p;
                                console.log('Loaded patient: ' + p.id);

                            }
                        });
                    }
                }
                const ref = this.consent?.controller?.forEach(n => {
                    console.log("Loading organization...");

                    let o_id = n.reference?.replace('Organization/', '');
                    this.organizationService.get(o_id!).subscribe({
                        next: o => {
                            console.log('Loaded organization: ' + o.id);

                            this.organizationSelected.push(o);
                        }
                    })
                });

            },
            error: error => {
                this.loadConsentFailed(c_id);
            }
        });
    }

    repairConsent(c: Consent) {
        c.controller = c.controller || [];
        c.provision?.forEach(cp => {
            cp.securityLabel = cp.securityLabel || [];
            cp.purpose = cp.purpose || [];
            // cp.actor?.forEach(a => {

            // })
        });
        // this.consent.provision = this.consent.provision || [];
        // this.consent.grantor = this.consent.grantor || [];
        return c;
    }

    abstract loadConsentFailed(consentId: string): void;
    abstract loadConsentSucceeded(consent: Consent): void;

}
