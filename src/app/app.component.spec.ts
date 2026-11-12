import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { Link } from './links.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let http: HttpTestingController;
  const link: Link = {
    code: 'abc123', url: 'https://example.com/', shortUrl: 'http://localhost:3000/abc123',
    hits: 0, createdAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/links').flush([]);
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('rejects empty and non-http URLs without submitting', () => {
    app.submit();
    expect(app.fieldError()).toBe('Enter a URL.');
    app.form.controls.url.setValue('ftp://example.com');
    app.submit();
    expect(app.fieldError()).toBe('Enter a valid HTTP or HTTPS URL.');
    http.expectNone(request => request.method === 'POST');
  });

  it('creates a link once and refreshes the table', () => {
    app.form.controls.url.setValue('https://example.com');
    app.submit();
    app.submit();
    const request = http.expectOne('/api/links');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: 'https://example.com' });
    expect(app.submitting()).toBeTrue();
    request.flush(link, { status: 201, statusText: 'Created' });
    expect(app.submitting()).toBeFalse();
    expect(app.createdLink()).toEqual(link);
    http.expectOne('/api/links').flush([link]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('abc123');
    expect(app.links()).toEqual([link]);
  });

  it('shows server errors beside the field and allows retry', () => {
    app.form.controls.url.setValue('https://example.com');
    app.submit();
    http.expectOne('/api/links').flush({ error: 'Invalid URL.' }, { status: 400, statusText: 'Bad Request' });
    expect(app.fieldError()).toBe('Invalid URL.');
    expect(app.submitting()).toBeFalse();
    app.form.controls.url.setValue('https://example.org');
    expect(app.fieldError()).toBe('');
  });

  it('shows list and network errors', () => {
    app.loadLinks();
    http.expectOne('/api/links').error(new ProgressEvent('error'));
    expect(app.listError()).toContain('Could not load links');
    app.form.controls.url.setValue('https://example.com');
    app.submit();
    http.expectOne('/api/links').error(new ProgressEvent('error'));
    expect(app.fieldError()).toContain('Could not shorten');
  });

  it('refreshes after creation even when a previous list request is pending', () => {
    app.loadLinks();
    const pending = http.expectOne('/api/links');
    app.form.controls.url.setValue('https://example.com');
    app.submit();
    http.expectOne('/api/links').flush(link);
    expect(pending.cancelled).toBeTrue();
    http.expectOne('/api/links').flush([link]);
    expect(app.links()).toEqual([link]);
  });
});
