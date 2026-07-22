import {
  Component, EventEmitter, HostListener, Input, Output,
} from '@angular/core';

// Generic full-bleed carousel shell: swipe (touch), arrow buttons (desktop),
// and keyboard navigation. It only knows about "how many slides" and "which
// index is active" — the actual slide content is authored by the parent as
// direct children (`.carousel-slide`), so new sections can be added without
// touching this component.
@Component({
  selector: 'app-review-carousel',
  standalone: true,
  templateUrl: './review-carousel.component.html',
  styleUrl: './review-carousel.component.css',
})
export class ReviewCarouselComponent {
  @Input() activeIndex = 0;
  @Input() total = 1;
  @Output() activeIndexChange = new EventEmitter<number>();

  private touchStartX: number | null = null;
  private touchDeltaX = 0;

  get canGoPrev(): boolean {
    return this.activeIndex > 0;
  }

  get canGoNext(): boolean {
    return this.activeIndex < this.total - 1;
  }

  get trackTransform(): string {
    return `translateX(-${this.activeIndex * 100}%)`;
  }

  goPrev(): void {
    if (this.canGoPrev) this.activeIndexChange.emit(this.activeIndex - 1);
  }

  goNext(): void {
    if (this.canGoNext) this.activeIndexChange.emit(this.activeIndex + 1);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (isTyping) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goNext();
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchDeltaX = 0;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchStartX === null) return;
    this.touchDeltaX = event.touches[0].clientX - this.touchStartX;
  }

  onTouchEnd(): void {
    const SWIPE_THRESHOLD = 50;
    if (this.touchDeltaX > SWIPE_THRESHOLD) {
      this.goPrev();
    } else if (this.touchDeltaX < -SWIPE_THRESHOLD) {
      this.goNext();
    }
    this.touchStartX = null;
    this.touchDeltaX = 0;
  }
}
