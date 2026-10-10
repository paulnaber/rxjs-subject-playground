import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { skip } from 'rxjs/operators';
import { ReactiveService } from './reactivity-services';

@Injectable()
export class BehaviorSubjectStreamService implements ReactiveService {
  private readonly subject = new BehaviorSubject<number>(0);

  getObservable(fireImmediately = true): Observable<number> {
    const observable = this.subject.asObservable();
    return fireImmediately ? observable : observable.pipe(skip(1));
  }

  emit(value: number): void {
    this.subject.next(value);
  }
}