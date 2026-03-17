export interface AdReview {
  review_date: string | null;
  compliance_number: string | null;
  compliance_expiry: string | null;
  compliance_remaining_days: number | null;
  central_association_number: string | null;
  central_association_expiry: string | null;
  central_remaining_days: number | null;
  advertiser: string | null;
  is_deleted: boolean;
}

export interface Commission {
  rate: string;
  vat: string;
}

export interface SettlementExclusion {
  days: number;
  condition: string;
}

export interface Product {
  product: string;
  original_names: string[];
  commission: Commission | null;
  settlement_exclusion: SettlementExclusion | null;
  ad_review: AdReview | null;
}

export interface Contract {
  status: string;
  start_date: string;
  end_date: string;
  remaining_days: number;
  auto_renewal: boolean;
  integration_type: string;
  is_recruitment_corp: boolean;
  contract_exists: string;
  commission_rate_avg: string;
  first_contract_date: string;
  renewal_review: string;
  memo: string;
}

export interface Alert {
  type: string;
  level: "CRITICAL" | "WARNING" | "EXPIRED";
  message: string;
  remaining_days: number;
  target: string;
  product: string;
}

export interface NewsItem {
  category: string;
  title: string;
  date: string;
  channel: string;
  action_needed: string;
}

export interface Channel {
  channel_code: string;
  channel_type: "비교대출" | "광고배너";
  company_name: string;
  service_name: string;
  active_products: string[];
  contract: Contract;
  products: Product[];
  news: NewsItem[] | null;
  alerts: Alert[];
  updated_at: string;
  updated_by: string;
}

export interface IntegratedData {
  generated_at: string;
  reference_date: string;
  total_channels: number;
  summary: {
    비교대출: number;
    광고배너: number;
  };
  channels: Channel[];
}
