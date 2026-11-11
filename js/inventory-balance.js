// Apply only changes to opening stock/receipts so issued stock stays deducted.
function calculateInventoryBalance(original, previous, received) {
    const p = Number(previous || 0), r = Number(received || 0);
    if (![p, r].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Previous and received balances must be non-negative numbers.');
    const current = original
        ? Number(original.quantity || 0) + p - Number(original.previous_balance || 0) + r - Number(original.received_amount || 0)
        : p + r;
    const result = Math.round(current * 1e9) / 1e9;
    if (!Number.isFinite(result) || result < 0) throw new Error('This change would make current stock negative. Check previous and received balances.');
    return result;
}
