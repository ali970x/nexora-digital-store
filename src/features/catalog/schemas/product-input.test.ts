import {describe, expect, it} from 'vitest';

import {calculateSmmPrice, isValidSmmQuantity} from '../pricing';
import type {CatalogInputField} from '../types';
import {buildProductInputSchema, catalogInputSchemaDefinition} from './product-input';

const fields: CatalogInputField[] = [
  {
    key: 'player_id',
    type: 'player_id' as const,
    label: {en: 'Player ID', ar: 'معرّف اللاعب'},
    required: true,
    regex: '^[A-Z0-9]{6,12}$'
  },
  {
    key: 'profile_url',
    type: 'profile_url' as const,
    label: {en: 'Profile URL'},
    required: true
  },
  {
    key: 'quantity',
    type: 'quantity' as const,
    label: {en: 'Quantity'},
    required: true,
    min: 100,
    max: 10_000,
    step: 100
  }
];

describe('data-driven product input validation', () => {
  it('accepts a valid configuration without product-type code branches', () => {
    const schema = buildProductInputSchema(fields);
    expect(
      schema.safeParse({
        player_id: 'ABCD12',
        profile_url: 'https://example.com/u/nexora',
        quantity: 500
      }).success
    ).toBe(true);
  });

  it('rejects invalid player IDs, URLs, and quantity steps server-side', () => {
    const schema = buildProductInputSchema(fields);
    expect(
      schema.safeParse({player_id: 'bad id', profile_url: 'not-a-url', quantity: 550}).success
    ).toBe(false);
  });

  it('rejects duplicate keys and invalid regular expressions in field definitions', () => {
    expect(catalogInputSchemaDefinition.safeParse([...fields, fields[0]]).success).toBe(false);
    expect(catalogInputSchemaDefinition.safeParse([{...fields[0], regex: '['}]).success).toBe(
      false
    );
  });
});

describe('integer SMM pricing', () => {
  it('uses integer minor units and rounds up safely', () => {
    expect(calculateSmmPrice(1_500, 399)).toBe(599);
    expect(calculateSmmPrice(100, 399)).toBe(40);
  });

  it('validates min, max, and step', () => {
    expect(isValidSmmQuantity(1_000, 100, 10_000, 100)).toBe(true);
    expect(isValidSmmQuantity(1_050, 100, 10_000, 100)).toBe(false);
  });
});
