import AsyncStorage from '@react-native-async-storage/async-storage';

const BASELINE_KEY = 'bv_baseline';
const SESSION_KEY = 'bv_sessions';
const BASELINE_SESSIONS_NEEDED = 3;

// Z-Score threshold (number of standard deviations from mean)
// 3.0 is the industry standard sweet spot.
const ANOMALY_Z_THRESHOLD = 3.0; 
const ALPHA = 0.15; // EWMA smoothing factor

// ─── SAVE SESSION ─────────────────────────────────────────
export const saveSession = async (report) => {
  try {
    const existing = await AsyncStorage.getItem(SESSION_KEY);
    const sessions = existing ? JSON.parse(existing) : [];
    sessions.push({ ...report, timestamp: Date.now() });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    console.log('Session saved. Total sessions:', sessions.length);
    return sessions.length;
  } catch (e) {
    console.log('Error saving session:', e);
    return 0;
  }
};

// ─── BUILD INITIAL BASELINE (first 3 sessions) ────────────
export const buildBaseline = async () => {
  try {
    const existing = await AsyncStorage.getItem(SESSION_KEY);
    const sessions = existing ? JSON.parse(existing) : [];

    if (sessions.length < BASELINE_SESSIONS_NEEDED) {
      console.log('Not enough sessions. Need:', BASELINE_SESSIONS_NEEDED);
      return null;
    }

    const baselineSessions = sessions.slice(0, BASELINE_SESSIONS_NEEDED);
    const defined = v => v !== null && v !== undefined;

    const keystrokeVals = baselineSessions.map(s => s.keystroke_avg_ms).filter(defined);
    const swipeVals = baselineSessions.map(s => s.swipe_avg_px_per_sec).filter(defined);
    const touchVals = baselineSessions.map(s => s.touch_avg_duration_ms).filter(defined);
    const accelVals = baselineSessions.map(s => parseFloat(s.accelerometer_avg_variance)).filter(defined);

    const baseline = {
      keystroke_avg_ms: average(keystrokeVals),
      keystroke_std_dev: calculateStdDev(keystrokeVals, 100), // 100ms floor

      swipe_avg_px_per_sec: average(swipeVals),
      swipe_std_dev: calculateStdDev(swipeVals, 250), // 250px/s floor

      touch_avg_duration_ms: average(touchVals),
      touch_std_dev: calculateStdDev(touchVals, 50), // 50ms floor

      accelerometer_avg_variance: average(accelVals),
      accelerometer_std_dev: calculateStdDev(accelVals, 0.4), // 0.4G floor

      session_count: BASELINE_SESSIONS_NEEDED,
    };

    await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
    console.log('Initial baseline built:', JSON.stringify(baseline, null, 2));
    return baseline;

  } catch (e) {
    console.log('Error building baseline:', e);
    return null;
  }
};

// ─── EWMA BASELINE UPDATE ─────────────────────────────────
// Updates both baseline averages and absolute standard deviations dynamically
export const updateEWMABaseline = async (currentReport, oldBaseline) => {
  try {
    const updated = {
      // Keystroke
      keystroke_avg_ms: currentReport.keystroke_avg_ms != null
        ? ALPHA * currentReport.keystroke_avg_ms + (1 - ALPHA) * oldBaseline.keystroke_avg_ms
        : oldBaseline.keystroke_avg_ms,
      keystroke_std_dev: currentReport.keystroke_avg_ms != null
        ? Math.max(ALPHA * Math.abs(currentReport.keystroke_avg_ms - oldBaseline.keystroke_avg_ms) + (1 - ALPHA) * oldBaseline.keystroke_std_dev, 100)
        : oldBaseline.keystroke_std_dev,

      // Swipe
      swipe_avg_px_per_sec: currentReport.swipe_avg_px_per_sec != null
        ? ALPHA * currentReport.swipe_avg_px_per_sec + (1 - ALPHA) * (oldBaseline.swipe_avg_px_per_sec ?? currentReport.swipe_avg_px_per_sec)
        : oldBaseline.swipe_avg_px_per_sec,
      swipe_std_dev: currentReport.swipe_avg_px_per_sec != null
        ? Math.max(ALPHA * Math.abs(currentReport.swipe_avg_px_per_sec - (oldBaseline.swipe_avg_px_per_sec ?? currentReport.swipe_avg_px_per_sec)) + (1 - ALPHA) * (oldBaseline.swipe_std_dev ?? 250), 250)
        : oldBaseline.swipe_std_dev,

      // Touch
      touch_avg_duration_ms: currentReport.touch_avg_duration_ms != null
        ? ALPHA * currentReport.touch_avg_duration_ms + (1 - ALPHA) * (oldBaseline.touch_avg_duration_ms ?? currentReport.touch_avg_duration_ms)
        : oldBaseline.touch_avg_duration_ms,
      touch_std_dev: currentReport.touch_avg_duration_ms != null
        ? Math.max(ALPHA * Math.abs(currentReport.touch_avg_duration_ms - (oldBaseline.touch_avg_duration_ms ?? currentReport.touch_avg_duration_ms)) + (1 - ALPHA) * (oldBaseline.touch_std_dev ?? 50), 50)
        : oldBaseline.touch_std_dev,

      // Accelerometer
      accelerometer_avg_variance: currentReport.accelerometer_avg_variance != null
        ? ALPHA * parseFloat(currentReport.accelerometer_avg_variance) + (1 - ALPHA) * oldBaseline.accelerometer_avg_variance
        : oldBaseline.accelerometer_avg_variance,
      accelerometer_std_dev: currentReport.accelerometer_avg_variance != null
        ? Math.max(ALPHA * Math.abs(parseFloat(currentReport.accelerometer_avg_variance) - oldBaseline.accelerometer_avg_variance) + (1 - ALPHA) * oldBaseline.accelerometer_std_dev, 0.4)
        : oldBaseline.accelerometer_std_dev,

      session_count: (oldBaseline.session_count || 3) + 1,
      last_updated: Date.now(),
    };

    await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(updated));
    console.log('EWMA baseline updated — session count:', updated.session_count);
    return updated;

  } catch (e) {
    console.log('Error updating EWMA:', e);
    return oldBaseline;
  }
};

// ─── GET ANOMALY SCORE (uses Z-Score verification) ───────
export const getAnomalyScore = async (currentReport, accessibilityMode = false) => {
  try {
    const stored = await AsyncStorage.getItem(BASELINE_KEY);
    if (!stored) {
      console.log('No baseline yet — still learning');
      return { score: 0, isAnomaly: false, learning: true, details: {} };
    }

    const baseline = JSON.parse(stored);
    const zScores = {};

    // Keystroke Z-Score
    if (baseline.keystroke_avg_ms && currentReport.keystroke_avg_ms) {
      zScores.keystroke = Math.abs(currentReport.keystroke_avg_ms - baseline.keystroke_avg_ms) / (baseline.keystroke_std_dev || 25);
    }

    // Swipe Z-Score
    if (baseline.swipe_avg_px_per_sec && currentReport.swipe_avg_px_per_sec) {
      zScores.swipe = Math.abs(currentReport.swipe_avg_px_per_sec - baseline.swipe_avg_px_per_sec) / (baseline.swipe_std_dev || 60);
    }

    // Touch duration Z-Score
    if (baseline.touch_avg_duration_ms && currentReport.touch_avg_duration_ms) {
      zScores.touch = Math.abs(currentReport.touch_avg_duration_ms - baseline.touch_avg_duration_ms) / (baseline.touch_std_dev || 15);
    }

    const scores = Object.values(zScores);
    const avgZScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Adjust Z-Score tolerance dynamically for accessibility mode (tremors/motor drift)
    const activeThreshold = accessibilityMode ? 4.0 : ANOMALY_Z_THRESHOLD;
    const isAnomaly = avgZScore > activeThreshold || currentReport.duress_flag;

    // Update baseline if authentication was normal
    if (!isAnomaly && !currentReport.duress_flag) {
      await updateEWMABaseline(currentReport, baseline);
    }

    const result = {
      score: parseFloat(Math.min(avgZScore / activeThreshold, 1.0).toFixed(3)), // Normalized & clamped to [0, 1]
      isAnomaly,
      learning: false,
      duress: currentReport.duress_flag,
      details: zScores,
      baseline,
      ewma_sessions: baseline.session_count || 3,
    };

    console.log('Z-SCORE ANOMALY DETECTOR RESULT:', JSON.stringify(result, null, 2));
    return result;

  } catch (e) {
    console.log('Error calculating anomaly:', e);
    return { score: 0, isAnomaly: false, learning: true, details: {} };
  }
};

// ─── GET SESSION COUNT ─────────────────────────────────────
export const getSessionCount = async () => {
  try {
    const existing = await AsyncStorage.getItem(SESSION_KEY);
    const sessions = existing ? JSON.parse(existing) : [];
    return sessions.length;
  } catch (e) {
    return 0;
  }
};

// ─── RESET ────────────────────────────────────────────────
export const resetAll = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(BASELINE_KEY);
  console.log('All data reset');
};

// ─── HELPERS ──────────────────────────────────────────────
const average = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const calculateStdDev = (arr, floor = 0) => {
  if (!arr || arr.length === 0) return floor;
  const avg = average(arr);
  const variance = arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length;
  return Math.max(Math.sqrt(variance), floor);
};