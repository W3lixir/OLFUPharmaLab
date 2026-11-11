const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('js/inventory-balance.js', 'utf8'), context);
const balance = context.calculateInventoryBalance;
test('new stock sums previous and received including fractional units', () => {
    assert.equal(balance(null, 10, 5), 15);
    assert.equal(balance(null, 0.1, 0.2), 0.3);
});
test('receipts preserve issued stock and are not counted again on resave', () => {
    const stock = { quantity: 12, previous_balance: 10, received_amount: 5 };
    assert.equal(balance(stock, 10, 5), 12);
    assert.equal(balance(stock, 10, 9), 16);
    assert.equal(balance({ ...stock, quantity: 16, received_amount: 9 }, 10, 9), 16);
    assert.equal(balance(stock, 11, 5), 13);
});
test('invalid stock and corrections below issued quantity fail', () => {
    for (const value of [-1, Infinity, 'invalid']) assert.throws(() => balance(null, value, 0));
    assert.throws(() => balance({ quantity: 1, previous_balance: 10, received_amount: 0 }, 0, 0));
});
