// Author: Preston Lee

import { Bundle, Organization } from 'fhir/r5';
import { BaseService } from './base/base.service';
import { Injectable } from '@angular/core';

@Injectable()
export class OrganizationService extends BaseService {


	public static ORGANIZATION_PATH = '/Organization';

	url(): string {
		return this.backendService.url + OrganizationService.ORGANIZATION_PATH;
	}

	index() {
		let b = this.http.get<Bundle<Organization>>(this.url(), { headers: this.backendService.headers() });
		return b;
	}

	urlFor(id: string) {
		return this.backendService.url + '/Organization/' + id;
	}

	get(id: string) {
		return this.http.get<Organization>(this.urlFor(id), { headers: this.backendService.headers() });
	}
	
	post(organization: Organization) {
		return this.http.post<Organization>(this.url(), JSON.stringify(organization), { headers: this.backendService.headers() });
	}

	put(organization: Organization) {
		return this.http.put<Organization>(this.urlFor(organization.id!), JSON.stringify(organization), { headers: this.backendService.headers() });
	}

	delete(organization: Organization) {
		return this.http.delete<Organization>(this.urlFor(organization.id!), { headers: this.backendService.headers() });
	}

    search(text: string) {
        return this.http.get<Bundle<Organization>>(this.url() + '?phonetic=' + text);
    }

}