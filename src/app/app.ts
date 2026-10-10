import { Component, Inject, OnDestroy, WritableSignal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import { Subscription } from 'rxjs';
import { BehaviorSubjectStreamService } from './behavior-subject.service';
import { ObserverListSubjectService } from './observer-list-subject.service';
import {
  ReactiveService,
} from './reactivity-services';

hljs.registerLanguage('typescript', typescript);

interface SubscriberHandle {
  id: number;
  subscription: Subscription;
}

interface PatternState {
  id: string;
  name: string;
  kind: string;
  description: string;
  sourcePath: string;
  sourceExpanded: WritableSignal<boolean>;
  sourceLoading: WritableSignal<boolean>;
  sourceLoaded: WritableSignal<boolean>;
  sourceError: WritableSignal<boolean>;
  highlightedSourceCode: WritableSignal<string>;
  service: ReactiveService;
  subscribers: WritableSignal<SubscriberHandle[]>;
  latestValue: WritableSignal<number>;
  nextValue: number;
}

interface LogEntry {
  id: number;
  time: string;
  source: string;
  kind: 'emit' | 'receive' | 'subscribe' | 'unsubscribe';
  message: string;
}

@Component({
  providers: [BehaviorSubjectStreamService, ObserverListSubjectService],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  protected readonly logs = signal<LogEntry[]>([]);
  protected readonly patterns: PatternState[];
  private nextSubscriberId = 0;
  private nextLogId = 0;
  private readonly sourceRequests = new Subscription();

  constructor(
    private readonly http: HttpClient,
    @Inject(BehaviorSubjectStreamService)
    behaviorSubject: BehaviorSubjectStreamService,
    @Inject(ObserverListSubjectService)
    customSubject: ObserverListSubjectService,
  ) {
    this.patterns = [
      {
        id: 'custom-subject',
        name: 'Custom Subject',
        kind: 'Observer list',
        description: 'Stores the current value and broadcasts through a list of listeners.',
        sourcePath: 'source-code/observer-list-subject.service.ts',
        service: customSubject,
      },
      {
        id: 'behavior-subject',
        name: 'RxJS BehaviorSubject',
        kind: 'RxJS',
        description: 'Stores its current value and replays it to each new subscriber.',
        sourcePath: 'source-code/behavior-subject.service.ts',
        service: behaviorSubject,
      },
    ].map((pattern) => ({
      ...pattern,
      sourceExpanded: signal(false),
      sourceLoading: signal(false),
      sourceLoaded: signal(false),
      sourceError: signal(false),
      highlightedSourceCode: signal(''),
      subscribers: signal<SubscriberHandle[]>([]),
      latestValue: signal(0),
      nextValue: 0,
    }));
  }

  protected addSubscriber(pattern: PatternState, fireImmediately: boolean): void {
    const id = ++this.nextSubscriberId;
    this.log(
      pattern,
      'subscribe',
      `Listener ${id} subscribed${fireImmediately ? ' with current value' : ' for future values'}`,
    );
    const subscription = pattern.service
      .getObservable(fireImmediately)
      .subscribe((value) => {
        pattern.latestValue.set(value);
        this.log(pattern, 'receive', `Listener ${id} received ${value}`);
      });

    pattern.subscribers.update((subscribers) => [...subscribers, { id, subscription }]);
  }

  protected removeSubscriber(pattern: PatternState, id: number): void {
    const subscriber = pattern.subscribers().find((item) => item.id === id);
    if (!subscriber) {
      return;
    }

    subscriber.subscription.unsubscribe();
    pattern.subscribers.update((subscribers) => subscribers.filter((item) => item.id !== id));
    this.log(pattern, 'unsubscribe', `Listener ${id} unsubscribed`);
  }

  protected emit(pattern: PatternState): void {
    const value = ++pattern.nextValue;
    pattern.latestValue.set(value);
    this.log(pattern, 'emit', `Emitted ${value}`);
    pattern.service.emit(value);
  }

  protected clearLog(): void {
    this.logs.set([]);
  }

  protected toggleSource(pattern: PatternState): void {
    const shouldExpand = !pattern.sourceExpanded();
    pattern.sourceExpanded.set(shouldExpand);

    if (!shouldExpand || pattern.sourceLoaded() || pattern.sourceLoading()) {
      return;
    }

    pattern.sourceLoading.set(true);
    const sourceUrl = new URL(pattern.sourcePath, document.baseURI).toString();
    this.sourceRequests.add(
      this.http.get(sourceUrl, { responseType: 'text' }).subscribe({
        next: (sourceCode) => {
          pattern.highlightedSourceCode.set(
            hljs.highlight(sourceCode, { language: 'typescript' }).value,
          );
          pattern.sourceLoading.set(false);
          pattern.sourceLoaded.set(true);
        },
        error: () => {
          pattern.sourceLoading.set(false);
          pattern.sourceError.set(true);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.sourceRequests.unsubscribe();
    for (const pattern of this.patterns) {
      for (const subscriber of pattern.subscribers()) {
        subscriber.subscription.unsubscribe();
      }
    }
  }

  private log(
    pattern: PatternState,
    kind: LogEntry['kind'],
    message: string,
  ): void {
    const entry: LogEntry = {
      id: ++this.nextLogId,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      source: pattern.name,
      kind,
      message,
    };
    this.logs.update((entries) => [...entries.slice(-119), entry]);
  }
}
