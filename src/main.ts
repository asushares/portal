import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { BackendService } from './app/backend/backend.service';
import { OrganizationService } from './app/organization.service';
import { ConsentService } from './app/consent/consent.service';
import { PatientService } from './app/patient.service';
import { SettingsService } from './app/settings/settings.service';
import { CdsService } from './app/cds/cds.service';
import { ToastService } from './app/toast/toast.service';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { AppRoutingModule } from './app/app-routing.module';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(AppRoutingModule, BrowserModule, FormsModule),
        BackendService,
        OrganizationService,
        ConsentService,
        PatientService,
        SettingsService,
        CdsService,
        ToastService,
        provideHighlightOptions({
            fullLibraryLoader: () => import('highlight.js')
        })
        // { provide: 'Window', useValue: window }
        ,
        provideHttpClient(withInterceptorsFromDi())
    ]
})
  .catch(err => console.error(err));
