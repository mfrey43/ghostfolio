import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PositionDetailDialog } from './position-detail-dialog/position-detail-dialog.component';

@Component({
  selector: 'gf-position',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './position.component.html',
  styleUrls: ['./position.component.scss']
})
export class PositionComponent implements OnDestroy, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() position: PortfolioPosition;
  @Input() range: string;

  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['positionDetailDialog'] &&
          params['symbol'] &&
          params['symbol'] === this.position?.symbol
        ) {
          this.openDialog();
        }
      });
  }

  public ngOnInit() {}

  private openDialog(): void {
    const dialogRef = this.dialog.open(PositionDetailDialog, {
      autoFocus: false,
      data: {
        baseCurrency: this.baseCurrency,
        deviceType: this.deviceType,
        locale: this.locale,
        symbol: this.position?.symbol,
        title: this.position?.name
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
