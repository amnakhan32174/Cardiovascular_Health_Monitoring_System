# Feature List & Implementation Guide

## Priority Levels

- **P0 (Critical):** Core functionality, must-have for MVP
- **P1 (High):** Important features for professional use
- **P2 (Medium):** Enhanced user experience
- **P3 (Low):** Nice-to-have features

---

## Core Features (P0)

### 1. Real-Time Vitals Display

**Priority:** P0  
**Status:** Partially Implemented  
**Components:**

- BP (Systolic/Diastolic)
- Heart Rate (BPM)
- SpO₂ (Oxygen Saturation)
- ECG Waveform (real-time graph)
- Blood Sugar (optional)

**Implementation Notes:**

- Use Socket.IO for real-time updates
- Display in large, readable cards with color-coded status
- Update frequency: Every 1-5 seconds (configurable)
- Show last updated timestamp
- Visual indicators for normal/abnormal ranges

**Files to Modify:**

- `frontend/src/components/LiveSensor.jsx` - Enhance with all vitals
- `frontend/src/components/VitalsCard.jsx` - New component for each vital
- `backend/src/services/socketService.js` - Handle vitals events

---

### 2. Manual Patient Data Input

**Priority:** P0  
**Status:** Not Implemented

**Sub-features:**

- Blood Sugar input form
- Health Questionnaire:
  - Smoking status (current/former/never)
  - Lifestyle factors (exercise, diet, sleep)
  - Medical history (hypertension, diabetes, etc.)
  - Medications
  - Family history

**Implementation Notes:**

- Create form components with validation
- Store in PostgreSQL `patient_questionnaires` table
- Allow editing/updating questionnaire
- Show last updated date

**Files to Create:**

- `frontend/src/components/forms/BloodSugarForm.jsx`
- `frontend/src/components/forms/QuestionnaireForm.jsx`
- `frontend/src/pages/Questionnaire.jsx`
- `backend/src/routes/questionnaires.js`
- `backend/src/controllers/questionnaireController.js`

---

### 3. Real-Time Chat

**Priority:** P0  
**Status:** Partially Implemented (ContactDoctor page exists)

**Implementation Notes:**

- Socket.IO room-based chat (patient-doctor pairs)
- Message persistence in database
- Read receipts
- File attachments (images, documents)
- Typing indicators

**Files to Modify/Create:**

- `frontend/src/pages/ContactDoctor.jsx` - Enhance with chat UI
- `frontend/src/components/communication/ChatWindow.jsx` - New
- `backend/src/services/socketService.js` - Chat event handlers
- `backend/src/routes/messages.js` - Message API endpoints

---

### 4. Video Call Integration

**Priority:** P0  
**Status:** Not Implemented

**Implementation Notes:**

- WebRTC for peer-to-peer video/audio
- Socket.IO for signaling (offer/answer/ICE candidates)
- Screen sharing capability
- Call recording (with consent)
- Call history/logs

**Files to Create:**

- `frontend/src/components/communication/VideoCall.jsx`
- `frontend/src/hooks/useWebRTC.js`
- `backend/src/services/webrtcService.js` - Signaling server
- `backend/src/routes/calls.js` - Call management API

**Dependencies:**

- `simple-peer` or `peerjs` for WebRTC
- `socket.io-client` for signaling

---

### 5. Vitals Snapshot System

**Priority:** P0  
**Status:** Not Implemented

**Sub-features:**

- Manual snapshot capture (button click)
- Automatic snapshots at configurable intervals (e.g., every 15 min, 1 hour)
- Snapshot includes: All current vitals + timestamp + patient ID
- Store snapshots in database
- View snapshot history

**Implementation Notes:**

- Create `vitals_snapshots` table
- Backend endpoint: `POST /api/snapshots` (manual), cron job for auto
- Frontend button to capture manual snapshot
- Settings page to configure auto-snapshot interval

**Files to Create:**

- `frontend/src/components/SnapshotButton.jsx`
- `frontend/src/pages/Snapshots.jsx` - View history
- `backend/src/routes/snapshots.js`
- `backend/src/services/snapshotService.js` - Auto-snapshot logic
- `backend/src/jobs/snapshotJob.js` - Cron job

---

### 6. Historical Data Storage & Retrieval

**Priority:** P0  
**Status:** Partially Implemented (Firebase used, needs migration)

**Implementation Notes:**

- Use TimescaleDB for efficient time-series storage
- Store all vitals readings with timestamps
- Implement data retention policy (e.g., keep raw data for 1 year, aggregated for 5 years)
- Pagination for large datasets
- Date range filtering

**Database Schema:**

```sql
CREATE TABLE vitals_readings (
    id BIGSERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    device_id VARCHAR(255),
    heart_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    spo2 INTEGER,
    blood_sugar DECIMAL(5,2),
    ecg_data JSONB, -- Store ECG waveform data
    timestamp TIMESTAMPTZ NOT NULL
);

-- Convert to hypertable for TimescaleDB
SELECT create_hypertable('vitals_readings', 'timestamp');
```

**Files to Create/Modify:**

- `backend/src/services/storageService.js` - Data archival logic
- `backend/src/routes/vitals.js` - Historical data endpoints
- `frontend/src/pages/Trends.jsx` - Historical data visualization

---

### 7. Alerts & Notifications

**Priority:** P0  
**Status:** Not Implemented

**Alert Types:**

- Abnormal vitals (HR too high/low, BP spikes, low SpO₂)
- Missing readings (device disconnected)
- Medication reminders
- Appointment reminders

**Implementation Notes:**

- Configurable thresholds per patient
- Real-time alert detection on backend
- Multiple notification channels:
  - In-app notifications
  - Email (SendGrid/SES)
  - SMS (Twilio) for critical alerts
  - Push notifications (FCM)

**Alert Rules:**

```javascript
{
  heart_rate: { min: 60, max: 100 },
  systolic_bp: { min: 90, max: 140 },
  diastolic_bp: { min: 60, max: 90 },
  spo2: { min: 94 },
  blood_sugar: { min: 70, max: 180 }
}
```

**Files to Create:**

- `backend/src/services/alertService.js` - Alert detection logic
- `backend/src/routes/alerts.js` - Alert management API
- `frontend/src/components/alerts/AlertNotification.jsx`
- `frontend/src/hooks/useAlerts.js`
- `backend/src/jobs/alertCheckJob.js` - Periodic alert checking

---

## Professional Features (P1)

### 8. Trend Analysis & Visualization

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- Line charts for vitals over time (daily, weekly, monthly, yearly)
- Comparison charts (today vs. yesterday, this week vs. last week)
- Statistical summaries (average, min, max, standard deviation)
- Export charts as images/PDF

**Implementation Notes:**

- Use Recharts or Chart.js for visualization
- Backend API: `GET /api/vitals/trends?patientId=&startDate=&endDate=&metric=`
- Frontend component: `Trends.jsx` with date range picker

**Files to Create:**

- `frontend/src/pages/Trends.jsx`
- `frontend/src/components/charts/VitalsTrendChart.jsx`
- `backend/src/services/analyticsService.js` - Trend calculation

---

### 9. Predictive Analytics

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- Risk score calculation based on vitals trends
- Early warning predictions (e.g., "HR trending upward, may indicate stress")
- Anomaly detection using statistical methods
- Health score dashboard

**Implementation Notes:**

- Use simple statistical models initially (moving averages, standard deviations)
- Can integrate ML models later (TensorFlow.js or backend Python service)
- Calculate risk scores based on:
  - Vitals trends
  - Questionnaire data
  - Historical patterns

**Files to Create:**

- `backend/src/services/predictiveService.js`
- `frontend/src/components/analytics/RiskScore.jsx`
- `frontend/src/components/analytics/AnomalyDetection.jsx`

---

### 10. Multi-Patient View (Doctor Dashboard)

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- List of all assigned patients
- Quick overview cards showing latest vitals for each patient
- Filter by alert status, last update time
- Click to view detailed patient dashboard
- Bulk actions (send message to multiple patients)

**Implementation Notes:**

- Role-based access: Only doctors see this view
- Real-time updates for all patients
- Efficient data loading (pagination, virtual scrolling)

**Files to Create:**

- `frontend/src/pages/DoctorDashboard.jsx`
- `frontend/src/components/doctor/PatientList.jsx`
- `frontend/src/components/doctor/PatientCard.jsx`
- `backend/src/routes/doctors.js` - Doctor-specific endpoints

---

### 11. Report Generation

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- Generate PDF reports with vitals trends
- Include charts, statistics, alerts history
- Customizable report templates
- Scheduled reports (weekly, monthly)
- Email reports to patients/doctors

**Implementation Notes:**

- Use libraries: `pdfkit`, `puppeteer`, or `jsPDF` + `html2canvas`
- Report templates in HTML/CSS
- Store generated reports in S3
- Backend endpoint: `POST /api/reports/generate`

**Files to Create:**

- `backend/src/services/reportService.js`
- `backend/src/templates/reportTemplate.html`
- `frontend/src/pages/Reports.jsx`
- `frontend/src/components/reports/ReportGenerator.jsx`

---

### 12. Anomaly Detection

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- Automatic detection of unusual patterns
- Flag readings that deviate significantly from patient's baseline
- Visual indicators on charts
- Alert generation for anomalies

**Implementation Notes:**

- Statistical methods: Z-score, moving average deviation
- Machine learning: Isolation Forest, LSTM (future enhancement)
- Baseline calculation per patient (average over last 30 days)

**Files to Create:**

- `backend/src/services/anomalyService.js`
- `frontend/src/components/analytics/AnomalyIndicator.jsx`

---

### 13. Feedback System

**Priority:** P1  
**Status:** Not Implemented

**Features:**

- Patient feedback form (symptoms, how they feel)
- Doctor notes/observations
- Treatment plan updates
- Medication adherence tracking

**Implementation Notes:**

- Store feedback linked to vitals readings
- Timeline view showing vitals + feedback together
- Searchable feedback history

**Files to Create:**

- `frontend/src/components/forms/FeedbackForm.jsx`
- `frontend/src/pages/Feedback.jsx`
- `backend/src/routes/feedback.js`

---

### 14. API Integration

**Priority:** P1  
**Status:** Partially Implemented (device endpoint exists)

**Features:**

- RESTful API for external integrations
- API key authentication
- Webhook support for third-party services
- Rate limiting per API key
- API documentation (Swagger/OpenAPI)

**Implementation Notes:**

- Use `express-rate-limit` for rate limiting
- Generate API keys for devices/integrations
- Webhook endpoints: `POST /api/webhooks/:eventType`

**Files to Create:**

- `backend/src/routes/api.js` - Public API endpoints
- `backend/src/middleware/apiAuth.js` - API key validation
- `backend/docs/api.yaml` - OpenAPI specification

---

### 15. Mobile-Friendly UI

**Priority:** P1  
**Status:** Partially Implemented (Tailwind responsive)

**Features:**

- Responsive design for mobile devices
- Touch-friendly controls
- Progressive Web App (PWA) support
- Offline mode (cache recent data)
- Mobile app (React Native - future)

**Implementation Notes:**

- Ensure all components are mobile-responsive
- Add PWA manifest and service worker
- Test on various screen sizes

**Files to Modify:**

- All frontend components - ensure mobile responsiveness
- `frontend/public/manifest.json` - PWA manifest
- `frontend/src/serviceWorker.js` - Service worker for offline support

---

## Enhanced Features (P2)

### 16. Data Export

**Priority:** P2  
**Status:** Not Implemented

**Features:**

- Export vitals data as CSV/JSON
- Export reports as PDF
- Bulk export for date ranges

---

### 17. Customizable Dashboards

**Priority:** P2  
**Status:** Not Implemented

**Features:**

- Drag-and-drop dashboard widgets
- Customizable layouts
- Save multiple dashboard views

---

### 18. Medication Management

**Priority:** P2  
**Status:** Not Implemented

**Features:**

- Medication list
- Dosage reminders
- Adherence tracking

---

### 19. Appointment Scheduling

**Priority:** P2  
**Status:** Not Implemented

**Features:**

- Calendar integration
- Appointment booking
- Reminders

---

### 20. Family/Caregiver Access

**Priority:** P2  
**Status:** Not Implemented

**Features:**

- Share access with family members
- Caregiver dashboard
- Permission levels

---

## Future Enhancements (P3)

- AI-powered health insights
- Integration with fitness trackers (Fitbit, Apple Health)
- Telemedicine platform integration
- Multi-language support
- Dark mode
- Voice commands
- Integration with electronic health records (EHR)

---

## Implementation Roadmap

### Phase 1 (MVP - 4-6 weeks)

1. Complete real-time vitals display (all metrics)
2. Manual data input (blood sugar, questionnaire)
3. Basic chat functionality
4. Video call integration
5. Snapshot system (manual + auto)
6. Historical data storage (TimescaleDB migration)
7. Basic alerts system

### Phase 2 (Professional Features - 6-8 weeks)

8. Trend analysis & visualization
9. Multi-patient doctor dashboard
10. Report generation
11. Anomaly detection
12. Enhanced alerts (email/SMS)

### Phase 3 (Advanced Features - 4-6 weeks)

13. Predictive analytics
14. Feedback system
15. API integration & webhooks
16. Mobile optimization & PWA

### Phase 4 (Polish & Scale - Ongoing)

17. Performance optimization
18. Security hardening
19. Additional P2/P3 features
20. Testing & QA


