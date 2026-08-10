ALTER TYPE wallet_account_type ADD VALUE IF NOT EXISTS 'customer_hold';

ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'topup';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'commission';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'bonus';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'payout';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'fee';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'chargeback';
