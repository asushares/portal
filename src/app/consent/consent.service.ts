import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { Bundle, Consent } from 'fhir/r5';
import { Observable } from 'rxjs';
import { ConsentSearchField } from './consent.search.field';

@Injectable({
	providedIn: 'root'
})
export class ConsentService extends BaseService {

	public static CONSENT_PATH = '/Consent';

	// constructor(protected backendService: BackendService) { 
	//   super();
	// }
	public sort: ConsentSearchField = ConsentSearchField.LastUpdated;
	public order: 'asc' | 'desc' = 'asc';
	public pageSize = 10;
	public offset = 0;

	url(): string {
		return this.backendService.url + ConsentService.CONSENT_PATH;
	}

	queryParameters() {
		return `_sort=${this.order == 'asc' ? '' : '-'}${this.sort}` + `&_count=${this.pageSize}&_getpagesoffset=${this.offset}`;
	}

	index(): Observable<Bundle<Consent>> {
		let b = this.http.get<Bundle<Consent>>(this.url() + "?" + this.queryParameters(), { headers: this.backendService.headers() });
		return b;
	}

	urlFor(id: string) {
		return this.backendService.url + '/Consent/' + id;
	}

	get(id: string) {
		return this.http.get<Consent>(this.urlFor(id), { headers: this.backendService.headers() });
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
