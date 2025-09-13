// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { ConsentService } from '../consent/consent.service';
import { Bundle, BundleEntry, Consent, Organization, Patient } from 'fhir/r5';

import { PatientService } from '../patient.service';
import { OrganizationService } from '../organization.service';
import { ConsentSearchField } from '../consent/consent.search.field';
import { BaseComponent } from '../base/base.component';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    styleUrls: ['./browser.component.scss'],
    imports: [NgIf, FormsModule, NgFor, RouterLink, DatePipe]
})
export class BrowserComponent extends BaseComponent implements OnInit {

  hasPreviousPage() {
    return this.bundle?.link?.some(l => {return l.relation == 'prev'});
  }

  hasNextPage(): any {
    return this.bundle?.link?.some(l => { return l.relation == 'next' });
  }

  currentOffset() {
    return this.consentService.offset;
  }

  pageSize() {
    return this.consentService.pageSize;
  }

  setOffset(offset: number) {
    this.consentService.offset = offset;
    this.reload();
  }

  public sortTypes = ConsentSearchField;

  currentSort() {
    return this.consentService.sort;
  }

  currentOrder() {
    return this.consentService.order;
  }
  sortBy(field: ConsentSearchField) {
    this.consentService.sort = field;
    this.consentService.order = this.consentService.order == 'asc' ? 'desc' : 'asc';
    this.reload();
  }

  

  displayCategories(be: BundleEntry<Consent>) {
    return be.resource?.category?.map(cc => { cc.text }).join(', ');
  }

  public bundle: Bundle<Consent> | null = null;

  public patientSummaries: { [key: string]: Patient } = {};
  public organizationSummaries: { [key: string]: Organization } = {};
  
  public subjectSearch: string = '';

  constructor(protected consentService: ConsentService, protected patientService: PatientService, protected organizationService: OrganizationService, protected toastrService: ToastrService) {
    super();
  }

  ngOnInit() {
    this.reload();
  }

  onSubjectSearchChange() {
    // Reset offset when searching
    this.consentService.offset = 0;
    // Increase page size for better search results when filtering client-side
    if (this.subjectSearch && this.subjectSearch.trim()) {
      this.consentService.pageSize = 50; // Use larger page size for search
    } else {
      this.consentService.pageSize = 10; // Reset to default when not searching
    }
    this.reload();
  }

  clearSubjectSearch() {
    this.subjectSearch = '';
    this.consentService.offset = 0;
    this.consentService.pageSize = 10; // Reset to default page size
    this.reload();
  }

  getPatientName(patientRef: string): string {
    if (this.patientSummaries[patientRef]) {
      return this.nameFor(this.patientSummaries[patientRef]);
    }
    return '';
  }

  reload() {
    // Update the consent service with current subject search
    this.consentService.subjectSearch = this.subjectSearch;
    this.consentService.index().subscribe(b => {
      this.bundle = b;
      // FIXME Remove these lines once real data is available on the server
      // this.bundle.entry = [];
      // this.bundle.entry.push({resource: BrowserComponent.CONSENT_1});
      
      // Apply client-side filtering for subject search
      if (this.bundle.entry && this.subjectSearch && this.subjectSearch.trim()) {
        this.bundle.entry = this.bundle.entry.filter(entry => {
          const subjectRef = entry.resource?.subject?.reference || '';
          const patientName = this.getPatientName(entry.resource?.subject?.reference || '');
          const searchTerm = this.subjectSearch.toLowerCase().trim();
          
          return subjectRef.toLowerCase().includes(searchTerm) || 
                 patientName.toLowerCase().includes(searchTerm);
        });
      }
      
      if (this.bundle.entry) {
        this.bundle.entry.forEach(e => {

          // Cache the names of the patients
          if (e.resource?.subject?.reference) {
            let ref = e.resource?.subject?.reference;
            if (ref.match('^Patient/')) {
              let id = ref.substring('Patient/'.length);
              this.patientService.summary(id).subscribe(p => {
                this.patientSummaries[ref] = p;
                // console.log('Patient summary returned: ');
                // console.log(p);
              });
            }
          }

          // Cache the names of the Organizations
          if (e.resource?.controller) {
            e.resource.controller.forEach(c => {
              let ref = c.reference;
              if (ref && ref.match('^Organization/')) {
                let id = ref.substring('Organization/'.length);
                this.organizationService.summary(id).subscribe(o => {
                  this.organizationSummaries[ref!] = o;
                  // console.log('Organization summary returned: ');
                  // console.log(o);
                });
              }
            });
          }
        });
      }
      console.log(this.bundle);

    })
  }

  formatBundle() {
    let json = JSON.stringify(this.bundle, null, "\t");
    console.log(json);
    return json;
  }

  removeConsent(consent: Consent) {
    let index = -1;
    if (this.bundle?.entry) {
      this.bundle?.entry?.forEach((n, i) => {
        if (consent.id == this.bundle!.entry![i].resource?.id) {
          index = i;
        }
      })
      if (index >= 0) {
        this.bundle!.entry!.splice(index, 1);
      }
    }

  }

  delete(consent: Consent) {
    this.consentService.delete(consent).subscribe({
      next: oo => {
        console.log(oo);
        this.removeConsent(consent);
        this.toastrService.success('The consent has been deleted.', 'Consent Deleted');
      }, error: error => {
        console.log(error);
        console.log(error.error);
        this.toastrService.error('The server refused to delete the consent document.', 'Consent Deletion Failed');
      }
    });
  }

}
