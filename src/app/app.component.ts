import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { Link, LinksService } from './links.service';

const httpUrl: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try {
    const url = new URL(control.value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
};

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly form = new FormGroup({
    url: new FormControl('', { nonNullable: true, validators: [Validators.required, httpUrl] })
  });
  readonly links = signal<Link[]>([]);
  readonly createdLink = signal<Link | null>(null);
  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly listError = signal('');
  readonly serverError = signal('');
  private listRequest?: Subscription;

  constructor(private readonly service: LinksService) {}

  ngOnInit(): void {
    this.form.controls.url.valueChanges.subscribe(() => this.serverError.set(''));
    this.loadLinks();
  }

  showFieldError(): boolean {
    const field = this.form.controls.url;
    return !!this.serverError() || (field.invalid && field.touched);
  }

  fieldError(): string {
    if (this.serverError()) return this.serverError();
    const field = this.form.controls.url;
    if (!field.touched) return '';
    if (field.hasError('required')) return 'Enter a URL.';
    if (field.hasError('httpUrl')) return 'Enter a valid HTTP or HTTPS URL.';
    return '';
  }

  submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.serverError.set('');
    this.createdLink.set(null);
    this.submitting.set(true);
    this.service.create(this.form.controls.url.value.trim())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: link => {
          this.createdLink.set(link);
          this.form.reset();
          this.loadLinks();
        },
        error: (error: HttpErrorResponse) => this.serverError.set(this.errorMessage(error, 'Could not shorten the URL. Please try again.'))
      });
  }

  loadLinks(): void {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.listError.set('');
    this.listRequest = this.service.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: links => this.links.set(links),
      error: () => this.listError.set('Could not load links. Please check the connection and try again.')
    });
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    return typeof error.error?.error === 'string' ? error.error.error : fallback;
  }
}
