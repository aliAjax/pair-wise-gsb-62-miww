import { CommonModule } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { MatBadgeModule } from '@angular/material/badge'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { Store } from '@ngrx/store'
import { TailingsActions } from './store/tailings.actions'
import { selectHasFailedWrites, selectNotices, selectPendingWrites, selectRevision, selectWriting } from './store/tailings.selectors'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  template: `
    <mat-sidenav-container class="app-shell">
      <mat-sidenav mode="side" opened class="side-nav">
        <div class="brand"><strong>尾</strong><div><b>尾矿库安全审阅台</b><span>监测、异常与应急联动</span></div></div>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><span>监测总览</span><small>调度令 · 地图 · 阈值</small></a>
          <a routerLink="/monitoring" routerLinkActive="active"><span>测点与读数</span><small>原始数据只读</small></a>
          <a routerLink="/dispatch" routerLinkActive="active"><span>调度令</span><small>生效级联与重算</small></a>
          <a routerLink="/anomalies" routerLinkActive="active"><span>异常处置</span><small>方案 · 会签 · 联动</small></a>
          <a routerLink="/audit" routerLinkActive="active"><span>审计追溯</span><small>版本与审阅包</small></a>
        </nav>
        <div class="side-state">
          <span>同版口径</span>
          <b>看板/详情/审阅包 = R{{ revision$ | async }}</b>
          <small>调度令换版后方案失效重算，联动保留原依据</small>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          <div><span>矿山安全运营中心 / 尾矿库 · 汛期</span><h1>调度令—异常—方案—应急联动 一体化审阅</h1></div>
          <div class="top-actions">
            <span class="revision" matTooltip="全库一致性版本：每次原子写入 +1，所有页面同版展示">R{{ revision$ | async }}<em *ngIf="writing$ | async">写入中…</em></span>
            <button mat-button (click)="armFailure()" matTooltip="演示：让下一次写入失败，验证可恢复链路">模拟下一笔写入失败</button>
            <button mat-button (click)="reset()">恢复演示数据</button>
          </div>
        </mat-toolbar>

        <div class="recovery-bar" *ngIf="hasFailed$ | async">
          <div class="recovery-text">
            <b>有 {{ (pending$ | async)?.length }} 笔写入失败待恢复</b>
            <span>数据仍为上次已落盘版本，恢复前不会出现「联动已启动、方案仍旧版」等半成品。</span>
            <ul>
              <li *ngFor="let item of (pending$ | async)">
                {{ item.label }} · 依据 R{{ item.basisRevision }} · {{ item.attempts }}次尝试 · {{ item.lastError }}
                <button mat-button color="primary" (click)="recover()">立即恢复全部</button>
                <button mat-button (click)="discard(item.id)">放弃此笔</button>
              </li>
            </ul>
          </div>
        </div>

        <div class="notices">
          <article *ngFor="let note of (notices$ | async)" [class]="note.tone">
            <b>{{ note.title }}</b><span>{{ note.detail }}</span>
            <button mat-icon-button (click)="dismiss(note.id)"><mat-icon>close</mat-icon></button>
          </article>
        </div>

        <main><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-shell { height: 100vh; background: #edf1f0; }
    .side-nav { width: 238px; border-radius: 0; background: #213a44; color: white; padding: 22px 16px; }
    .brand { display: flex; align-items: center; gap: 10px; padding-bottom: 22px; border-bottom: 1px solid #405b64; }
    .brand strong { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 4px; background: #d2a53f; color: #213a44; font-size: 19px; }
    .brand b, .brand span { display: block; } .brand b { font-size: 14px; } .brand span { color: #a1b6bd; font-size: 10px; margin-top: 4px; }
    nav { display: grid; gap: 6px; padding-top: 18px; }
    nav a { color: #a9bbc1; padding: 11px 12px; display: grid; gap: 3px; border-radius: 4px; text-decoration: none; }
    nav a.active { background: #304e59; color: white; border-left: 3px solid #d2a53f; }
    nav small { color: #7f9ba3; font-size: 10px; }
    .side-state { margin-top: 30px; padding: 14px; background: #1a3039; display: grid; gap: 5px; }
    .side-state span, .side-state small { color: #87a2aa; font-size: 10px; } .side-state b { font-size: 12px; }
    .topbar { min-height: 78px; height: auto; background: white; border-bottom: 1px solid #d9e1df; display: flex; justify-content: space-between; padding: 10px 28px; gap: 12px; align-items: center; flex-wrap: wrap; }
    .topbar span { display: block; color: #74827f; font-size: 10px; } .topbar h1 { margin: 3px 0 0; font-size: 18px; }
    .top-actions { display: flex; align-items: center; gap: 6px; } .revision { background: #eef3f2; color: #315d6e; font-weight: 700; padding: 6px 10px; border-radius: 4px; font-size: 13px; display: inline-flex; gap: 8px; align-items: center; }
    .revision em { font-style: normal; font-size: 10px; color: #b08a2e; }
    main { min-height: calc(100vh - 78px); }
    :host ::ng-deep .mat-drawer-inner-container { overflow: hidden; }
    .recovery-bar { background: #fbeceb; border-bottom: 2px solid #c2564d; padding: 10px 28px; }
    .recovery-bar b { color: #a23b34; font-size: 13px; } .recovery-bar span { color: #8a5752; font-size: 11px; margin-left: 10px; }
    .recovery-bar ul { margin: 6px 0 0; padding-left: 18px; } .recovery-bar li { font-size: 11px; color: #7b4d49; margin: 3px 0; }
    .notices { position: fixed; right: 18px; bottom: 18px; z-index: 30; display: grid; gap: 8px; width: 360px; }
    .notices article { background: white; border-left: 4px solid #315d6e; box-shadow: 0 6px 22px rgba(20, 40, 48, 0.16); padding: 10px 12px; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: start; }
    .notices article b { font-size: 12px; } .notices article span { grid-column: 1 / 2; font-size: 11px; color: #667572; }
    .notices article button { grid-column: 2; grid-row: 1 / 3; }
    .notices .success { border-left-color: #2e7d5b; } .notices .success b { color: #2e7d5b; }
    .notices .warn { border-left-color: #b08a2e; } .notices .warn b { color: #936d20; }
    .notices .error { border-left-color: #a23b34; } .notices .error b { color: #a23b34; }
    .notices .info { border-left-color: #315d6e; } .notices .info b { color: #315d6e; }
  `]
})
export class AppComponent implements OnInit {
  private readonly store = inject(Store)
  readonly revision$ = this.store.select(selectRevision)
  readonly writing$ = this.store.select(selectWriting)
  readonly hasFailed$ = this.store.select(selectHasFailedWrites)
  readonly pending$ = this.store.select(selectPendingWrites)
  readonly notices$ = this.store.select(selectNotices)

  ngOnInit(): void { this.store.dispatch(TailingsActions.loadDataset()) }
  reset(): void { this.store.dispatch(TailingsActions.resetDemo()) }
  armFailure(): void { this.store.dispatch(TailingsActions.armFailure()) }
  recover(): void { this.store.dispatch(TailingsActions.recoverWrites()) }
  discard(writeId: string): void { this.store.dispatch(TailingsActions.discardPendingWrite({ writeId })) }
  dismiss(noticeId: string): void { this.store.dispatch(TailingsActions.dismissNotice({ noticeId })) }
}
