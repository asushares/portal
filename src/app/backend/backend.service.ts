// Author: Preston Lee

import { Injectable } from "@angular/core";
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { OperationOutcome, Parameters, Patient } from "fhir/r5";
import { ExportMetadata } from "./export_metadata";


@Injectable()
export class BackendService {

	public url: string; // | null = null; // BackendService.DEFAULT_SERVER_URL;
	public cdsUrl: string;

	public static STATUS_PATH: string = '/status';
	public static SESSIONS_PATH: string = '/sessions';

	public static JWT_LAUNCH_KEY: string = 'jwt';
	public static LOCAL_STORAGE_JWT_KEY: string = 'jwt';

	constructor(protected http: HttpClient) {
		// this.configuration = readFileSync(BackendService.CONFIGURATION_PATH).toJSON();
		this.url = (window as any)["PROVIDER_DEFAULT_FHIR_URL"];
		this.cdsUrl = (window as any)["PROVIDER_CDS_ROOT_URL"];
	}

	public includeBearerToken: boolean = false;
	public headers(): HttpHeaders {
		var headers = new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' });
		if (this.includeBearerToken) {
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
	// 	let status = this.http.get<Status>(this.statusUrl(), { headers: this.headers(true) }).pipe(map(res => res));
	// 	return status;
	// }

	exportRequest(patient: Patient) {
		const parameters: Parameters = {
			resourceType: 'Parameters',
			parameter: [
			]
		};
		const headers = new HttpHeaders({'Prefer': 'respond-async'});
		return this.http.post<HttpResponse<any>>(this.url + '/Patient/' + patient.id + '/$export', parameters, { headers: headers, observe: 'response' });
	}

	exportPoll(location: string){
		return this.http.get<ExportMetadata>(location, {observe: 'response'});
	}

}
