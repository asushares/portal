// Author: Preston Lee

import { Bundle, Patient } from 'fhir/r5';
import { BaseService } from './base/base.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable()
export class PatientService extends BaseService {


	public static PATIENT_PATH = '/Patient';

	// constructor(protected backendService: BackendService) { 
	//   super();
	// }

	url(): string {
		return this.backendService.url + PatientService.PATIENT_PATH;
	}

	index() {
		let b = this.http.get<Bundle<Patient>>(this.url(), { headers: this.backendService.headers() });
		return b;
	}

	urlFor(id: string) {
		return this.backendService.url + '/Patient/' + id;
	}

	get(id: string) {
		return this.http.get<Patient>(this.urlFor(id), { headers: this.backendService.headers() });
	}
	
	post(patient: Patient) {
		return this.http.post<Patient>(this.url(), JSON.stringify(patient), { headers: this.backendService.headers() });
	}

	put(patient: Patient) {
		return this.http.put<Patient>(this.urlFor(patient.id!), JSON.stringify(patient), { headers: this.backendService.headers() });
	}

	delete(patient: Patient) {
		return this.http.delete<Patient>(this.urlFor(patient.id!), { headers: this.backendService.headers() });
	}

    search(text: string) {
        return this.http.get<Bundle<Patient>>(this.url() + '?name:contains=' + text);
    }

	summary(id: string) {
		return this.http.get<Patient>(this.urlFor(id) + '?_summary=true');
	}


  public current: BehaviorSubject<Patient | null> =
    new BehaviorSubject<Patient | null>(null);

  private currentPatientEverything: BehaviorSubject<Bundle | null> =
    new BehaviorSubject<Bundle | null>(null);

  currentPatientEverything$ = this.currentPatientEverything.asObservable();

  load(id: string) {
    this.http
      .get<Patient>(this.urlFor(id), { headers: this.backendService.headers() })
      .subscribe({
        next: d => {
          this.current.next(d);
        },
        error: e => {
          console.error('Error loading patient.');
          console.error(e);
        },
      });
  }

  loadEverything(id: string, searchParameters: string = '_count=1000') {
    this.http
      .get<Bundle>(this.urlFor(id) + '/$everything?' + searchParameters, {
        headers: this.backendService.headers(),
      })
      .subscribe({
        next: d => {
          const nextLink = (d.link as { relation: string; url: string }[]).find(
            ({ relation }) => relation === 'next',
          );
          const currentValue = this.currentPatientEverything.getValue();
          const { id: _id, link: _link, ...rest } = d;
          this.currentPatientEverything.next({
            ...rest,
            entry: [...(currentValue?.entry || []), ...d.entry!],
          });
          if (nextLink) {
            this.loadEverything(id, nextLink.url.split('?')[1]);
          }
        },
        error: e => {
          console.error('Error loading patient everything.');
          console.error(e);
        },
      });
  }


}