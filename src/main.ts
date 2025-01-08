// Author: Preston Lee

import { BackendService } from './app/backend/backend.service';
import { OrganizationService } from './app/organization.service';
import { ConsentService } from './app/consent/consent.service';
import { PatientService } from './app/patient.service';
import { SettingsService } from './app/settings/settings.service';
import { CdsService } from './app/cds/cds.service';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { provideAnimations } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app/app-routing.module';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { provideToastr } from 'ngx-toastr';


bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(AppRoutingModule, BrowserModule, FormsModule),
        provideHighlightOptions({
            fullLibraryLoader: () => import('highlight.js')
        })
        // { provide: 'Window', useValue: window }
        ,
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations(),
        provideToastr({positionClass: 'toast-bottom-right'}),
        BackendService,
        OrganizationService,
        ConsentService,
        PatientService,
        SettingsService,
        CdsService
    ]
})
  .catch(err => console.error(err));
