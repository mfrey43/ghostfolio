import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'show-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html'
})
export class ShowAccessTokenDialog {
  public isAgreeButtonDisabled = true;

  public constructor(
    private cd: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}

  public enableAgreeButton() {
    setTimeout(() => {
      this.isAgreeButtonDisabled = false;

      this.cd.markForCheck();
    }, 1500);
  }
}
