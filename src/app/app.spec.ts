import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the two subject implementations', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.pattern')).toHaveLength(2);
    expect(compiled.textContent).toContain('Custom Subject');
    expect(compiled.textContent).toContain('RxJS BehaviorSubject');
    expect(compiled.querySelector('.event-log h2')?.textContent).toContain('Event log');
    expect(compiled.querySelector('.workspace')?.lastElementChild?.classList.contains('event-log')).toBe(true);
  });

  it('shows each implementation source when its disclosure is expanded', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const patterns = compiled.querySelectorAll<HTMLElement>('.pattern');
    const http = TestBed.inject(HttpTestingController);

    patterns[0].querySelector<HTMLButtonElement>('.source-toggle')?.click();
    patterns[1].querySelector<HTMLButtonElement>('.source-toggle')?.click();
    http.expectOne((request) => request.url.endsWith('observer-list-subject.service.ts')).flush(
      'export class ObserverListSubjectService { observerList.push(observer); }',
    );
    http.expectOne((request) => request.url.endsWith('behavior-subject.service.ts')).flush(
      'export class BehaviorSubjectStreamService { this.subject.asObservable(); }',
    );
    fixture.detectChanges();

    expect(patterns[0].querySelector('.source-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(patterns[0].querySelector('.source-code')?.textContent).toContain('observerList.push(observer)');
    expect(patterns[0].querySelector('.source-code .hljs-keyword')).not.toBeNull();
    expect(patterns[1].querySelector('.source-code')?.textContent).toContain('this.subject.asObservable()');
  });

  it('should replay the current value and log emissions in both panels', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const patterns = compiled.querySelectorAll<HTMLElement>('.pattern');

    patterns[0].querySelector<HTMLButtonElement>('.emit-button')?.click();
    fixture.detectChanges();
    expect(patterns[0].textContent).toContain('Current value1');
    expect(patterns[1].textContent).toContain('Current value0');
    patterns[1].querySelector<HTMLButtonElement>('.emit-button')?.click();

    for (const pattern of patterns) {
      pattern.querySelector<HTMLButtonElement>('.subscribe-button:not(.future-button)')?.click();
    }
    fixture.detectChanges();

    for (const pattern of patterns) {
      expect(pattern.textContent).toContain('Subscribers1');
      expect(pattern.textContent).toContain('Current value1');
    }

    const log = compiled.querySelector('.event-log')?.textContent ?? '';
    expect(log).toContain('Custom Subject');
    expect(log).toContain('RxJS BehaviorSubject');
    expect(log.match(/received 1/g)).toHaveLength(2);
    expect(compiled.querySelectorAll('.log-list [data-kind="emit"]')).toHaveLength(2);
    expect(compiled.querySelectorAll('.log-list [data-kind="receive"]')).toHaveLength(2);
  });

  it('can skip the current value when a subscriber is added', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const patterns = compiled.querySelectorAll<HTMLElement>('.pattern');
    for (const pattern of patterns) {
      pattern.querySelector<HTMLButtonElement>('.future-button')?.click();
    }
    fixture.detectChanges();

    let log = compiled.querySelector('.event-log')?.textContent ?? '';
    expect(log).not.toContain('received 0');

    patterns[0].querySelector<HTMLButtonElement>('.emit-button')?.click();
    fixture.detectChanges();
    log = compiled.querySelector('.event-log')?.textContent ?? '';
    expect(log).toContain('received 1');

    patterns[0].querySelector<HTMLButtonElement>('.subscribe-button:not(.future-button)')?.click();
    fixture.detectChanges();
    log = compiled.querySelector('.event-log')?.textContent ?? '';
    expect(log).toContain('Listener 3 received 1');
  });
});
