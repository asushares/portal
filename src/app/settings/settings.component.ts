// Author: Preston Lee

import { Component, OnInit } from '@angular/core';
import { SettingsService } from './settings.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  constructor(protected toastService: ToastService, protected settingsService: SettingsService) {
  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.settingsService.reload();
  }

  save() {
    this.settingsService.saveSettings();
    this.toastService.showSuccessToast("Settings Saved", "Settings are local to your browser only.")
  }

  restore() {
    this.settingsService.forceResetToDefaults();
    this.toastService.showSuccessToast("Settings Restored", "All settings have been restored to their defaults.")

  }

}
