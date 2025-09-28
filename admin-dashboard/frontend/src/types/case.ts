import { HQStatus } from './status';

// 建物種別
export enum BuildingType {
  DETACHED = '戸建て',
  APARTMENT = 'アパート',
  MANSION = 'マンション'
}

// 緊急度
export enum Urgency {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高'
}

// 流入経路
export enum InflowRoute {
  POSTAL_FORM = '郵便番号フォーム',
  WORD_LINK = '検索ワードリンク'
}

// 案件インターフェース
export interface Case {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  postalCode: string;
  address: string;
  buildingType: BuildingType;
  floorCount?: number; // 階数（アパート・マンションの場合）
  description: string;
  estimatedValue?: number;
  urgency: Urgency;
  preferredSchedule?: string;
  inflowRoute: InflowRoute;
  inflowKeyword?: string; // 検索ワード（ワードリンクの場合）
  botResponses?: Record<string, any>; // BOT回答内容
  keepCompanies?: string[]; // キープした業者
  exitPoint?: string; // 離脱ポイント
  hqStatus: HQStatus;
  autoCalculatedFee: number; // 自動計算された紹介料
  manualFeeAdjustment?: number; // 手動調整後の紹介料
  finalFee: number; // 最終紹介料
  createdAt: Date;
  updatedAt: Date;
  distributedAt?: Date; // 配信日時
  completedAt?: Date; // 完了日時
}

// 案件作成リクエスト
export interface CreateCaseRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  postalCode: string;
  address: string;
  buildingType: BuildingType;
  floorCount?: number;
  description: string;
  estimatedValue?: number;
  urgency?: Urgency;
  preferredSchedule?: string;
  inflowRoute: InflowRoute;
  inflowKeyword?: string;
  botResponses?: Record<string, any>;
  keepCompanies?: string[];
  exitPoint?: string;
}

// 案件更新リクエスト
export interface UpdateCaseRequest {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  buildingType?: BuildingType;
  floorCount?: number;
  description?: string;
  estimatedValue?: number;
  urgency?: Urgency;
  preferredSchedule?: string;
  hqStatus?: HQStatus;
  manualFeeAdjustment?: number;
}

// 案件フィルター
export interface CaseFilter {
  hqStatus?: HQStatus | HQStatus[];
  buildingType?: BuildingType;
  urgency?: Urgency;
  inflowRoute?: InflowRoute;
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}