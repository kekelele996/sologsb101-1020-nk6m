/**
 * 重份识别工具
 * 同一碑刻下收藏号相同（去首尾空白后非空）的两份及以上拓本视为同一件的重份：
 * 登记最早（createdAt 升序，其次版本序号升序）的为正本，其余为重份候选。
 * 收藏号空着的不参与识别；识别结果仅供登记台列出，是否生效以 duplicateOf 标记为准。
 */
import type { Rubbing } from '@/types/rubbing';

export interface DuplicateGroup {
  /** 归组键：steleId + 归一化收藏号 */
  key: string;
  steleId: string;
  collectionNo: string;
  /** 正本：组内先登的拓本 */
  keeper: Rubbing;
  /** 重份候选：组内后登的拓本（按登记先后排序） */
  duplicates: Rubbing[];
}

/** 收藏号归一化：去首尾空白；空串视为未编，不参与重份识别 */
export function normalizeCollectionNo(value: string): string {
  return value.trim();
}

function byRegistration(a: Rubbing, b: Rubbing): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.versionNo - b.versionNo;
}

/** 按收藏号归组，找出全部重份组（仅同碑刻内比较） */
export function findDuplicateGroups(rubbings: Rubbing[]): DuplicateGroup[] {
  const buckets = new Map<string, Rubbing[]>();
  rubbings.forEach((rubbing) => {
    const collectionNo = normalizeCollectionNo(rubbing.collectionNo);
    if (collectionNo.length === 0) return;
    const key = `${rubbing.steleId}::${collectionNo}`;
    buckets.set(key, [...(buckets.get(key) ?? []), rubbing]);
  });
  const groups: DuplicateGroup[] = [];
  buckets.forEach((list, key) => {
    if (list.length < 2) return;
    const [keeper, ...duplicates] = [...list].sort(byRegistration);
    if (!keeper) return;
    groups.push({
      key,
      steleId: keeper.steleId,
      collectionNo: normalizeCollectionNo(keeper.collectionNo),
      keeper,
      duplicates,
    });
  });
  return groups.sort((a, b) => byRegistration(a.keeper, b.keeper));
}

/**
 * 悬空重份标记：已标 duplicateOf，但按当前收藏号已不在任何重份组内
 * （如标记后改了他号、或正本收藏号被改），需要在登记台给出撤销入口。
 */
export function findOrphanMarked(rubbings: Rubbing[], groups: DuplicateGroup[]): Rubbing[] {
  const covered = new Map<string, string>();
  groups.forEach((group) => {
    group.duplicates.forEach((dup) => covered.set(dup.id, group.keeper.id));
  });
  return rubbings.filter((rubbing) => Boolean(rubbing.duplicateOf) && covered.get(rubbing.id) !== rubbing.duplicateOf);
}
