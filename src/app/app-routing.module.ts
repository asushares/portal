import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BrowserComponent } from './browser/browser.component';
import { BuilderComponent } from './builder/builder.component';


const routes: Routes = [
  { path: '', component: BrowserComponent },
  { path: 'builder', component: BuilderComponent }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
