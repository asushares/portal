// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  imports: [CommonModule, RouterLink]
})
export class LandingComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
