// Author: Preston Lee

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperationOutcome, Consent } from 'fhir/r5';
import { ConsentService } from '../consent/consent.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'consent-validation',
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ValidationComponent implements OnInit {
  @Input() consent: Consent | null = null;
  @Output() validationComplete = new EventEmitter<OperationOutcome | null>();

  validationResult: OperationOutcome | null = null;
  isValidating: boolean = false;
  validationProfile: string = '';

  constructor(
    private consentService: ConsentService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    // Component initialization
  }

  validateConsent() {
    if (!this.consent) {
      this.toastrService.error('No consent to validate', 'Validation Error');
      return;
    }

    this.isValidating = true;
    this.validationResult = null;

    const profile = this.validationProfile?.trim() || undefined;
    
    this.consentService.validate(this.consent, profile).subscribe({
      next: (result) => {
        this.validationResult = result;
        this.isValidating = false;
        this.validationComplete.emit(result);
        
        if (this.hasValidationErrors()) {
          this.toastrService.warning(`Validation completed with ${this.getValidationErrorCount()} issue(s)`, 'Validation Results');
        } else {
          this.toastrService.success('Consent is valid according to FHIR specifications', 'Validation Successful');
        }
      },
      error: (error) => {
        this.isValidating = false;
        console.error('Validation error:', error);
        this.toastrService.error('Failed to validate consent. Please check your connection and try again.', 'Validation Failed');
        this.validationComplete.emit(null);
      }
    });
  }

  hasValidationErrors(): boolean {
    if (!this.validationResult?.issue) {
      return false;
    }
    
    return this.validationResult.issue.some(issue => 
      issue.severity === 'error' || issue.severity === 'fatal'
    );
  }

  getValidationErrorCount(severity?: string): number {
    if (!this.validationResult?.issue) {
      return 0;
    }
    
    if (severity) {
      return this.validationResult.issue.filter(issue => issue.severity === severity).length;
    }
    
    return this.validationResult.issue.length;
  }

  getIssueCode(issue: any): string {
    if (!issue.code) {
      return 'No code available';
    }
    
    if (typeof issue.code === 'string') {
      return issue.code;
    }
    
    if (issue.code.coding && issue.code.coding.length > 0) {
      return issue.code.coding[0].code || issue.code.coding[0].display || 'Unknown code';
    }
    
    if (issue.code.text) {
      return issue.code.text;
    }
    
    return 'Unknown code';
  }
}
