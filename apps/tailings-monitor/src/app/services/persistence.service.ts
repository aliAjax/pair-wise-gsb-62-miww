import { Injectable } from '@angular/core'
import { Observable, delay, of, tap } from 'rxjs'
import type { TailingsDataset } from '../domain'
import { seedDataset } from '../data/seed'

const SNAPSHOT_KEY = 'tailings.snapshot.v1'
const PENDING_KEY = 'tailings.pending-writes.v1'

/** 前端模拟的可靠写入通道：快照与待恢复写入均持久化，刷新后可恢复 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private failNext = false

  /** 测试/演示用：让下一次写入失败，验证失败保留与恢复链路 */
  armFailure(): void {
    this.failNext = true
  }

  loadSnapshot(): TailingsDataset | null {
    const raw = globalThis.localStorage?.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as TailingsDataset
    } catch {
      return null
    }
  }

  seedSnapshot(): TailingsDataset {
    const dataset = structuredClone(seedDataset)
    this.persistSnapshot(dataset)
    return dataset
  }

  private persistSnapshot(dataset: TailingsDataset): void {
    globalThis.localStorage?.setItem(SNAPSHOT_KEY, JSON.stringify(dataset))
  }

  /** 写失败时返回 false；调用方必须保留写入项进入待恢复队列，不得推进状态 */
  writeSnapshot(dataset: TailingsDataset): Observable<boolean> {
    const shouldFail = this.failNext
    if (shouldFail) this.failNext = false
    return of(shouldFail).pipe(
      delay(shouldFail ? 120 : 60),
      tap((failed) => {
        if (!failed) this.persistSnapshot(dataset)
      })
    )
  }

  loadPending(): string[] {
    const raw = globalThis.localStorage?.getItem(PENDING_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  }

  savePending(serialized: string[]): void {
    globalThis.localStorage?.setItem(PENDING_KEY, JSON.stringify(serialized))
  }

  clearPending(): void {
    globalThis.localStorage?.removeItem(PENDING_KEY)
  }

  reset(): TailingsDataset {
    globalThis.localStorage?.removeItem(PENDING_KEY)
    return this.seedSnapshot()
  }
}
