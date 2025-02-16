import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdminData } from 'apps/api/src/app/admin/interfaces/admin-data.interface';
import { formatDistanceToNow, isValid, parseISO, sub } from 'date-fns';
import { DEFAULT_DATE_FORMAT } from 'libs/helper/src';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AdminService } from '../../services/admin.service';
import { CacheService } from '../../services/cache.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'gf-admin-page',
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.scss']
})
export class AdminPageComponent implements OnInit {
  public analytics: AdminData['analytics'];
  public dataGatheringInProgress: boolean;
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public exchangeRates: { label1: string; label2: string; value: number }[];
  public lastDataGathering: string;
  public transactionCount: number;
  public userCount: number;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private adminService: AdminService,
    private cacheService: CacheService,
    private cd: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.dataService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({
          analytics,
          exchangeRates,
          lastDataGathering,
          transactionCount,
          userCount
        }) => {
          this.analytics = analytics;
          this.exchangeRates = exchangeRates;

          if (isValid(parseISO(lastDataGathering?.toString()))) {
            this.lastDataGathering = formatDistanceToNow(
              new Date(lastDataGathering),
              {
                addSuffix: true
              }
            );
          } else if (lastDataGathering === 'IN_PROGRESS') {
            this.dataGatheringInProgress = true;
          } else {
            this.lastDataGathering = '-';
          }

          this.transactionCount = transactionCount;
          this.userCount = userCount;

          this.cd.markForCheck();
        }
      );
  }

  public onFlushCache() {
    this.cacheService.flush().subscribe(() => {
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  public onGatherMax() {
    this.adminService.gatherMax().subscribe(() => {
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  public formatDistanceToNow(aDateString: string) {
    const distanceString = formatDistanceToNow(
      sub(parseISO(aDateString), { seconds: 10 }),
      {
        addSuffix: true
      }
    );

    return distanceString === 'less than a minute ago'
      ? 'just now'
      : distanceString;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
