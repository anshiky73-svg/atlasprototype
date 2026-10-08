#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/dfe46252b3a8c87604ccd976795ef7ab66a3715ae32cafcbce11596f542a61ac/contract';
import endContract from '../../snapshots/dfe46252b3a8c87604ccd976795ef7ab66a3715ae32cafcbce11596f542a61ac/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'ChangeEvent',
        columns: [
          col('crawlRunId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('detectedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('evidenceText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fieldName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('newValue', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('oldValue', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scholarshipId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CrawlRun',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('crawledCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('discoveredCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expiredCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('extractedCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('failedCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('newScholarshipCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reviewRequiredCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('RUNNING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedScholarshipCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('verifiedCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'CrawlRun_status_check_a1d46110',
            "\"status\" IN ('RUNNING', 'COMPLETED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DiscoveredUrl',
        columns: [
          col('contentHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('crawledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('discoveredFromUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('discoveryMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('domain', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstDiscoveredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('httpStatus', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastSeenAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('normalizedUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DISCOVERED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'DiscoveredUrl_status_check_e74133dd',
            "\"status\" IN ('DISCOVERED', 'QUEUED', 'CRAWLED', 'PROCESSED', 'REJECTED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Evidence',
        columns: [
          col('contentHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('crawlRunId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('evidenceText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('extractedValue', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fieldName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isOfficialSource', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('retrievedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('scholarshipId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('supportsClaim', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Evidence_fieldName_check_a565aeb1',
            "\"fieldName\" IN ('NAME', 'PROVIDER', 'AMOUNT', 'ELIGIBILITY', 'ACADEMIC_REQUIREMENTS', 'EDUCATION_LEVEL', 'INCOME', 'AGE', 'GENDER', 'CATEGORY', 'DOMICILE', 'INSTITUTION', 'OPENING_DATE', 'CLOSING_DATE', 'DOCUMENTS', 'SELECTION_PROCESS', 'RENEWAL', 'APPLICATION_URL', 'STATUS', 'GENERAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Scholarship',
        columns: [
          col('academicRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ageCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('amount', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('applicationUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('categoryCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('closingDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('confidenceBreakdown', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('confidenceScore', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currentContentHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('documentsRequired', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('domicileCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('educationLevel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eligibility', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('genderCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('incomeCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('institutionRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastCrawledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('lastEvidenceHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastVerifiedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('officialSourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openingDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('renewalRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('selectionProcess', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REVIEW_REQUIRED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('verificationStatus', 'text', {
            notNull: true,
            default: lit('REVIEW_REQUIRED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Scholarship_sourceType_check_a4bc7fd9',
            "\"sourceType\" IN ('GOVERNMENT', 'UNIVERSITY', 'UGC', 'AICTE', 'MINISTRY', 'CSR', 'FOUNDATION', 'TRUST', 'OTHER_OFFICIAL')",
          ),
          checkExpression(
            'Scholarship_status_check_5795556c',
            "\"status\" IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'REVIEW_REQUIRED', 'NO_LONGER_VERIFIABLE')",
          ),
          checkExpression(
            'Scholarship_verificationStatus_check_68091580',
            "\"verificationStatus\" IN ('VERIFIED', 'REVIEW_REQUIRED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ScholarshipVersion',
        columns: [
          col('academicRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ageCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('amount', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('applicationUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('capturedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('categoryCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('closingDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('confidenceScore', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('contentHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('crawlRunId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('documentsRequired', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('domicileCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('educationLevel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eligibility', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('genderCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('incomeCriteria', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('institutionRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('officialSourceUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('openingDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('renewalRequirements', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scholarshipId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('selectionProcess', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('verificationStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ScholarshipVersion_verificationStatus_check_68091580',
            "\"verificationStatus\" IN ('VERIFIED', 'REVIEW_REQUIRED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Source',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('domain', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isOfficial', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isPrimarySource', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lastCrawledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('lastVerifiedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Source_sourceType_check_a4bc7fd9',
            "\"sourceType\" IN ('GOVERNMENT', 'UNIVERSITY', 'UGC', 'AICTE', 'MINISTRY', 'CSR', 'FOUNDATION', 'TRUST', 'OTHER_OFFICIAL')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DiscoveredUrl',
        constraint: 'DiscoveredUrl_url_key',
        columns: ['url'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Source',
        constraint: 'Source_url_key',
        columns: ['url'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChangeEvent',
        index: 'ChangeEvent_crawlRunId_idx_89f782b2',
        columns: ['crawlRunId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChangeEvent',
        index: 'ChangeEvent_detectedAt_idx_7415771a',
        columns: ['detectedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChangeEvent',
        index: 'ChangeEvent_fieldName_idx_f1c1a56f',
        columns: ['fieldName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChangeEvent',
        index: 'ChangeEvent_scholarshipId_idx_faec57f5',
        columns: ['scholarshipId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CrawlRun',
        index: 'CrawlRun_startedAt_idx_cac56236',
        columns: ['startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CrawlRun',
        index: 'CrawlRun_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DiscoveredUrl',
        index: 'DiscoveredUrl_domain_idx_bc50540b',
        columns: ['domain'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DiscoveredUrl',
        index: 'DiscoveredUrl_sourceId_idx_d92a2571',
        columns: ['sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DiscoveredUrl',
        index: 'DiscoveredUrl_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Evidence',
        index: 'Evidence_contentHash_idx_905433f5',
        columns: ['contentHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Evidence',
        index: 'Evidence_crawlRunId_idx_89f782b2',
        columns: ['crawlRunId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Evidence',
        index: 'Evidence_fieldName_idx_f1c1a56f',
        columns: ['fieldName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Evidence',
        index: 'Evidence_scholarshipId_idx_faec57f5',
        columns: ['scholarshipId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Evidence',
        index: 'Evidence_sourceId_idx_d92a2571',
        columns: ['sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Scholarship',
        index: 'Scholarship_closingDate_idx_a19b9a4e',
        columns: ['closingDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Scholarship',
        index: 'Scholarship_confidenceScore_idx_ccca7c3a',
        columns: ['confidenceScore'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Scholarship',
        index: 'Scholarship_sourceId_idx_d92a2571',
        columns: ['sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Scholarship',
        index: 'Scholarship_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Scholarship',
        index: 'Scholarship_verificationStatus_idx_d9c050e0',
        columns: ['verificationStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ScholarshipVersion',
        index: 'ScholarshipVersion_capturedAt_idx_2c071597',
        columns: ['capturedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ScholarshipVersion',
        index: 'ScholarshipVersion_contentHash_idx_905433f5',
        columns: ['contentHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ScholarshipVersion',
        index: 'ScholarshipVersion_crawlRunId_idx_89f782b2',
        columns: ['crawlRunId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ScholarshipVersion',
        index: 'ScholarshipVersion_scholarshipId_idx_faec57f5',
        columns: ['scholarshipId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Source',
        index: 'Source_active_idx_8af4daed',
        columns: ['active'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Source',
        index: 'Source_isOfficial_idx_92ccde4a',
        columns: ['isOfficial'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Source',
        index: 'Source_sourceType_idx_d8b2a801',
        columns: ['sourceType'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChangeEvent',
        foreignKey: {
          name: 'ChangeEvent_scholarshipId_fkey',
          columns: ['scholarshipId'],
          references: { schema: 'public', table: 'Scholarship', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChangeEvent',
        foreignKey: {
          name: 'ChangeEvent_crawlRunId_fkey',
          columns: ['crawlRunId'],
          references: { schema: 'public', table: 'CrawlRun', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DiscoveredUrl',
        foreignKey: {
          name: 'DiscoveredUrl_sourceId_fkey',
          columns: ['sourceId'],
          references: { schema: 'public', table: 'Source', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Evidence',
        foreignKey: {
          name: 'Evidence_scholarshipId_fkey',
          columns: ['scholarshipId'],
          references: { schema: 'public', table: 'Scholarship', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Evidence',
        foreignKey: {
          name: 'Evidence_sourceId_fkey',
          columns: ['sourceId'],
          references: { schema: 'public', table: 'Source', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Evidence',
        foreignKey: {
          name: 'Evidence_crawlRunId_fkey',
          columns: ['crawlRunId'],
          references: { schema: 'public', table: 'CrawlRun', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Scholarship',
        foreignKey: {
          name: 'Scholarship_sourceId_fkey',
          columns: ['sourceId'],
          references: { schema: 'public', table: 'Source', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ScholarshipVersion',
        foreignKey: {
          name: 'ScholarshipVersion_scholarshipId_fkey',
          columns: ['scholarshipId'],
          references: { schema: 'public', table: 'Scholarship', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ScholarshipVersion',
        foreignKey: {
          name: 'ScholarshipVersion_crawlRunId_fkey',
          columns: ['crawlRunId'],
          references: { schema: 'public', table: 'CrawlRun', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
