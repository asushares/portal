import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeableConceptComponent } from './codeable-concept.component';

describe('CodeableConceptComponent', () => {
  let component: CodeableConceptComponent;
  let fixture: ComponentFixture<CodeableConceptComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [CodeableConceptComponent]
});
    fixture = TestBed.createComponent(CodeableConceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
