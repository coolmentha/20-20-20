import test from 'node:test'
import assert from 'node:assert/strict'
import { formatTime } from '../src/renderer/time-format.mjs'

test('时间格式化遇到缺失值时不显示 NaN', () => {
  assert.equal(formatTime(undefined), '00:00')
})
