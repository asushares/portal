import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { Bundle, Consent, Patient } from 'fhir/r5';
import { Observable } from 'rxjs';
import { BackendService } from '../backend/backend.service';

@Injectable({
	providedIn: 'root'
})
export class ConsentService extends BaseService {

	public static CONSENT_PATH = '/Consent';

	// constructor(protected backendService: BackendService) { 
	//   super();
	// }

	url(): string {
		return this.backendService.url + ConsentService.CONSENT_PATH;
	}

	index(): Observable<Bundle<Consent>> {
		let b = this.http.get<Bundle<Consent>>(this.url(), { headers: this.backendService.headers() });
		return b;
	}

	urlFor(id: string) {
		return this.backendService.url + '/Consent/' + id;
	}

	post(consent: Consent) {
		return this.http.post<Consent>(this.url(), JSON.stringify(consent), { headers: this.backendService.headers() });
	}

	put(consent: Consent) {
		return this.http.put<Consent>(this.urlFor(consent.id!), JSON.stringify(consent), { headers: this.backendService.headers() });
	}

	delete(consent: Consent) {
		return this.http.delete<Consent>(this.urlFor(consent.id!), { headers: this.backendService.headers() });
	}
}
