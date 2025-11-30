import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BrowserComponent } from './browser/browser.component';
import { BuilderComponent } from './builder/builder.component';
import { SettingsComponent } from './settings/settings.component';
import { SandboxComponent } from './sandbox/sandbox.component';
import { SimulatorComponent } from './simulator/simulator.component';
import { PatientComponent } from './patient/patient-component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { PatientPortalComponent } from './patient-portal/patient-portal.component';
import { PatientConsentBuilderComponent } from './patient-consent-builder/patient-consent-builder.component';
import { ProviderPortalComponent } from './provider-portal/provider-portal.component';


const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'manager/browser', component: BrowserComponent },
  { path: 'manager/builder', component: BuilderComponent },
  { path: 'manager/builder/:consent_id', component: BuilderComponent },
  { path: 'simulator/:consent_id', component: SimulatorComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'sandbox', component: SandboxComponent },
  {
    path: 'patient', component: PatientComponent
  },
  { path: 'portal/:patient_id', component: PatientPortalComponent },
  { path: 'portal/:patient_id/consent', component: PatientConsentBuilderComponent },
  { path: 'provider', component: ProviderPortalComponent }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
