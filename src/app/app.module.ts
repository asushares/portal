// Author: Preston Lee

import { BrowserModule } from '@angular/platform-browser';
import { NgModule, NO_ERRORS_SCHEMA }      from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';

import {AppComponent} from './app.component';

import { BrowserComponent } from './browser/browser.component';
import { BuilderComponent } from './builder/builder.component';
import { CodeableConceptComponent } from './codeable-concept/codeable-concept.component';
import { SettingsComponent } from './settings/settings.component';
import { ToastComponent } from './toast/toast.component';
import { ToasterComponent } from './toaster/toaster.component';

import { BackendService } from './backend/backend.service';
import { ConsentService } from './consent/consent.service';
import { OrganizationService } from './organization.service';
import { SettingsService } from './settings/settings.service';

import { ToastService } from './toast/toast.service';
import { PatientService } from './patient.service';


@NgModule({
    imports: [
		AppRoutingModule,
        BrowserModule,
        FormsModule,
        HttpClientModule
	],
    declarations: [
        AppComponent,
        BrowserComponent,
        BuilderComponent,
        CodeableConceptComponent,
        SettingsComponent,
        ToastComponent,
        ToasterComponent
    ],   // components and directives
    providers: [
        BackendService,
        OrganizationService,
        ConsentService,
        PatientService,
        SettingsService,
        ToastService
        // { provide: 'Window', useValue: window }
    ],                    // products
    bootstrap: [AppComponent]     // root component
})
export class AppModule {
}
