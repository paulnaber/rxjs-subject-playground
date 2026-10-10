import { Observable } from 'rxjs';

export interface ReactiveService {
  getObservable(fireImmediately?: boolean): Observable<number>;
  emit(value: number): void;
}