/**
 * 拓本（Rubbing）数据模型
 * 同一碑刻下的不同拓本：拓法、纸墨、尺寸、收藏号与年代判断，自动生成版本序号。
 */

/** 拓法：擦拓 / 扑拓 / 蝉翼拓 */
export type RubbingMethod = 'rub' | 'pat' | 'cicada';

/** 墨色：浓墨 / 淡墨 */
export type InkTone = 'thick' | 'light';

/** 状态：待编目 / 已编目 / 待比对 */
export type RubbingState = 'toCatalog' | 'cataloged' | 'toCompare';

export interface Rubbing {
  id: string;
  /** 所属碑刻 id */
  steleId: string;
  /** 同一碑刻下的版本序号，从 1 开始，自动生成 */
  versionNo: number;
  /** 拓法 */
  method: RubbingMethod;
  /** 纸种 */
  paperType: string;
  /** 墨色 */
  inkTone: InkTone;
  /** 尺寸（厘米） */
  sizeCm: string;
  /** 收藏号 */
  collectionNo: string;
  /** 年代判断 */
  dateGuess: string;
  /** 状态 */
  state: RubbingState;
  /**
   * 重份标记：同一收藏号重复登记时，后登那份指向先登正本的 id；
   * null 表示非重份。只打标记不并数据，比对台跳过，撤销标记即还原。
   */
  duplicateOf: string | null;
  createdAt: number;
  updatedAt: number;
}

export type RubbingDraft = Omit<Rubbing, 'id' | 'createdAt' | 'updatedAt' | 'duplicateOf'>;

export const RUBBING_METHOD_LABEL: Record<RubbingMethod, string> = {
  rub: '擦拓',
  pat: '扑拓',
  cicada: '蝉翼拓',
};

export const RUBBING_METHOD_OPTIONS: ReadonlyArray<{ value: RubbingMethod; label: string }> = [
  { value: 'rub', label: '擦拓' },
  { value: 'pat', label: '扑拓' },
  { value: 'cicada', label: '蝉翼拓' },
];

export const INK_TONE_LABEL: Record<InkTone, string> = {
  thick: '浓墨',
  light: '淡墨',
};

export const INK_TONE_OPTIONS: ReadonlyArray<{ value: InkTone; label: string }> = [
  { value: 'thick', label: '浓墨' },
  { value: 'light', label: '淡墨' },
];

export const RUBBING_STATE_LABEL: Record<RubbingState, string> = {
  toCatalog: '待编目',
  cataloged: '已编目',
  toCompare: '待比对',
};

export const RUBBING_STATE_COLOR: Record<RubbingState, string> = {
  toCatalog: '#8c8c8c',
  cataloged: '#2f6f4f',
  toCompare: '#c9963c',
};

export const RUBBING_STATE_OPTIONS: ReadonlyArray<{ value: RubbingState; label: string }> = [
  { value: 'toCatalog', label: '待编目' },
  { value: 'cataloged', label: '已编目' },
  { value: 'toCompare', label: '待比对' },
];

export const RUBBING_STATE_FLOW: readonly RubbingState[] = ['toCatalog', 'cataloged', 'toCompare'];

export function nextRubbingState(state: RubbingState): RubbingState {
  const index = RUBBING_STATE_FLOW.indexOf(state);
  if (index < 0 || index >= RUBBING_STATE_FLOW.length - 1) return state;
  return RUBBING_STATE_FLOW[index + 1] as RubbingState;
}

export const PAPER_TYPE_OPTIONS: readonly string[] = ['宣纸', '棉连纸', '皮纸', '罗纹纸', '净皮宣'];

/** 重份组：同一收藏号（非空）登记了两份及以上 */
export interface DuplicateGroup {
  /** 收藏号（已去首尾空白） */
  collectionNo: string;
  /** 先登的那一份，保留为正本 */
  primary: Rubbing;
  /** 后登的重份（标记 / 撤销标记的对象） */
  copies: Rubbing[];
}

/**
 * 按收藏号识别重份：收藏号空着的不认重份；同号两份及以上成组，
 * 组内按登记先后（createdAt → versionNo → id）排序，最早者为先登正本，其余为后登重份。
 */
export function findDuplicateGroups(rubbings: Rubbing[]): DuplicateGroup[] {
  const byCollectionNo = new Map<string, Rubbing[]>();
  rubbings.forEach((rubbing) => {
    const key = rubbing.collectionNo.trim();
    if (key.length === 0) return;
    byCollectionNo.set(key, [...(byCollectionNo.get(key) ?? []), rubbing]);
  });
  const groups: DuplicateGroup[] = [];
  byCollectionNo.forEach((list, collectionNo) => {
    if (list.length < 2) return;
    const sorted = [...list].sort(
      (a, b) => a.createdAt - b.createdAt || a.versionNo - b.versionNo || a.id.localeCompare(b.id),
    );
    groups.push({ collectionNo, primary: sorted[0] as Rubbing, copies: sorted.slice(1) });
  });
  return groups.sort((a, b) => a.collectionNo.localeCompare(b.collectionNo));
}

export function createEmptyRubbingDraft(steleId: string, versionNo: number): RubbingDraft {
  return {
    steleId,
    versionNo,
    method: 'rub',
    paperType: '宣纸',
    inkTone: 'thick',
    sizeCm: '',
    collectionNo: '',
    dateGuess: '',
    state: 'toCatalog',
  };
}
