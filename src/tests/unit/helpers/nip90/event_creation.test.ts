import { describe, it, expect } from 'vitest';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';

// Simply test the module can be imported without errors
describe('createNip90JobRequest', () => {
  it('module can be imported', () => {
    expect(typeof createNip90JobRequest).toBe('function');
  });
});