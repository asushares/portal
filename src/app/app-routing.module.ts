import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BrowserComponent } from './browser/browser.component';
import { BuilderComponent } from './builder/builder.component';
import { SettingsComponent } from './settings/settings.component';
import { SandboxComponent } from './sandbox/sandbox.component';
import { SimulatorComponent } from './simulator/simulator.component';
import { PatientComponent } from './patient/patient-component';


const routes: Routes = [
  { path: '', component: BrowserComponent },
  { path: 'builder', component: BuilderComponent },
  { path: 'builder/:consent_id', component: BuilderComponent },
  { path: 'simulator/:consent_id', component: SimulatorComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'sandbox', component: SandboxComponent },
  {
    path: 'patient', component: PatientComponent
  }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
