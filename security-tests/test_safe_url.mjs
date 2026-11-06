/**
 * Frontend URL sanitization regression tests.
 *
 * No Vitest/Jest is configured in frontend/package.json; Node's built-in
 * test runner is used so we do not add a new testing framework dependency.
 *
 * Run: node --test security-tests/test_safe_url.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { isSafeHttpUrl, safeHref, safeMailto, safeSrc } from '../frontend/src/utils/safeUrl.js'

test('accepts safe https URLs', () => {
  assert.equal(isSafeHttpUrl('https://example.com/a.png'), true)
  assert.equal(safeHref('https://example.com/path?q=1'), 'https://example.com/path?q=1')
  assert.equal(safeSrc('https://cdn.example.com/img.webp'), 'https://cdn.example.com/img.webp')
})

test('accepts safe http URLs per policy', () => {
  assert.equal(isSafeHttpUrl('http://example.com'), true)
  assert.equal(safeHref('http://example.com'), 'http://example.com')
})

test('rejects javascript: URLs', () => {
  assert.equal(safeHref('javascript:alert(1)'), '')
  assert.equal(safeSrc('javascript:alert(1)'), '')
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false)
})

test('rejects data: URLs', () => {
  assert.equal(safeHref('data:text/html,hi'), '')
  assert.equal(safeSrc('data:image/png;base64,aaa'), '')
})

test('rejects blob: and protocol-relative URLs', () => {
  assert.equal(safeHref('blob:https://example.com/uuid'), '')
  assert.equal(safeSrc('blob:https://example.com/uuid'), '')
  assert.equal(safeHref('//evil.com'), '')
  assert.equal(safeSrc('//evil.com/x.png'), '')
})

test('rejects malformed URLs', () => {
  assert.equal(safeHref('https://'), '')
  assert.equal(safeHref('not a url'), '')
  assert.equal(safeHref(''), '')
  assert.equal(safeHref(null), '')
})

test('mailto helper blocks header/query injection', () => {
  assert.equal(safeMailto('a@b.com'), 'mailto:a@b.com')
  assert.equal(safeMailto('a@b.com?bcc=evil@x.com'), '')
  assert.equal(safeMailto('a@b.com&cc=evil@x.com'), '')
  assert.equal(safeMailto('a@b.com\nBcc:evil@x.com'), '')
  assert.equal(safeMailto('a@b.com subject=hi'), '')
})

test('control characters and whitespace bypasses are rejected', () => {
  assert.equal(safeHref('\x00javascript:alert(1)'), '')
  assert.equal(safeHref('  javascript:alert(1)  '), '')
  // Leading/trailing whitespace is trimmed; embedded whitespace/newlines are rejected.
  assert.equal(safeMailto(' a@b.com '), 'mailto:a@b.com')
  assert.equal(safeMailto('a@b.com\nbad'), '')
  assert.equal(safeMailto('a@b.com\r\nBcc:evil@x.com'), '')
})

test('relative same-origin paths allowed for href/src', () => {
  assert.equal(safeHref('/p/abc'), '/p/abc')
  assert.equal(safeSrc('/images/a.png'), '/images/a.png')
})
