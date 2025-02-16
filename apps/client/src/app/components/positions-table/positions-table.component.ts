import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Order as OrderModel } from '@prisma/client';
import { PortfolioPosition } from 'apps/api/src/app/portfolio/interfaces/portfolio-position.interface';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PositionDetailDialog } from '../position/position-detail-dialog/position-detail-dialog.component';

@Component({
  selector: 'gf-positions-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './positions-table.component.html',
  styleUrls: ['./positions-table.component.scss']
})
export class PositionsTableComponent implements OnChanges, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() locale: string;
  @Input() positions: PortfolioPosition[];

  @Output() transactionDeleted = new EventEmitter<string>();
  @Output() transactionToUpdate = new EventEmitter<OrderModel>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<PortfolioPosition> = new MatTableDataSource();
  public displayedColumns = [];
  public isLoading = true;
  public pageSize = 7;
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
          params['title']
        ) {
          this.openPositionDialog({
            symbol: params['symbol'],
            title: params['title']
          });
        }
      });
  }

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = [
      'symbol',
      'performance',
      'shareInvestment',
      'shareCurrent'
    ];

    this.isLoading = true;

    if (this.positions) {
      this.dataSource = new MatTableDataSource(this.positions);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.isLoading = false;
    }
  }

  /*public applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }*/

  public onOpenPositionDialog({
    symbol,
    title
  }: {
    symbol: string;
    title: string;
  }): void {
    this.router.navigate([], {
      queryParams: { positionDetailDialog: true, symbol, title }
    });
  }

  public onShowAllPositions() {
    this.pageSize = Number.MAX_SAFE_INTEGER;

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    });
  }

  public openPositionDialog({
    symbol,
    title
  }: {
    symbol: string;
    title: string;
  }): void {
    const dialogRef = this.dialog.open(PositionDetailDialog, {
      autoFocus: false,
      data: {
        symbol,
        title,
        baseCurrency: this.baseCurrency,
        deviceType: this.deviceType,
        locale: this.locale
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
