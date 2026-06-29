import { BadRequestException } from '@nestjs/common';

export function parseLimit(value: unknown, fallback = 25, max = 100) {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('limit must be a positive integer');
  }

  return Math.min(parsed, max);
}

export function parseOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}
