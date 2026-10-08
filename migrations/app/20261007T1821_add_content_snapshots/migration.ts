#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c1bc931056554601f84725bdc3cdc2c5ea5c844807dae0c8f17252d1312936b6/contract';
import endContract from '../../snapshots/c1bc931056554601f84725bdc3cdc2c5ea5c844807dae0c8f17252d1312936b6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dfe46252b3a8c87604ccd976795ef7ab66a3715ae32cafcbce11596f542a61ac/contract';
import startContract from '../../snapshots/dfe46252b3a8c87604ccd976795ef7ab66a3715ae32cafcbce11596f542a61ac/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ContentSnapshot',
        columns: [
          col('contentHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('crawlRunId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('discoveredUrlId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('extractedText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('finalUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('httpStatus', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('requestedUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('retrievedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'DiscoveredUrl',
        column: col('crawlRunId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'DiscoveredUrl',
        constraint: 'DiscoveredUrl_normalizedUrl_key',
        columns: ['normalizedUrl'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContentSnapshot',
        index: 'ContentSnapshot_contentHash_idx_905433f5',
        columns: ['contentHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContentSnapshot',
        index: 'ContentSnapshot_crawlRunId_idx_89f782b2',
        columns: ['crawlRunId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContentSnapshot',
        index: 'ContentSnapshot_discoveredUrlId_idx_5064c4a3',
        columns: ['discoveredUrlId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContentSnapshot',
        index: 'ContentSnapshot_retrievedAt_idx_1eeb9ecf',
        columns: ['retrievedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DiscoveredUrl',
        index: 'DiscoveredUrl_crawlRunId_idx_89f782b2',
        columns: ['crawlRunId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ContentSnapshot',
        foreignKey: {
          name: 'ContentSnapshot_discoveredUrlId_fkey',
          columns: ['discoveredUrlId'],
          references: { schema: 'public', table: 'DiscoveredUrl', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ContentSnapshot',
        foreignKey: {
          name: 'ContentSnapshot_crawlRunId_fkey',
          columns: ['crawlRunId'],
          references: { schema: 'public', table: 'CrawlRun', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DiscoveredUrl',
        foreignKey: {
          name: 'DiscoveredUrl_crawlRunId_fkey',
          columns: ['crawlRunId'],
          references: { schema: 'public', table: 'CrawlRun', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
