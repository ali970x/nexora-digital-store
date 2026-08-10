-- Keep customer-facing sessions away from low-level money movement RPCs.
-- Admin adjustment and freeze RPCs remain callable by authenticated staff and
-- perform an independent database permission check on every invocation.

REVOKE EXECUTE ON FUNCTION wallet_credit(
  uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION wallet_debit(
  uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION wallet_hold(
  uuid, text, bigint, text, text, uuid, jsonb
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION wallet_release(
  uuid, text, bigint, text, text, uuid, jsonb
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION run_wallet_reconciliation() FROM authenticated;

GRANT EXECUTE ON FUNCTION wallet_credit(
  uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION wallet_debit(
  uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION wallet_hold(
  uuid, text, bigint, text, text, uuid, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION wallet_release(
  uuid, text, bigint, text, text, uuid, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION run_wallet_reconciliation() TO service_role;

COMMENT ON FUNCTION run_wallet_reconciliation() IS
  'Nightly reconciliation entrypoint. Executable only by trusted jobs/service role.';
