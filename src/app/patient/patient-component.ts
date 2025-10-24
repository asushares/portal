// Author: Preston Lee
import { Component } from '@angular/core';
import { Bundle, Patient } from 'fhir/r5';
import { PatientService } from '../patient.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'patient',
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-component.html',
  styleUrl: './patient-component.scss'
})
export class PatientComponent {
  public patientSearchText = '';
  patientList: Bundle<Patient> | null = null;
  // patientSelected: Patient | null = null;
  patientSearching: boolean = false;

  constructor(
    private patientService: PatientService,
    private router: Router,
  ) {}

  patientSearch(_text: string) {
    this.patientList = null;
    this.patientSearching = true;
    this.patientService.search(this.patientSearchText).subscribe(b => {
      this.patientList = b;
      this.patientSearching = false;
    });
  }

  launchPatientPortal(p: Patient) {
    this.router.navigate(['portal', p.id]);
  }
}
