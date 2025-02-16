import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { isToday, parse } from 'date-fns';

import { DataService } from '../../services/data.service';
import { LineChartItem } from '../line-chart/interfaces/line-chart.interface';
import { PositionDetailDialogParams } from './interfaces/interfaces';

@Component({
  selector: 'gf-performance-chart-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'performance-chart-dialog.html',
  styleUrls: ['./performance-chart-dialog.component.scss']
})
export class PerformanceChartDialog {
  public benchmarkDataItems: LineChartItem[];
  public benchmarkLabel = 'S&P 500';
  public benchmarkSymbol = 'VOO';
  public currency: string;
  public firstBuyDate: string;
  public marketPrice: number;
  public historicalDataItems: LineChartItem[];
  public title: string;

  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<PerformanceChartDialog>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDetailDialogParams
  ) {
    this.dataService
      .fetchPositionDetail(this.benchmarkSymbol)
      .subscribe(({ currency, firstBuyDate, historicalData, marketPrice }) => {
        this.benchmarkDataItems = [];
        this.currency = currency;
        this.firstBuyDate = firstBuyDate;
        this.historicalDataItems = [];
        this.marketPrice = marketPrice;

        let coefficient = 1;

        this.historicalDataItems = this.data.historicalDataItems;

        this.historicalDataItems.forEach((historicalDataItem) => {
          const benchmarkItem = historicalData.find((item) => {
            return item.date === historicalDataItem.date;
          });

          if (benchmarkItem) {
            if (coefficient === 1) {
              coefficient = historicalDataItem.value / benchmarkItem.value || 1;
            }

            this.benchmarkDataItems.push({
              date: historicalDataItem.date,
              value: benchmarkItem.value * coefficient
            });
          } else if (
            isToday(parse(historicalDataItem.date, 'yyyy-MM-dd', new Date()))
          ) {
            this.benchmarkDataItems.push({
              date: historicalDataItem.date,
              value: marketPrice * coefficient
            });
          } else {
            this.benchmarkDataItems.push({
              date: historicalDataItem.date,
              value: undefined
            });
          }
        });

        this.cd.markForCheck();
      });

    this.title = `Performance vs. ${this.benchmarkLabel}`;
  }

  public onClose(): void {
    this.dialogRef.close();
  }
}
