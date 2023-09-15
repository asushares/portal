import { Component, OnInit } from '@angular/core';
import { ConsentService } from '../consent/consent.service';
import { Bundle, Patient } from 'fhir/r5';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss']
})
export class BrowserComponent implements OnInit {

  public bundle: Bundle<Patient> | null = null;

  constructor(protected consentService: ConsentService) {

  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.consentService.index().subscribe(b => {
      this.bundle = b;
      console.log(this.bundle);

    })
  }

  formatBundle() {
    let json = JSON.stringify(this.bundle, null, "\t");
    console.log(json);
     return json;
  }




}
