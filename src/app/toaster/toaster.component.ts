
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ToastEvent } from '../toast/toast_event';
import { ToastService } from '../toast/toast.service';
import { NgFor } from '@angular/common';
import { ToastComponent } from '../toast/toast.component';

@Component({
    selector: 'toaster',
    templateUrl: './toaster.component.html',
    styleUrls: ['./toaster.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgFor, ToastComponent],
})
export class ToasterComponent implements OnInit {
  currentToasts: ToastEvent[] = [];

  constructor(protected toastService: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.subscribeToToasts();
  }

  subscribeToToasts() {
    this.toastService.toastEvents.subscribe((toasts) => {
      const currentToast: ToastEvent = {
        type: toasts.type,
        title: toasts.title,
        message: toasts.message,
      };
      this.currentToasts.push(currentToast);
      this.cdr.detectChanges();
    });
  }

  dispose(index: number) {
    this.currentToasts.splice(index, 1);
    this.cdr.detectChanges();
  }
}