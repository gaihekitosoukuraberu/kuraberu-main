import { BuildingType } from '../types/case';

// 工事項目タイプ
export enum ConstructionItem {
  // 基本項目（一律20,000円）
  EXTERIOR_PAINTING = '外壁塗装',
  EXTERIOR_COVER = '外壁カバー工法',
  EXTERIOR_REPLACEMENT = '外壁張替え',
  ROOF_PAINTING_WITH_EXTERIOR = '屋根塗装（外壁工事含む）',
  ROOFTOP_WATERPROOF_WITH_EXTERIOR = '屋上防水（外壁工事含む）',
  ROOF_REPLACEMENT_SLATE = '屋根葺き替え・張り替え（スレート・ガルバリウム等）',
  ROOF_REPLACEMENT_TILE = '屋根葺き替え・張り替え（瓦）',
  ROOF_COVER = '屋根カバー工法',
  EXTERIOR_REPAIR_WITH_EXTERIOR = '外壁補修（外壁工事含む）',
  ROOF_REPAIR_WITH_EXTERIOR = '屋根補修（外壁工事含む）',
  BALCONY_WATERPROOF_WITH_EXTERIOR = 'ベランダ防水（外壁工事含む）',
  INTERIOR_WATER_WITH_EXTERIOR = '内装水回り（バス・キッチン・トイレ）（外壁工事含む）',
  INTERIOR_WITH_EXTERIOR = '内装（フローリングや畳などの床・クロス等）（外壁工事含む）',
  
  // 単品項目（相見積もり時の料金）
  ROOF_PAINTING_SINGLE = '屋根塗装単品',
  ROOFTOP_WATERPROOF_SINGLE = '屋上防水単品',
  EXTERIOR_REPAIR_SINGLE = '外壁補修単品',
  ROOF_REPAIR_SINGLE = '屋根補修単品',
  BALCONY_WATERPROOF_SINGLE = 'ベランダ防水単品'
}

// 料金表定義
const FEE_TABLE: Record<ConstructionItem, number> = {
  // 基本項目（一律20,000円）
  [ConstructionItem.EXTERIOR_PAINTING]: 20000,
  [ConstructionItem.EXTERIOR_COVER]: 20000,
  [ConstructionItem.EXTERIOR_REPLACEMENT]: 20000,
  [ConstructionItem.ROOF_PAINTING_WITH_EXTERIOR]: 20000,
  [ConstructionItem.ROOFTOP_WATERPROOF_WITH_EXTERIOR]: 20000,
  [ConstructionItem.ROOF_REPLACEMENT_SLATE]: 20000,
  [ConstructionItem.ROOF_REPLACEMENT_TILE]: 20000,
  [ConstructionItem.ROOF_COVER]: 20000,
  [ConstructionItem.EXTERIOR_REPAIR_WITH_EXTERIOR]: 20000,
  [ConstructionItem.ROOF_REPAIR_WITH_EXTERIOR]: 20000,
  [ConstructionItem.BALCONY_WATERPROOF_WITH_EXTERIOR]: 20000,
  [ConstructionItem.INTERIOR_WATER_WITH_EXTERIOR]: 20000,
  [ConstructionItem.INTERIOR_WITH_EXTERIOR]: 20000,
  
  // 単品項目（相見積もり時の料金）
  [ConstructionItem.ROOF_PAINTING_SINGLE]: 10000,
  [ConstructionItem.ROOFTOP_WATERPROOF_SINGLE]: 10000,
  [ConstructionItem.EXTERIOR_REPAIR_SINGLE]: 5000,
  [ConstructionItem.ROOF_REPAIR_SINGLE]: 5000,
  [ConstructionItem.BALCONY_WATERPROOF_SINGLE]: 5000
};

// 単品項目リスト
const SINGLE_ITEMS = [
  ConstructionItem.ROOF_PAINTING_SINGLE,
  ConstructionItem.ROOFTOP_WATERPROOF_SINGLE,
  ConstructionItem.EXTERIOR_REPAIR_SINGLE,
  ConstructionItem.ROOF_REPAIR_SINGLE,
  ConstructionItem.BALCONY_WATERPROOF_SINGLE
];

// 基本項目リスト（20,000円の項目）
const BASIC_ITEMS = Object.values(ConstructionItem).filter(
  item => !SINGLE_ITEMS.includes(item)
);

// 紹介料計算パラメータ
export interface FeeCalculationParams {
  selectedItems: ConstructionItem[]; // 選択された工事項目
  buildingType: BuildingType; // 建物種別
  floorCount?: number; // 階数
  companyCount: number; // 紹介社数
}

// 紹介料計算結果
export interface FeeCalculationResult {
  baseFee: number; // 基本料金
  adjustedFee: number; // 調整後料金
  appliedRules: string[]; // 適用されたルール
  breakdown: {
    item: ConstructionItem;
    baseFee: number;
    adjustedFee: number;
  }[];
}

/**
 * 紹介料を自動計算する
 * 
 * ルール:
 * 1. 複数項目選択時は最高額を適用（合計ではない）
 * 2. 1社紹介時は単品項目も全て20,000円
 * 3. アパート・マンション3階以上は基本項目のみ30,000円
 * 4. 単品項目（5,000円/10,000円）は3階以上でも金額変更なし
 */
export function calculateIntroductionFee(params: FeeCalculationParams): FeeCalculationResult {
  const { selectedItems, buildingType, floorCount = 1, companyCount } = params;
  
  // アパート・マンション3階以上の特別料金チェック
  const isApartment3F = 
    (buildingType === BuildingType.APARTMENT || buildingType === BuildingType.MANSION) && 
    floorCount >= 3;
  
  const appliedRules: string[] = [];
  const breakdown: FeeCalculationResult['breakdown'] = [];
  
  let maxFee = 0;
  
  // 各項目の料金を計算
  selectedItems.forEach(item => {
    let baseFee = FEE_TABLE[item] || 0;
    let adjustedFee = baseFee;
    
    // 1社紹介時は単品項目も20,000円に
    if (companyCount === 1 && SINGLE_ITEMS.includes(item)) {
      adjustedFee = 20000;
      appliedRules.push(`1社紹介のため${item}を20,000円に変更`);
    }
    
    // アパート・マンション3階以上の特別料金（基本項目のみ）
    if (isApartment3F && BASIC_ITEMS.includes(item)) {
      adjustedFee = 30000;
      appliedRules.push(`${buildingType}3階以上のため${item}を30,000円に変更`);
    }
    
    breakdown.push({
      item,
      baseFee,
      adjustedFee
    });
    
    // 最高額を更新
    if (adjustedFee > maxFee) {
      maxFee = adjustedFee;
    }
  });
  
  // 複数項目選択時は最高額を適用
  if (selectedItems.length > 1) {
    appliedRules.push('複数項目選択のため最高額を適用');
  }
  
  return {
    baseFee: Math.max(...breakdown.map(b => b.baseFee)),
    adjustedFee: maxFee,
    appliedRules: [...new Set(appliedRules)], // 重複を除去
    breakdown
  };
}

// プリセット料金
export const FEE_PRESETS = [5000, 10000, 20000, 30000];

// 料金フォーマット
export function formatFee(fee: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(fee);
}

// 料金範囲設定
export const FEE_RANGE = {
  MIN: 0,
  MAX: 50000,
  STEP: 1000
};

// 工事項目のカテゴリ分け（UI表示用）
export const CONSTRUCTION_CATEGORIES = {
  '外壁工事': [
    ConstructionItem.EXTERIOR_PAINTING,
    ConstructionItem.EXTERIOR_COVER,
    ConstructionItem.EXTERIOR_REPLACEMENT,
    ConstructionItem.EXTERIOR_REPAIR_WITH_EXTERIOR,
    ConstructionItem.EXTERIOR_REPAIR_SINGLE
  ],
  '屋根工事': [
    ConstructionItem.ROOF_PAINTING_WITH_EXTERIOR,
    ConstructionItem.ROOF_PAINTING_SINGLE,
    ConstructionItem.ROOFTOP_WATERPROOF_WITH_EXTERIOR,
    ConstructionItem.ROOFTOP_WATERPROOF_SINGLE,
    ConstructionItem.ROOF_REPLACEMENT_SLATE,
    ConstructionItem.ROOF_REPLACEMENT_TILE,
    ConstructionItem.ROOF_COVER,
    ConstructionItem.ROOF_REPAIR_WITH_EXTERIOR,
    ConstructionItem.ROOF_REPAIR_SINGLE
  ],
  '防水工事': [
    ConstructionItem.BALCONY_WATERPROOF_WITH_EXTERIOR,
    ConstructionItem.BALCONY_WATERPROOF_SINGLE
  ],
  '内装工事': [
    ConstructionItem.INTERIOR_WATER_WITH_EXTERIOR,
    ConstructionItem.INTERIOR_WITH_EXTERIOR
  ]
};

// 建物種別による成約報酬率（将来の拡張用）
export const COMMISSION_RATE = {
  DEFAULT: 0.10, // 10%
  MIN: 0,
  MAX: 0.10,
  STEP: 0.01
};