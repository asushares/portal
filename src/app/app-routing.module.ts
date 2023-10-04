import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BrowserComponent } from './browser/browser.component';
import { BuilderComponent } from './builder/builder.component';
import { SettingsComponent } from './settings/settings.component';


const routes: Routes = [
  { path: '', component: BrowserComponent },
  { path: 'builder', component: BuilderComponent },
  { path: 'builder/:consent_id', component: BuilderComponent },
  {path: 'settings', component: SettingsComponent}
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
