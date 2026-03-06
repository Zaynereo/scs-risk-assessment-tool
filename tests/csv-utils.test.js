/**
 * Unit tests for shared CSV utilities (utils/csv.js)
 * Run: NODE_ENV=test node --test tests/csv-utils.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import { escapeCSVField, parseCSVLine } from '../utils/csv.js';

// ---- escapeCSVField ----

test('escapeCSVField: plain string unchanged', () => {
    assert.strictEqual(escapeCSVField('hello'), 'hello');
});

test('escapeCSVField: null/undefined become empty string', () => {
    assert.strictEqual(escapeCSVField(null), '');
    assert.strictEqual(escapeCSVField(undefined), '');
});

test('escapeCSVField: number converted to string', () => {
    assert.strictEqual(escapeCSVField(42), '42');
    assert.strictEqual(escapeCSVField(0), '0');
});

test('escapeCSVField: commas trigger quoting', () => {
    assert.strictEqual(escapeCSVField('a,b'), '"a,b"');
});

test('escapeCSVField: double quotes are escaped and field is quoted', () => {
    assert.strictEqual(escapeCSVField('say "hi"'), '"say ""hi"""');
});

test('escapeCSVField: newlines trigger quoting', () => {
    assert.strictEqual(escapeCSVField('line1\nline2'), '"line1\nline2"');
    assert.strictEqual(escapeCSVField('line1\rline2'), '"line1\rline2"');
});

test('escapeCSVField: combined special characters', () => {
    const result = escapeCSVField('a,"b\nc');
    assert.ok(result.startsWith('"'));
    assert.ok(result.endsWith('"'));
});

// ---- parseCSVLine ----

test('parseCSVLine: simple comma-separated values', () => {
    const result = parseCSVLine('a,b,c');
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('parseCSVLine: quoted fields', () => {
    const result = parseCSVLine('"hello world",test');
    assert.deepStrictEqual(result, ['hello world', 'test']);
});

test('parseCSVLine: escaped double quotes inside quoted field', () => {
    const result = parseCSVLine('"say ""hi""",other');
    assert.deepStrictEqual(result, ['say "hi"', 'other']);
});

test('parseCSVLine: commas inside quoted field', () => {
    const result = parseCSVLine('"a,b",c');
    assert.deepStrictEqual(result, ['a,b', 'c']);
});

test('parseCSVLine: strips trailing \\r (Windows CRLF)', () => {
    const result = parseCSVLine('a,b,c\r');
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('parseCSVLine: empty fields', () => {
    const result = parseCSVLine('a,,c');
    assert.deepStrictEqual(result, ['a', '', 'c']);
});

test('parseCSVLine: single field', () => {
    const result = parseCSVLine('only');
    assert.deepStrictEqual(result, ['only']);
});

test('parseCSVLine: empty line returns single empty string', () => {
    const result = parseCSVLine('');
    assert.deepStrictEqual(result, ['']);
});

test('parseCSVLine: roundtrip with escapeCSVField', () => {
    const original = 'value with "quotes" and, commas';
    const escaped = escapeCSVField(original);
    const line = `${escaped},other`;
    const parsed = parseCSVLine(line);
    assert.strictEqual(parsed[0], original);
    assert.strictEqual(parsed[1], 'other');
});
