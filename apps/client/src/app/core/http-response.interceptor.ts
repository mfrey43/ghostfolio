import {
  HTTP_INTERCEPTORS,
  HttpErrorResponse,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { StatusCodes } from 'http-status-codes';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;

  public constructor(private snackBar: MatSnackBar) {}

  public intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          if (event.status === StatusCodes.ACCEPTED) {
            if (!this.snackBarRef) {
              this.snackBarRef = this.snackBar.open(
                'Sorry! Our data provider partner is experiencing a mild case of the hiccups ;(',
                'Try again?',
                { duration: 6000 }
              );

              this.snackBarRef.afterDismissed().subscribe(() => {
                this.snackBarRef = undefined;
              });

              this.snackBarRef.onAction().subscribe(() => {
                window.location.reload();
              });
            }
          }
        }

        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === StatusCodes.INTERNAL_SERVER_ERROR) {
          if (!this.snackBarRef) {
            this.snackBarRef = this.snackBar.open(
              'Oops! Something went wrong. Please try again later.',
              'Okay',
              { duration: 6000 }
            );

            this.snackBarRef.afterDismissed().subscribe(() => {
              this.snackBarRef = undefined;
            });

            this.snackBarRef.onAction().subscribe(() => {
              window.location.reload();
            });
          }
        }

        return throwError('');
      })
    );
  }
}

export const httpResponseInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: HttpResponseInterceptor, multi: true }
];
