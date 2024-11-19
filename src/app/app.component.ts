// Author: Preston Lee

import { HttpClient } from '@angular/common/http';

import { Component, OnInit } from '@angular/core';

import { BackendService } from './backend/backend.service';
import { SettingsService } from './settings/settings.service';
import { ToasterComponent } from './toaster/toaster.component';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
	selector: 'app',
	templateUrl: 'app.component.html',
	styleUrl: 'app.component.scss',
	standalone: true,
	imports: [ToasterComponent, RouterLink, RouterLinkActive, NgIf, RouterOutlet, FormsModule]
})
export class AppComponent implements OnInit {

	constructor(protected http: HttpClient, protected backendService: BackendService, protected settingsService: SettingsService) {
		console.log("AppComponent has been initialized to establish router element.");
	}

	ngOnInit(): void {
		console.log("Launching app...");
		this.detectJwtLaunch();

	}

	settings(): SettingsService { return this.settingsService; }

	detectJwtLaunch(): void {
		let root = (document.URL).split("?")[0];
		let start = document.URL.indexOf('?');
		if (start >= 0) {
			let callbackResponse = document.URL.substring(start + 1)
			if (callbackResponse) {
				var responseParameters = (callbackResponse).split("&");
				var parameterMap: Map<string, string> = new Map<string, string>();
				for (var i = 0; i < responseParameters.length; i++) {
					let key = responseParameters[i].split("=")[0];
					let val = responseParameters[i].split("=")[1];
					parameterMap.set(key, val);
				}
				let launch_key = parameterMap.get(BackendService.JWT_LAUNCH_KEY);
				if (launch_key) {
					window.localStorage.setItem(BackendService.LOCAL_STORAGE_JWT_KEY, launch_key);
					window.location.href = root;
					console.log("Processed JWT in URL.");
				} else {
					console.log("No JWT found. Oh well.");
				}
			} else {
				console.log("No JWT found in URL.");
			}
		}
	}

}
