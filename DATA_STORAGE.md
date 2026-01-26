# Historical Data Storage & Retrieval Strategy

## Overview

Efficient storage and retrieval of time-series cardiovascular data is critical for:

- Real-time monitoring
- Historical trend analysis
- Predictive analytics
- Regulatory compliance (data retention)

---

## Database Architecture

### Primary Database: PostgreSQL with TimescaleDB

**Why TimescaleDB?**

- Built on PostgreSQL (familiar SQL, ACID compliance)
- Optimized for time-series data (automatic partitioning, compression)
- Excellent query performance for time-range queries
- Supports continuous aggregates (pre-computed aggregations)
- Data retention policies (automatic data archival/deletion)

---

## Schema Design

### 1. Vitals Readings Table (Time-Series)

```sql
-- Create the base table
CREATE TABLE vitals_readings (
    id BIGSERIAL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    device_id VARCHAR(255),

    -- Vitals data
    heart_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    spo2 INTEGER,
    blood_sugar DECIMAL(5,2),
    ecg_data JSONB, -- Store ECG waveform array: [timestamp, voltage]

    -- Metadata
    reading_type VARCHAR(50) DEFAULT 'continuous', -- 'continuous', 'snapshot', 'manual'
    quality_score DECIMAL(3,2), -- Data quality indicator (0-1)
    device_battery INTEGER,

    -- Timestamps
    recorded_at TIMESTAMPTZ NOT NULL, -- Device timestamp
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Server timestamp

    -- Indexes
    PRIMARY KEY (id, received_at)
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('vitals_readings', 'received_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for efficient queries
CREATE INDEX idx_vitals_patient_time ON vitals_readings (patient_id, received_at DESC);
CREATE INDEX idx_vitals_device ON vitals_readings (device_id);
CREATE INDEX idx_vitals_type ON vitals_readings (reading_type);
```

### 2. Continuous Aggregates (Pre-computed Statistics)

```sql
-- Hourly aggregates
CREATE MATERIALIZED VIEW vitals_hourly
WITH (timescaledb.continuous) AS
SELECT
    patient_id,
    time_bucket('1 hour', received_at) AS hour,
    AVG(heart_rate) AS avg_hr,
    MIN(heart_rate) AS min_hr,
    MAX(heart_rate) AS max_hr,
    STDDEV(heart_rate) AS stddev_hr,
    AVG(systolic_bp) AS avg_sbp,
    AVG(diastolic_bp) AS avg_dbp,
    AVG(spo2) AS avg_spo2,
    AVG(blood_sugar) AS avg_blood_sugar,
    COUNT(*) AS reading_count
FROM vitals_readings
GROUP BY patient_id, hour;

-- Daily aggregates
CREATE MATERIALIZED VIEW vitals_daily
WITH (timescaledb.continuous) AS
SELECT
    patient_id,
    time_bucket('1 day', received_at) AS day,
    AVG(heart_rate) AS avg_hr,
    MIN(heart_rate) AS min_hr,
    MAX(heart_rate) AS max_hr,
    AVG(systolic_bp) AS avg_sbp,
    AVG(diastolic_bp) AS avg_dbp,
    AVG(spo2) AS avg_spo2,
    AVG(blood_sugar) AS avg_blood_sugar,
    COUNT(*) AS reading_count
FROM vitals_readings
GROUP BY patient_id, day;

-- Refresh policies (automatically refresh aggregates)
SELECT add_continuous_aggregate_policy('vitals_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

SELECT add_continuous_aggregate_policy('vitals_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);
```

### 3. Snapshots Table

```sql
CREATE TABLE vitals_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),

    -- Snapshot data (same as vitals_readings)
    heart_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    spo2 INTEGER,
    blood_sugar DECIMAL(5,2),
    ecg_snapshot JSONB, -- Full ECG waveform at snapshot time

    -- Snapshot metadata
    snapshot_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto', 'alert'
    trigger_reason TEXT, -- Why snapshot was taken
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_patient_time ON vitals_snapshots (patient_id, created_at DESC);
```

### 4. Alerts Table

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    vital_type VARCHAR(50), -- 'heart_rate', 'bp', 'spo2', etc.

    -- Alert details
    alert_type VARCHAR(50), -- 'threshold_exceeded', 'anomaly', 'missing_data'
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    message TEXT,
    threshold_value DECIMAL,
    actual_value DECIMAL,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),

    -- Notification
    notifications_sent JSONB, -- Track which channels were notified

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_patient_status ON alerts (patient_id, status, created_at DESC);
CREATE INDEX idx_alerts_active ON alerts (status, created_at DESC) WHERE status = 'active';
```

---

## Data Retention Strategy

### Tiered Storage Approach

**Tier 1: Hot Data (Last 30 Days)**

- Raw readings stored in TimescaleDB
- Fast access, no compression
- Used for real-time dashboards

**Tier 2: Warm Data (30 Days - 1 Year)**

- Compressed chunks in TimescaleDB
- Still queryable, slightly slower
- Used for trend analysis

**Tier 3: Cold Data (1+ Years)**

- Archived to object storage (S3)
- Aggregated data only (hourly/daily averages)
- Restored on-demand if needed

### Implementation

```sql
-- Data retention policy: Keep raw data for 1 year, then compress
SELECT add_retention_policy('vitals_readings', INTERVAL '1 year');

-- Compression policy: Compress data older than 7 days
SELECT add_compression_policy('vitals_readings', INTERVAL '7 days');

-- Archive old data to S3 (via backend job)
-- Keep only aggregates for data older than 1 year
```

---

## Query Patterns & Optimization

### 1. Real-Time Latest Reading

```sql
-- Get latest reading for a patient (very fast with index)
SELECT *
FROM vitals_readings
WHERE patient_id = $1
ORDER BY received_at DESC
LIMIT 1;
```

### 2. Historical Trend (Last 24 Hours)

```sql
-- Use raw data for recent trends
SELECT
    time_bucket('5 minutes', received_at) AS time_bucket,
    AVG(heart_rate) AS avg_hr,
    AVG(systolic_bp) AS avg_sbp,
    AVG(diastolic_bp) AS avg_dbp,
    AVG(spo2) AS avg_spo2
FROM vitals_readings
WHERE patient_id = $1
    AND received_at >= NOW() - INTERVAL '24 hours'
GROUP BY time_bucket
ORDER BY time_bucket;
```

### 3. Weekly/Monthly Trends

```sql
-- Use daily aggregates for efficiency
SELECT
    day,
    avg_hr,
    avg_sbp,
    avg_dbp,
    avg_spo2,
    min_hr,
    max_hr
FROM vitals_daily
WHERE patient_id = $1
    AND day >= $2 -- Start date
    AND day <= $3 -- End date
ORDER BY day;
```

### 4. Statistical Analysis

```sql
-- Calculate baseline statistics (last 30 days)
SELECT
    AVG(heart_rate) AS baseline_hr,
    STDDEV(heart_rate) AS stddev_hr,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY heart_rate) AS median_hr,
    MIN(heart_rate) AS min_hr,
    MAX(heart_rate) AS max_hr
FROM vitals_readings
WHERE patient_id = $1
    AND received_at >= NOW() - INTERVAL '30 days';
```

### 5. Anomaly Detection Query

```sql
-- Find readings that deviate significantly from baseline
WITH baseline AS (
    SELECT
        AVG(heart_rate) AS avg_hr,
        STDDEV(heart_rate) AS stddev_hr
    FROM vitals_readings
    WHERE patient_id = $1
        AND received_at >= NOW() - INTERVAL '30 days'
)
SELECT
    vr.*,
    ABS(vr.heart_rate - b.avg_hr) / NULLIF(b.stddev_hr, 0) AS z_score
FROM vitals_readings vr
CROSS JOIN baseline b
WHERE vr.patient_id = $1
    AND vr.received_at >= NOW() - INTERVAL '24 hours'
    AND ABS(vr.heart_rate - b.avg_hr) / NULLIF(b.stddev_hr, 0) > 2 -- 2 standard deviations
ORDER BY vr.received_at DESC;
```

---

## Caching Strategy

### Redis Cache Structure

**Latest Readings Cache:**

```
Key: vitals:latest:{patient_id}
TTL: 60 seconds
Value: JSON of latest reading
```

**Trend Data Cache:**

```
Key: vitals:trend:{patient_id}:{timeframe}:{start}:{end}
TTL: 5 minutes
Value: JSON array of aggregated data points
```

**Patient Baseline Cache:**

```
Key: vitals:baseline:{patient_id}
TTL: 1 hour
Value: JSON of baseline statistics
```

### Cache Invalidation

- Invalidate latest reading cache when new reading arrives
- Invalidate trend cache when new data falls within cached time range
- Use cache-aside pattern: Check cache first, then database

---

## Data Archival Process

### Automated Archival Job (Daily)

```javascript
// Backend job: Archive data older than 1 year
async function archiveOldData() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 1. Aggregate data to daily averages
  const aggregatedData = await db.query(
    `
        SELECT 
            patient_id,
            DATE_TRUNC('day', received_at) AS day,
            AVG(heart_rate) AS avg_hr,
            AVG(systolic_bp) AS avg_sbp,
            -- ... other aggregates
        FROM vitals_readings
        WHERE received_at < $1
        GROUP BY patient_id, day
    `,
    [oneYearAgo]
  );

  // 2. Upload to S3
  await s3.upload({
    Bucket: "cardio-archive",
    Key: `archived/${patientId}/${year}/${month}.json`,
    Body: JSON.stringify(aggregatedData),
  });

  // 3. Delete raw data (or mark as archived)
  await db.query(
    `
        DELETE FROM vitals_readings
        WHERE received_at < $1
    `,
    [oneYearAgo]
  );
}
```

---

## Memory Management

### 1. Connection Pooling

```javascript
// Use connection pooling to limit database connections
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Query Result Streaming

```javascript
// For large result sets, use streaming
const stream = db.query("SELECT * FROM vitals_readings WHERE ...").stream();

stream.on("data", (row) => {
  // Process row by row instead of loading all into memory
});
```

### 3. Pagination

```javascript
// Always paginate large queries
const limit = 1000;
const offset = (page - 1) * limit;

const results = await db.query(
  `
    SELECT * FROM vitals_readings
    WHERE patient_id = $1
    ORDER BY received_at DESC
    LIMIT $2 OFFSET $3
`,
  [patientId, limit, offset]
);
```

### 4. Batch Processing

```javascript
// Process readings in batches
const batchSize = 100;
for (let i = 0; i < readings.length; i += batchSize) {
    const batch = readings.slice(i, i + batchSize);
    await db.query(`
        INSERT INTO vitals_readings (...)
        VALUES ${batch.map((_, idx) => `($${idx * 6 + 1}, ...)`).join(', ')}
    `, batch.flatMap(r => [r.patientId, r.hr, ...]));
}
```

---

## Performance Recommendations

1. **Indexes:** Ensure all frequently queried columns are indexed
2. **Partitioning:** TimescaleDB automatically partitions by time
3. **Compression:** Enable compression for data older than 7 days
4. **Aggregates:** Use continuous aggregates for historical queries
5. **Connection Pooling:** Limit database connections
6. **Caching:** Cache frequently accessed data in Redis
7. **Query Optimization:** Use EXPLAIN ANALYZE to optimize slow queries
8. **Batch Inserts:** Insert multiple readings in a single transaction

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Database Size:** Track growth rate
2. **Query Performance:** Monitor slow queries (>100ms)
3. **Cache Hit Rate:** Should be >80%
4. **Compression Ratio:** Track space savings
5. **Archive Job Success:** Ensure archival runs successfully

### Maintenance Tasks

- Weekly: Review slow queries, optimize indexes
- Monthly: Review data retention policies, adjust if needed
- Quarterly: Analyze storage costs, optimize archival strategy


