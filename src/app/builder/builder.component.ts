import { Component } from '@angular/core';
import { Consent } from 'fhir/r5';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent {

  consent: Consent = this.template();

  constructor() {
    // this.reset();
  }
  template() {
   let c: Consent =  {resourceType: 'Consent', status: 'active'};
   return c;
  }
}
