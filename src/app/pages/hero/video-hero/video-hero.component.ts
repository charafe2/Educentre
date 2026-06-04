import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { concat, interval, Subscription, timer } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

const INTRO_TITLE = 'Moujtahid';
const TYPEWRITER_TEXT = 'plateforme numero 1 pour la gestion des centres scolaires';
const TYPEWRITER_SPEED_MS = 55;
const DELETE_SPEED_MS = 45;

@Component({
  selector: 'app-video-hero',
  standalone: true,
  templateUrl: './video-hero.component.html',
  styleUrl: './video-hero.component.scss',
})
export class VideoHeroComponent implements AfterViewInit, OnDestroy {
  @Output() commence = new EventEmitter<void>();
  @ViewChild('introVideo') private introVideo?: ElementRef<HTMLVideoElement>;

  titleText = INTRO_TITLE;
  showCursor = false;

  private subscriptions = new Subscription();

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.startIntroSequence();

    const video = this.introVideo?.nativeElement;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const play = () => {
      void video.play().catch(() => {
        // Some browser settings still block autoplay even when muted.
      });
    };

    video.load();
    this.subscriptions.add(timer(0, 250).pipe(take(5)).subscribe(play));

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
      return;
    }

    video.addEventListener('loadedmetadata', play, { once: true });
    video.addEventListener('loadeddata', play, { once: true });
    video.addEventListener('canplay', play, { once: true });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onCommence(): void {
    this.proceedToLanding();
  }

  onVideoEnded(): void {
    this.proceedToLanding();
  }

  private proceedToLanding(): void {
    this.commence.emit();
  }

  private startIntroSequence(): void {
    const sequence$ = concat(
      timer(0).pipe(tap(() => this.setTitleText(INTRO_TITLE))),
      timer(1500).pipe(tap(() => this.setCursorVisible(true))),
      this.deleteText(INTRO_TITLE, DELETE_SPEED_MS).pipe(
        tap((text) => this.setTitleText(text)),
      ),
      this.type(TYPEWRITER_TEXT, TYPEWRITER_SPEED_MS).pipe(
        tap((text) => this.setTitleText(text)),
      ),
    );

    this.subscriptions.add(
      sequence$.subscribe({
        complete: () => {
          this.setCursorVisible(false);
        },
      }),
    );
  }

  private setTitleText(text: string): void {
    this.titleText = text;
    this.cdr.detectChanges();
  }

  private setCursorVisible(isVisible: boolean): void {
    this.showCursor = isVisible;
    this.cdr.detectChanges();
  }

  private type(text: string, speed: number) {
    return interval(speed).pipe(
      take(text.length),
      map((index) => text.slice(0, index + 1)),
    );
  }

  private deleteText(text: string, speed: number) {
    return interval(speed).pipe(
      take(text.length),
      map((index) => text.slice(0, text.length - index - 1)),
    );
  }
}
