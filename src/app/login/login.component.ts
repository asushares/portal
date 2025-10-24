// Author: Abhishek Dhadwal

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PatientService } from '../patient.service';
import { Bundle, Patient } from 'fhir/r5';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <h1 class="h4 mb-3">patient portal login</h1>
              <form (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">first name</label>
                  <input class="form-control" [(ngModel)]="firstName" name="firstName" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">last name</label>
                  <input class="form-control" [(ngModel)]="lastName" name="lastName" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">password</label>
                  <input type="password" class="form-control" [(ngModel)]="password" name="password" required />
                </div>
                <button class="btn btn-primary w-100" type="submit" [disabled]="submitting">sign in</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card { border-radius: 0.75rem; }
  `]
})
export class LoginComponent {
  firstName = '';
  lastName = '';
  password = '';
  submitting = false;

  constructor(private router: Router, private toastr: ToastrService, private patientService: PatientService) {}

  private findBestPatientMatch(bundle: Bundle<Patient> | null, fullName: string): Patient | null {
    // minimal matching by display name contains full name
    if (!bundle || !bundle.entry) return null;
    const target = fullName.trim().toLowerCase();
    for (const be of bundle.entry) {
      const p = be.resource as Patient;
      if (!p || !p.name || p.name.length === 0) continue;
      const parts: string[] = [];
      if (p.name[0].given) parts.push(...p.name[0].given);
      if (p.name[0].family) parts.push(p.name[0].family);
      const name = parts.join(' ').trim().toLowerCase();
      if (name.includes(target)) return p;
    }
    return null;
  }

  onSubmit() {
    // simple auth
    if (this.password !== 'password') {
      this.toastr.error('invalid password', 'login failed');
      return;
    }
    const fullName = `${this.firstName} ${this.lastName}`.trim();
    if (!fullName) {
      this.toastr.error('enter first and last name', 'login failed');
      return;
    }
    this.submitting = true;
    this.patientService.searchByNames(this.firstName, this.lastName).subscribe({
      next: (b) => {
        const p = this.findBestPatientMatch(b, fullName) || (b.entry && b.entry[0]?.resource as Patient);
        if (p && p.id) {
          this.router.navigate(['portal', p.id]);
        } else {
          this.toastr.warning('no patient found for that name', 'not found');
          this.submitting = false;
        }
      },
      error: () => {
        this.toastr.error('unable to search patients', 'error');
        this.submitting = false;
      }
    });
  }
}


