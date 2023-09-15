// Author: Preston Lee

import { Injectable } from "@angular/core";
import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Bundle } from "fhir/r5";
import { Patient } from "fhir/r5";


@Injectable()
export class BackendService {

	public url: string; // | null = null; // BackendService.DEFAULT_SERVER_URL;

	public static STATUS_PATH: string = '/status';
	public static SESSIONS_PATH: string = '/sessions';

	public static JWT_LAUNCH_KEY: string = 'jwt';
	public static LOCAL_STORAGE_JWT_KEY: string = 'jwt';

	constructor(protected http: HttpClient) {
		// this.configuration = readFileSync(BackendService.CONFIGURATION_PATH).toJSON();
		this.url = (window as any)["CONSENT_BUILDER_DEFAULT_FHIR_URL"];
	}


	public requestOptions(includeBearerToken: boolean): HttpHeaders {
		var headers = new HttpHeaders({ 'Accept': 'application/json' });
		if (includeBearerToken) {
			let jwt = localStorage.getItem(BackendService.LOCAL_STORAGE_JWT_KEY);
			if (jwt) {
				headers = headers.set('Authorization', 'Bearer ' + jwt);
				// headers =  headers.set('Foozle', 'Bearer ' + jwt);
			}
		}
		return headers;
	}

	statusUrl(): string {
		return this.url + BackendService.STATUS_PATH;
	}
	sessionsUrl(): string {
		return this.url + BackendService.SESSIONS_PATH;
	}


	// status() {
	// 	let status = this.http.get<Status>(this.statusUrl(), { headers: this.requestOptions(true) }).pipe(map(res => res));
	// 	return status;
	// }
}
