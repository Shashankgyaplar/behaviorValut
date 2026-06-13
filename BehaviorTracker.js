import { useState, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { PanResponder } from 'react-native';

export const useBehaviorTracker = () => {
  const [keyTimings, setKeyTimings] = useState([]);
  const [swipeEvents, setSwipeEvents] = useState([]);
  const [touchPressure, setTouchPressure] = useState([]);
  const [accelerometerData, setAccelerometerData] = useState([]);
  
  const lastKeyTime = useRef(null);
  const touchStartTime = useRef(null);
  const swipeStartY = useRef(null);
  const swipeStartTime = useRef(null);
  
  // High-pass filter reference: stores previous frame data
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });

  const handleKeyPress = () => {
    const now = Date.now();
    if (lastKeyTime.current) {
      const gap = now - lastKeyTime.current;
      if (gap > 60) {
        setKeyTimings(prev => [...prev, gap]);
        console.log('Keystroke gap:', gap, 'ms');
      }
    }
    lastKeyTime.current = now;
  };

  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (event) => {
        swipeStartY.current = event.nativeEvent.pageY;
        swipeStartTime.current = Date.now();
        touchStartTime.current = Date.now();
        console.log('Touch started');
      },
      onPanResponderRelease: (event) => {
        if (touchStartTime.current) {
          const duration = Date.now() - touchStartTime.current;
          setTouchPressure(prev => [...prev, { duration, pressure: 0.5 }]);
          console.log('Touch ended — duration:', duration, 'ms');
        }
        if (swipeStartY.current !== null) {
          const endY = event.nativeEvent.pageY;
          const distance = Math.abs(endY - swipeStartY.current);
          const timeDiff = Date.now() - swipeStartTime.current;
          if (distance > 20 && timeDiff > 0) {
            const speed = Math.round(distance / timeDiff * 1000);
            setSwipeEvents(prev => [...prev, speed]);
            console.log('Swipe speed:', speed, 'px/s | distance:', Math.round(distance), 'px');
          }
          swipeStartY.current = null;
        }
      },
      onPanResponderTerminate: () => {
        swipeStartY.current = null;
        touchStartTime.current = null;
      },
    })
  ).current;

  const startAccelerometer = () => {
    Accelerometer.setUpdateInterval(500);
    const sub = Accelerometer.addListener(data => {
      // Calculate dynamic acceleration changes (Jerk) to isolate high-frequency tremors from gravity and walking
      const dx = data.x - lastAccel.current.x;
      const dy = data.y - lastAccel.current.y;
      const dz = data.z - lastAccel.current.z;

      lastAccel.current = { x: data.x, y: data.y, z: data.z };

      const dynamicJerk = Math.sqrt(dx * dx + dy * dy + dz * dz);
      setAccelerometerData(prev => [...prev.slice(-20), dynamicJerk]);

      if (dynamicJerk > 1.2) {
        console.log('DURESS SUSPICION: HIGH JERK VECTOR —', dynamicJerk.toFixed(3));
      }
    });
    return sub;
  };

  // ─── BOT / SYNTHETIC INPUT DETECTION ─────────────────────
  const detectSyntheticInput = (timings) => {
    if (timings.length < 5) return false;

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const variance = timings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // Real humans: stdDev > 80ms (natural variation)
    // Bots/ADB injection: stdDev < 15ms (perfectly uniform taps)
    const isSynthetic = stdDev < 15 && timings.length > 8;

    if (isSynthetic) {
      console.log('SYNTHETIC INPUT DETECTED — stdDev:', stdDev.toFixed(2), 'ms — possible bot attack');
    }

    return isSynthetic;
  };

  const getAnomalyReport = () => {
    const avgKeystroke = keyTimings.length > 0
      ? Math.round(keyTimings.reduce((a, b) => a + b, 0) / keyTimings.length)
      : null;
    const avgSwipe = swipeEvents.length > 0
      ? Math.round(swipeEvents.reduce((a, b) => a + b, 0) / swipeEvents.length)
      : null;
    const avgAccel = accelerometerData.length > 0
      ? (accelerometerData.reduce((a, b) => a + b, 0) / accelerometerData.length).toFixed(3)
      : null;
    const avgTouchDuration = touchPressure.length > 0
      ? Math.round(touchPressure.reduce((a, b) => a + b.duration, 0) / touchPressure.length)
      : null;

    // Bot detection
    const syntheticBot = detectSyntheticInput(keyTimings);

    const report = {
      keystroke_avg_ms: avgKeystroke,
      swipe_avg_px_per_sec: avgSwipe,
      touch_avg_duration_ms: avgTouchDuration,
      accelerometer_avg_variance: avgAccel,
      total_keystrokes: keyTimings.length,
      total_swipes: swipeEvents.length,
      total_touches: touchPressure.length,
      duress_flag: accelerometerData.filter(v => v > 1.2).length >= 3,
      synthetic_bot_detected: syntheticBot,
    };

    if (syntheticBot) {
      console.log('BOT ATTACK — session will be blocked');
    }

    console.log('BEHAVIOR REPORT:', JSON.stringify(report, null, 2));
    return report;
  };

  const resetSession = () => {
    setKeyTimings([]);
    setSwipeEvents([]);
    setTouchPressure([]);
    setAccelerometerData([]);
    lastKeyTime.current = null;
    console.log('Session signals reset');
  };

  return {
    handleKeyPress,
    swipePanResponder,
    startAccelerometer,
    getAnomalyReport,
    resetSession,
  };
};