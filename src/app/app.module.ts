import { BrowserModule } from '@angular/platform-browser';
import { NgModule, NO_ERRORS_SCHEMA }      from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ToastrModule} from 'ngx-toastr';

import { AppRoutingModule } from './app-routing.module';

import {AppComponent} from './app.component';

import { BrowserComponent } from './browser/browser.component';

import { BackendService } from './backend/backend.service';
import { BuilderComponent } from './builder/builder.component';


@NgModule({
    imports: [
		AppRoutingModule,
        BrowserModule,
        FormsModule,
        HttpClientModule,
		BrowserAnimationsModule, // For Toaster
        ToastrModule.forRoot()
	],
    declarations: [
        AppComponent,
        BrowserComponent,
        BuilderComponent
    ],   // components and directives
    providers: [
        BackendService
        // { provide: 'Window', useValue: window }
    ],                    // products
    bootstrap: [AppComponent]     // root component
})
export class AppModule {
}
