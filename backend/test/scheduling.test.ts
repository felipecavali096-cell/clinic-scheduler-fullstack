import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { availableTimes, unavailableReason } from '../src/rules';
import { createAppointment, SchedulingError } from '../src/scheduling';

describe('scheduling rules', () => {
  it('blocks Saturday and Sunday', () => { assert.equal(unavailableReason('2026-09-26', '2026-09-24'), 'weekend'); assert.equal(unavailableReason('2026-09-27', '2026-09-24'), 'weekend'); });
  it('blocks past dates using the supplied Sao Paulo date', () => { assert.equal(unavailableReason('2026-09-23', '2026-09-24'), 'past_date'); });
  it('filters an occupied time', () => { assert.ok(!availableTimes(['09:00']).includes('09:00')); });
  it('blocks holidays', async () => { await assert.rejects(() => createAppointment({ date: '2026-09-24', time: '09:00' }, { isHoliday: async () => true, getOccupied: async () => [], insert: async () => ({}) }), (error: unknown) => error instanceof SchedulingError && error.reason === 'holiday'); });
  it('creates a valid appointment through the injected persistence function', async () => { let inserted = false; await createAppointment({ date: '2026-09-24', time: '09:00' }, { isHoliday: async () => false, getOccupied: async () => [], insert: async (input) => { inserted = input.time === '09:00'; return input; } }); assert.equal(inserted, true); });
  it('rejects a duplicate occupied appointment', async () => { await assert.rejects(() => createAppointment({ date: '2026-09-24', time: '09:00' }, { isHoliday: async () => false, getOccupied: async () => ['09:00'], insert: async () => ({}) }), (error: unknown) => error instanceof SchedulingError && error.status === 409); });
});
