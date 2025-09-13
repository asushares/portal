// Author: Preston Lee

import { Injectable } from '@angular/core';
import { BaseService } from '../base/base.service';
import { Bundle, Consent, OperationOutcome } from 'fhir/r5';
import { Observable } from 'rxjs';
import { ConsentSearchField } from './consent.search.field';
import { HttpParams } from '@angular/common/http';

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
	public subjectSearch: string = '';

	url(): string {
		return this.backendService.url + ConsentService.CONSENT_PATH;
	}

	queryParameters(p_id?: string) {
		let p = `_sort=${this.order == 'asc' ? '' : '-'}${this.sort}` + `&_count=${this.pageSize}&_getpagesoffset=${this.offset}`;
		if (p_id) {
			p += `&subject=Patient/${p_id}`
		}
		// Note: Removed subject:contains as it's not supported by this FHIR server
		// Client-side filtering will be implemented instead
		return p;
	}

	index(): Observable<Bundle<Consent>> {
		let b = this.http.get<Bundle<Consent>>(this.url() + "?" + this.queryParameters(), { headers: this.backendService.headers() });
		return b;
	}

	indexForPatient(p_id: string): Observable<Bundle<Consent>> {
		const b = this.http.get<Bundle<Consent>>(
			this.url() + '?' + this.queryParameters(p_id),
			{ headers: this.backendService.headers() },
		);
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

	/**
	 * Validates a Consent resource using FHIR's $validate operation
	 * @param consent The Consent resource to validate
	 * @param profile Optional profile URL to validate against
	 * @returns Observable<OperationOutcome> containing validation results
	 */
	validate(consent: Consent, profile?: string): Observable<OperationOutcome> {
		const validateUrl = this.url() + '/$validate';
		const headers = this.backendService.headers();
		
		// Add profile parameter if provided
		let queryParams = '';
		if (profile) {
			queryParams = '?profile=' + encodeURIComponent(profile);
		}
		
		return this.http.post<OperationOutcome>(
			validateUrl + queryParams,
			JSON.stringify(consent),
			{ headers: headers }
		);
	}

	/**
	 * Validates a Consent resource by ID using FHIR's $validate operation
	 * @param id The ID of the Consent resource to validate
	 * @param profile Optional profile URL to validate against
	 * @returns Observable<OperationOutcome> containing validation results
	 */
	validateById(id: string, profile?: string): Observable<OperationOutcome> {
		const validateUrl = this.urlFor(id) + '/$validate';
		const headers = this.backendService.headers();
		
		// Add profile parameter if provided
		let queryParams = '';
		if (profile) {
			queryParams = '?profile=' + encodeURIComponent(profile);
		}
		
		return this.http.get<OperationOutcome>(
			validateUrl + queryParams,
			{ headers: headers }
		);
	}
}
