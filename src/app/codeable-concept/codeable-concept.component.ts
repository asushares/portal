// Author: Preston Lee

import { Component, Input } from '@angular/core';
import {v4 as uuidv4} from 'uuid';

import { CodeableConcept, Coding } from 'fhir/r5';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'codeable-concept',
  templateUrl: './codeable-concept.component.html',
  styleUrls: ['./codeable-concept.component.scss']
})
export class CodeableConceptComponent extends BaseComponent {


  @Input() codeableConcept: CodeableConcept | null = null;

  createCoding() {
    if(this.codeableConcept) {
        this.codeableConcept.coding = this.codeableConcept.coding || [];
        this.codeableConcept.coding.push({id: uuidv4(), system: '', code: '', display: '' });
        console.log("added");
      }
  }

  deleteCoding(coding: Coding) {
    if (this.codeableConcept?.coding) {
      for (let i = 0; i < this.codeableConcept.coding.length; i++) {
        if (this.codeableConcept.coding[i].id == coding.id) {
          this.codeableConcept.coding.splice(i, 1);
        }


      }
    }
  }
}
