import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Order as OrderModel } from '@prisma/client';
import { UpdateOrderDto } from 'apps/api/src/app/order/update-order.dto';
import { User } from 'apps/api/src/app/user/interfaces/user.interface';
import { hasPermission, permissions } from 'libs/helper/src';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../../services/data.service';
import { ImpersonationStorageService } from '../../services/impersonation-storage.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { CreateOrUpdateTransactionDialog } from './create-or-update-transaction-dialog/create-or-update-transaction-dialog.component';

@Component({
  selector: 'gf-transactions-page',
  templateUrl: './transactions-page.html',
  styleUrls: ['./transactions-page.scss']
})
export class TransactionsPageComponent implements OnInit {
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateOrder: boolean;
  public hasPermissionToDeleteOrder: boolean;
  public routeQueryParams: Subscription;
  public transactions: OrderModel[];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private tokenStorageService: TokenStorageService
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateTransactionDialog();
        } else if (params['editDialog']) {
          if (this.transactions) {
            const transaction = this.transactions.find((transaction) => {
              return transaction.id === params['transactionId'];
            });

            this.openUpdateTransactionDialog(transaction);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });
  }

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .subscribe((aId) => {
        this.hasImpersonationId = !!aId;
      });

    this.tokenStorageService
      .onChangeHasToken()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dataService.fetchUser().subscribe((user) => {
          this.user = user;
          this.hasPermissionToCreateOrder = hasPermission(
            user.permissions,
            permissions.createOrder
          );
          this.hasPermissionToDeleteOrder = hasPermission(
            user.permissions,
            permissions.deleteOrder
          );

          this.cd.markForCheck();
        });
      });

    this.fetchOrders();
  }

  public fetchOrders() {
    this.dataService.fetchOrders().subscribe((response) => {
      this.transactions = response;

      if (this.transactions?.length <= 0) {
        this.router.navigate([], { queryParams: { createDialog: true } });
      }

      this.cd.markForCheck();
    });
  }

  public onDeleteTransaction(aId: string) {
    this.dataService.deleteOrder(aId).subscribe({
      next: () => {
        this.fetchOrders();
      }
    });
  }

  public onUpdateTransaction(aTransaction: OrderModel) {
    this.router.navigate([], {
      queryParams: { editDialog: true, transactionId: aTransaction.id }
    });
  }

  private openCreateTransactionDialog(): void {
    const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
      data: {
        currency: null,
        date: new Date(),
        fee: 0,
        platformId: null,
        quantity: null,
        symbol: null,
        type: 'BUY',
        unitPrice: null
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((order: UpdateOrderDto) => {
      if (order) {
        this.dataService.postOrder(order).subscribe({
          next: () => {
            this.fetchOrders();
          }
        });
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  public openUpdateTransactionDialog({
    currency,
    date,
    fee,
    id,
    platformId,
    quantity,
    symbol,
    type,
    unitPrice
  }: OrderModel): void {
    const dialogRef = this.dialog.open(CreateOrUpdateTransactionDialog, {
      data: {
        currency,
        date,
        fee,
        id,
        platformId,
        quantity,
        symbol,
        type,
        unitPrice
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((order: UpdateOrderDto) => {
      if (order) {
        this.dataService.putOrder(order).subscribe({
          next: () => {
            this.fetchOrders();
          }
        });
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
