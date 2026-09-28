export type PaymentMethod = 
  | 'MPESA_EXPRESS'
  | 'MPESA_TILL'
  | 'MPESA_PAYBILL'
  | 'AIRTEL_MONEY'
  | 'QR_PAY'
  | 'CARD';

export type TransactionStatus = 
  | 'COMPLETED'
  | 'PENDING'
  | 'FAILED'
  | 'REVERSED';

export type UserRole = 
  | 'CASHIER'
  | 'MANAGER'
  | 'CUSTOMER'
  | 'RESEARCHER';

export interface Transaction {
  id: string;
  code: string; // e.g. "QK87X419M"
  customerPhone: string;
  customerName: string;
  businessId: string;
  businessName: string;
  amount: number;
  fee: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  timestamp: string;
  reference: string;
  accountRef?: string;
  tillNumber?: string;
  paybillNumber?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  smsReceiptText: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  transactionCount: number;
  loyaltyPoints: number;
  lastVisit: string;
  walletBalance?: number;
  tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  memberSince?: string;
  avatarInitials?: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  title: string;
  badgeId: string;
  assignedTill?: string;
  branch: string;
  permissions: string[];
  status: 'ACTIVE' | 'ON_DUTY' | 'AWAY';
  avatarInitials: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  badgeId?: string;
  assignedTill?: string;
  createdAt: string;
  avatarInitials?: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  category: string;
  tillNumber: string;
  paybillNumber: string;
  accountRef: string;
  currency: string;
  branch: string;
  phone: string;
  email: string;
  address: string;
  dailyTarget: number;
}

export interface ManualEntryAudit {
  id: string;
  timestamp: string;
  notebookAmount: number;
  systemAmount: number;
  customerName: string;
  discrepancyType: 'MATCH' | 'NOTEBOOK_OMISSION' | 'TRANSCRIPTION_ERROR' | 'UNVERIFIED_SMS';
  description: string;
  recoveredValue: number;
}

export interface SurveySampleBreakdown {
  category: string;
  sampleSize: number;
  satisfactionScore: number; // 0 - 100
  topBenefit: string;
  primaryChallenge: string;
}

export interface GatewayConfig {
  id?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  shortcode?: string;
  environment: 'sandbox' | 'production';
  myPhoneNumber?: string;
  updatedAt?: string;
}

export interface StkRequest {
  id: string;
  phone: string;
  amount: number;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  status: 'DISPATCHED' | 'WAITING_PIN' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  responseDescription?: string;
  timestamp: string;
  isMyPhone?: boolean;
}

export interface VerificationLog {
  id: string;
  codeChecked: string;
  status: 'VERIFIED' | 'ALREADY_REDEEMED' | 'NOT_FOUND' | 'SUSPECTED_FAKE';
  amount?: number;
  message: string;
  cashierName?: string;
  timestamp: string;
}

