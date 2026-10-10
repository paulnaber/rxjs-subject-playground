import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { ReactiveService } from './reactivity-services';

@Injectable()
export class ObserverListSubjectService implements ReactiveService {
  private currentValue = 0;
  private readonly observerList: Observer<number>[] = [];

  getObservable(fireImmediately = true): Observable<number> {
    return new Observable((observer) => {
      this.observerList.push(observer);
      if (fireImmediately) {
        observer.next(this.currentValue);
      }
      return () => this.removeObserver(observer);
    });
  }

  emit(value: number): void {
    this.currentValue = value;
    this.informObservers();
  }

  informObservers(): void {
    for (const observer of [...this.observerList]) {
      observer.next(this.currentValue);
    }
  }

  private removeObserver(observer: Observer<number>): void {
    const index = this.observerList.indexOf(observer);
    if (index >= 0) {
      this.observerList.splice(index, 1);
    }
  }
}