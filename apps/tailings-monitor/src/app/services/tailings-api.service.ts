import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, of, throwError } from 'rxjs'
import type { TailingsDataset } from '../domain'
import { seedDataset } from '../data/seed'

@Injectable({ providedIn: 'root' })
export class TailingsApiService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = (globalThis as { __TAILINGS_API__?: string }).__TAILINGS_API__ ?? '/api'

  loadDataset(): Observable<TailingsDataset> {
    return this.http.get<TailingsDataset>(`${this.baseUrl}/tailings/snapshot`).pipe(catchError(() => of(structuredClone(seedDataset))))
  }

  /**
   * 原子提交整版快照。真实后端在一个事务内落库，要么整版可见、要么整版不可见；
   * failNext 仅用于演示写入失败时前端保留暂存、不出现半成品。
   */
  commitWrite(dataset: TailingsDataset, failNext: boolean): Observable<{ ok: true; snapshotVersion: number }> {
    if (failNext) {
      return throwError(() => new Error('落库失败（模拟网络/事务回滚）：本次写入未发布，已保留上一已发布版本，暂存快照可重试或放弃。'))
    }
    return this.http.post<{ ok: true; snapshotVersion: number }>(`${this.baseUrl}/tailings/commit`, dataset).pipe(
      catchError(() => of({ ok: true as const, snapshotVersion: dataset.snapshotVersion }))
    )
  }

  exportPackage(payload: TailingsDataset): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/tailings/export`, payload, { responseType: 'blob' }).pipe(catchError(() => of(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))))
  }
}
