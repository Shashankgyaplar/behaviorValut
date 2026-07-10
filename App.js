import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View,
  TouchableOpacity, TextInput,
  ScrollView, SafeAreaView,
  KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, Alert
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useBehaviorTracker } from './BehaviorTracker';
import {
  saveSession,
  buildBaseline,
  getAnomalyScore,
  getSessionCount,
  resetAll
} from './AnomalyDetector';
import OTPScreen from './OTPScreen';
import HomeScreen from './HomeScreen';
import * as Updates from 'expo-updates';
import { logBehavior, sendDuressAlert, getMLScore, checkBackendHealth, generateOTP } from './api';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const toggleScale = useRef(new Animated.Value(1)).current;
  const [sessionCount, setSessionCount] = useState(0);
  const [showOTP, setShowOTP] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [anomalyReason, setAnomalyReason] = useState('');
  const [learningStatus, setLearningStatus] = useState('');
  const [secretTaps, setSecretTaps] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [lastScore, setLastScore] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('anonymous');
  const accelSub = useRef(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [completedTransfer, setCompletedTransfer] = useState(null);

  // Anti-paste: track previous input length to detect bulk text insertion
  const prevUsernameLen = useRef(0);
  const prevPasswordLen = useRef(0);

  const handleSafeUsername = (text) => {
    if (text.length - prevUsernameLen.current > 2) {
      // Paste detected — reject it
      Alert.alert('Paste Blocked', 'Please type your User ID manually. BehaviorVault needs your typing pattern to verify your identity.');
      return;
    }
    prevUsernameLen.current = text.length;
    setUsername(text);
  };

  const handleSafePassword = (text) => {
    if (text.length - prevPasswordLen.current > 2) {
      Alert.alert('Paste Blocked', 'Please type your Password manually. BehaviorVault needs your typing pattern to verify your identity.');
      return;
    }
    prevPasswordLen.current = text.length;
    setPassword(text);
  };

  const handleTogglePress = () => {
    Animated.sequence([
      Animated.timing(toggleScale, {
        toValue: 0.82,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(toggleScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    setShowPassword(!showPassword);
  };

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  const {
    handleKeyPress,
    swipePanResponder,
    startAccelerometer,
    getAnomalyReport,
    resetSession,
  } = useBehaviorTracker();

  // ─── Auto-update checking ───
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('Error checking/applying updates:', e);
      }
    };
    checkUpdate();
  }, []);

  // ─── Accelerometer lifecycle — stop when navigating away, restart on return ───
  useEffect(() => {
    // Only run accelerometer on the login screen
    if (!showHome && !showOTP) {
      accelSub.current = startAccelerometer();
    }
    return () => {
      accelSub.current?.remove();
      accelSub.current = null;
    };
  }, [showHome, showOTP]);

  useEffect(() => {
    loadSessionCount();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadSessionCount = async () => {
    const count = await getSessionCount();
    setSessionCount(count);
    if (count < 3) {
      setLearningStatus(`Learning your behavior... (${count}/3 sessions)`);
    } else {
      setLearningStatus('BehaviorEngine Active');
    }
  };

  const handleSecretTap = () => {
    const newTaps = secretTaps + 1;
    setSecretTaps(newTaps);
    if (newTaps >= 5) {
      setShowReset(true);
      setSecretTaps(0);
    }
  };

  const handleLogin = async () => {
    if (!username || !password || isLoggingIn) return;

    setIsLoggingIn(true);
    const report = getAnomalyReport();
    const loginUserId = username || 'anonymous'; // ── #5: capture before clearing
    setCurrentUserId(loginUserId); // persist for HomeScreen duress alerts

    // ─── BOT CHECK — block immediately ───────────────────
    if (report.synthetic_bot_detected) {
      resetSession();
      setUsername('');
      setPassword('');
      prevUsernameLen.current = 0;
      prevPasswordLen.current = 0;
      setIsLoggingIn(false);
      alert('Automated attack detected. Session terminated.');
      console.log('BOT BLOCKED — session terminated immediately');
      return;
    }

    resetSession();
    setUsername('');
    setPassword('');
    prevUsernameLen.current = 0;
    prevPasswordLen.current = 0;

    const totalSessions = await saveSession(report);
    setSessionCount(totalSessions);

    if (totalSessions === 3) {
      await buildBaseline();
      setLearningStatus('BehaviorEngine Active');
      logBehavior(report, null, loginUserId); // fire and forget
      setIsLoggingIn(false);
      alert('Baseline learned! BehaviorEngine is now active.');
      return;
    }

    if (totalSessions < 3) {
      setLearningStatus(`Learning your behavior... (${totalSessions}/3 sessions)`);
      logBehavior(report, null, loginUserId); // fire and forget
      setIsLoggingIn(false);
      alert(`Session ${totalSessions}/3 recorded. Login ${3 - totalSessions} more time(s) to activate BehaviorEngine.`);
      return;
    }

    // ─── CHECK BACKEND HEALTH ─────────────────────────────
    const backendOnline = await checkBackendHealth();
    setIsOffline(!backendOnline);

    // try TFLite ML model first (only if online)
    let result = null;

    if (backendOnline) {
      result = await getMLScore(report, loginUserId);
      console.log('Online mode — TFLite score:', result?.score);
    } else {
      console.log('Offline mode — using on-device detector only');
    }

    // fallback to statistical detector
    if (!result) {
      result = await getAnomalyScore(report, accessibilityMode);
      console.log('Statistical detector — score:', result?.score);
    }

    // null guard
    if (!result) {
      result = {
        score: 0,
        isAnomaly: false,
        learning: false,
        duress: false,
      };
    }

    result.duress = result.duress || report.duress_flag;

    // ─── PARALLEL: log + duress alert at the same time ───
    const parallelTasks = [logBehavior(report, result, loginUserId)];

    // ─── Check duress_flag independently ───
    if (result.duress || report.duress_flag) {
      parallelTasks.push(
        sendDuressAlert(
          parseFloat(report.accelerometer_avg_variance),
          0,
          'unknown',
          loginUserId
        )
      );
      console.log('SILENT DURESS FLAG SENT');
    }

    // Don't wait for logging — navigate immediately
    Promise.all(parallelTasks).catch(e => console.log('Background tasks error:', e));

    // ─── ANOMALY CHECK ───────────────────────────────────
    const adjustedIsAnomaly = result.isAnomaly || result.duress;

    setLastScore(result.score); // ← store score so HomeScreen Trust card can display it
    setIsLoggingIn(false);

    if (adjustedIsAnomaly) {
      setAnomalyReason('Additional verification required for your security');
      setShowOTP(true);
    } else {
      setShowHome(true);
    }
  };

  const handleOTPVerified = () => {
    setShowOTP(false);
    if (pendingTransfer) {
      setCompletedTransfer(pendingTransfer);
      setPendingTransfer(null);
    }
    setShowHome(true);
  };

  const handleOTPFailed = (isLocked = false) => {
    setShowOTP(false);
    setPendingTransfer(null);
    setCompletedTransfer(null);
    setShowHome(false);
    setUsername('');
    setPassword('');
    if (isLocked) {
      Alert.alert('Security Compromise', 'Account locked due to biometric signature mismatch. Please contact your administrator.');
    } else {
      Alert.alert('Session Terminated', 'Verification failed. Please log in again.');
    }
  };

  const handleReset = async () => {
    await resetAll();
    setSessionCount(0);
    setShowReset(false);
    setSecretTaps(0);
    setShowHome(false);
    setLearningStatus('Learning your behavior... (0/3 sessions)');
    alert('Reset done! Start fresh.');
  };

  useEffect(() => {
    if (showOTP) {
      const activeUser = currentUserId || username || 'demo_user';
      generateOTP(activeUser).then(otp => {
        if (otp) {
          Alert.alert(
            "Simulated SMS Notification",
            `Your BehaviorVault verification code is: ${otp}`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Connection Latency",
            "Failed to retrieve the verification code. The server might be waking up from sleep. Please wait a few seconds and tap 'Resend Code' on the screen.",
            [{ text: "OK" }]
          );
        }
      }).catch(e => {
        console.log('Error triggering OTP:', e);
        Alert.alert("Error", "An unexpected error occurred while generating the security code.");
      });
    }
  }, [showOTP]);

  const handleResendOTP = async () => {
    const activeUser = currentUserId || username || 'demo_user';
    const otp = await generateOTP(activeUser);
    if (otp) {
      Alert.alert(
        "Simulated SMS Notification",
        `Your new verification code is: ${otp}`,
        [{ text: "OK" }]
      );
      return true;
    }
    return false;
  };

  // ─── MID-SESSION ANOMALY CHECK (Option A: challenge on sensitive actions) ───
  const handleMidSessionCheck = async (transferDetails) => {
    const report = getAnomalyReport();

    const backendOnline = await checkBackendHealth();
    setIsOffline(!backendOnline);

    let result = null;
    if (backendOnline) {
      result = await getMLScore(report, currentUserId);
      console.log('Mid-session ML check — score:', result?.score);
    }
    if (!result) {
      result = await getAnomalyScore(report, accessibilityMode);
      console.log('Mid-session statistical check — score:', result?.score);
    }
    if (!result) {
      result = { score: 0, isAnomaly: false, learning: false, duress: false };
    }

    result.duress = result.duress || report.duress_flag;

    // Log behavior in background
    logBehavior(report, result, currentUserId).catch(e => console.log('Log error:', e));

    // Duress alert if flagged
    if (result.duress || report.duress_flag) {
      sendDuressAlert(
        parseFloat(report.accelerometer_avg_variance),
        transferDetails?.amount || 0,
        transferDetails?.beneficiary || 'unknown',
        currentUserId
      ).catch(e => console.log('Duress alert error:', e));
      console.log('MID-SESSION DURESS FLAG SENT');
    }

    const isAnomaly = result.isAnomaly || result.duress;
    console.log('Mid-session anomaly result:', isAnomaly, '| score:', result.score);

    if (isAnomaly) {
      setPendingTransfer(transferDetails);
      setAnomalyReason('Behavioral verification required for this transaction');
      setShowOTP(true);
      setShowHome(false);
      return false; // blocked
    }

    return true; // allowed
  };

  if (showOTP) {
    return (
      <OTPScreen
        reason={anomalyReason}
        userId={currentUserId || username || 'demo_user'}
        onVerified={handleOTPVerified}
        onFailed={handleOTPFailed}
        onResend={handleResendOTP}
      />
    );
  }

  if (showHome) {
    return (
      <HomeScreen
        lastScore={lastScore}
        isOffline={isOffline}
        accessibilityMode={accessibilityMode}
        onToggleAccessibility={() => setAccessibilityMode(prev => !prev)}
        onLogout={() => {
          setCompletedTransfer(null);
          setPendingTransfer(null);
          setShowHome(false);
        }}
        currentUserId={currentUserId}
        handleKeyPress={handleKeyPress}
        onMidSessionCheck={handleMidSessionCheck}
        completedTransfer={completedTransfer}
        onClearCompletedTransfer={() => setCompletedTransfer(null)}
        onDuress={async (variance) => {
          await sendDuressAlert(variance, 0, 'unknown', currentUserId);
        }}
        onAnomaly={(action) => {
          setAnomalyReason('Additional verification required for your security');
          setShowOTP(true);
          setShowHome(false);
        }}
      />
    );
  }

  const isActive = sessionCount >= 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StatusBar style="light" />

          {/* Decorative background orbs */}
          <View style={styles.orbTop} />
          <View style={styles.orbBottom} />

          <Animated.View style={[
            styles.mainContent,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] }
          ]}>

            {/* Logo & Brand */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoOuter}>
                  <View style={styles.logoInner}>
                    <Text style={styles.logoText}>{'BV'}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.appName}>{'BehaviorVault'}</Text>
              <Text style={styles.tagline}>{'Silent Authentication · Zero Trust'}</Text>
            </View>

            {/* Status Pill */}
            <View style={[
              styles.statusBadge,
              isActive ? styles.statusActive : styles.statusLearning
            ]}>
              <Animated.View style={[
                styles.statusDot,
                {
                  backgroundColor: isActive ? '#10B981' : '#F59E0B',
                  transform: [{ scale: pulseAnim }]
                }
              ]} />
              <Text style={[
                styles.statusText,
                { color: isActive ? '#10B981' : '#F59E0B' }
              ]}>{learningStatus}</Text>
            </View>

            {/* Offline Mode Banner */}
            {isOffline && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>
                  {'Offline Mode — On-Device Protection Active'}
                </Text>
              </View>
            )}

            {/* Login Card */}
            <View style={styles.card} {...swipePanResponder.panHandlers}>
              {/* Card glow top border */}
              <View style={styles.cardGlow} />

              <Text style={styles.cardTitle}>{'Welcome Back'}</Text>
              <Text style={styles.cardSubtitle}>{'Authenticate with your behavioral fingerprint'}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{'User ID'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your User ID"
                  placeholderTextColor="#64748B"
                  value={username}
                  onChangeText={handleSafeUsername}
                  onKeyPress={handleKeyPress}
                  keyboardType="default"
                  contextMenuHidden={true}
                  autoComplete="off"
                  selectTextOnFocus={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{'Password'}</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your Password"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={handleSafePassword}
                    onKeyPress={handleKeyPress}
                    secureTextEntry={!showPassword}
                    contextMenuHidden={true}
                    autoComplete="off"
                    selectTextOnFocus={false}
                  />
                  <TouchableOpacity 
                    onPress={handleTogglePress}
                    activeOpacity={0.8}
                    style={styles.toggleButton}
                  >
                    <Animated.View style={{ transform: [{ scale: toggleScale }] }}>
                      <Text style={styles.toggleText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, (!username || !password || isLoggingIn) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={!username || !password || isLoggingIn}
                activeOpacity={0.8}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{'Login Securely'}</Text>
                    <Text style={styles.buttonArrow}>{'→'}</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>{'Protected by Behavioral AI  ·  On-Device  ·  Encrypted'}</Text>
            </View>

            {showReset && (
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetText}>{'⟲  Reset Demo Data'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleSecretTap} activeOpacity={1}>
              <Text style={styles.version}>{'v2.0 — BehaviorEngine'}</Text>
            </TouchableOpacity>

            {secretTaps > 0 && (
              <Text style={styles.tapHint}>
                {`${5 - secretTaps} more taps to unlock dev tools`}
              </Text>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  mainContent: {
    width: '100%',
    alignItems: 'center',
  },

  // Decorative orbs
  orbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginBottom: 28,
    gap: 8,
  },
  statusLearning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#10B981',
    opacity: 0.4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    marginTop: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 28,
    lineHeight: 19,
  },

  // Input
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Button
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  hint: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    marginTop: 20,
    letterSpacing: 0.3,
  },

  // Reset & meta
  resetButton: {
    marginTop: 24,
    padding: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  resetText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  version: {
    color: '#475569',
    fontSize: 12,
    marginTop: 20,
  },
  tapHint: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  offlineBanner: {
    backgroundColor: '#1A1A00',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFB020',
    width: '100%',
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFB020',
    fontSize: 12,
    fontWeight: '500',
  },
});