import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, TextInput,
  KeyboardAvoidingView, ScrollView,
  Platform, SafeAreaView, Animated,
  ActivityIndicator,
} from 'react-native';
import { verifyOTP } from './api';

export default function OTPScreen({ reason, userId, onVerified, onFailed }) {
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  const timerRef = useRef(null);
  const navTimeoutRef = useRef(null);
  const isMounted = useRef(true);

  const MAX_ATTEMPTS = 3;

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleSuccess = useRef(new Animated.Value(0.3)).current;
  const opacitySuccess = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (isMounted.current) setStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Timer pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      isMounted.current = false;
      clearInterval(timerRef.current);
      clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const handleVerify = async () => {
    if (isVerifying || otp.length < 4) return;
    setIsVerifying(true);

    const isMatch = await verifyOTP(userId, otp);

    if (!isMounted.current) return;
    setIsVerifying(false);

    if (isMatch) {
      clearInterval(timerRef.current);
      setStatus('success');

      // Success animation
      Animated.parallel([
        Animated.spring(scaleSuccess, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(opacitySuccess, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      navTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) onVerified();
      }, 1500);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setOtp('');
      if (newAttempts >= MAX_ATTEMPTS) {
        clearInterval(timerRef.current);
        setStatus('failed');
        navTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) onFailed();
        }, 1500);
      }
    }
  };

  // ─── SUCCESS ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <Animated.View style={[
            styles.successCircle,
            { transform: [{ scale: scaleSuccess }], opacity: opacitySuccess }
          ]}>
            <Text style={styles.successIcon}>{'✓'}</Text>
          </Animated.View>
          <Animated.Text style={[styles.successText, { opacity: opacitySuccess }]}>
            {'Identity Verified'}
          </Animated.Text>
          <Animated.Text style={[styles.successSub, { opacity: opacitySuccess }]}>
            {'Resuming secure session...'}
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── FAILED ───────────────────────────────────────────────
  if (status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <View style={styles.failedCircle}>
            <Text style={styles.failedIcon}>{'✕'}</Text>
          </View>
          <Text style={styles.failedText}>{'Verification Failed'}</Text>
          <Text style={styles.failedSub}>{'Session terminated for security.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── OTP INPUT ────────────────────────────────────────────
  const isUrgent = timeLeft <= 10;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
            width: '100%',
          }}>

            {/* Alert header */}
            <View style={styles.alertHeader}>
              <Animated.View style={[
                styles.alertDot,
                { transform: [{ scale: pulseAnim }] }
              ]} />
              <Text style={styles.alertHeaderText}>{'SECURITY VERIFICATION'}</Text>
            </View>

            <View style={styles.card}>
              {/* Red glow border */}
              <View style={styles.cardGlow} />

              <View style={styles.shieldBox}>
                <Text style={styles.shieldIcon}>{'!'}</Text>
              </View>

              <Text style={styles.title}>{'Step-Up Verification'}</Text>
              <Text style={styles.subtitle}>
                {reason || 'Our BehaviorEngine detected unusual activity in this session. Please verify your identity.'}
              </Text>

              {/* Timer circle */}
              <View style={styles.timerContainer}>
                <Animated.View style={[
                  styles.timerCircle,
                  {
                    borderColor: isUrgent ? '#FF4B4B' : 'rgba(99, 102, 241, 0.3)',
                    transform: [{ scale: isUrgent ? pulseAnim : 1 }],
                  }
                ]}>
                  <Text style={[
                    styles.timerValue,
                    { color: isUrgent ? '#FF4B4B' : '#6366F1' }
                  ]}>{timeLeft}</Text>
                  <Text style={styles.timerUnit}>{'sec'}</Text>
                </Animated.View>
              </View>

              <Text style={styles.demoHint}>{'Demo OTP: 1234'}</Text>

              <Text style={styles.label}>
                {'Enter OTP sent to your registered mobile'}
              </Text>

              <View style={styles.otpContainer}>
                <TextInput
                  style={[
                    styles.otpInput,
                    { borderColor: attempts > 0 ? '#FF4B4B' : 'rgba(99, 102, 241, 0.3)' }
                  ]}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="• • • •"
                  placeholderTextColor="#2D3F55"
                  autoFocus={false}
                />
              </View>

              {attempts > 0 && (
                <View style={styles.attemptsBox}>
                  <Text style={styles.attemptsText}>
                    {`Incorrect OTP. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, (otp.length < 4 || isVerifying) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={otp.length < 4 || isVerifying}
                activeOpacity={0.8}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{'Verify Identity'}</Text>
                    <Text style={styles.buttonArrow}>{'→'}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.detailsBox}>
                <Text style={styles.detailsTitle}>{'Why was this triggered?'}</Text>
                <Text style={styles.detailsText}>
                  {'BehaviorEngine detected a significant deviation from your established behavioral baseline. This step-up verification protects your account.'}
                </Text>
              </View>

            </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  // Alert header
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  alertHeaderText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Card
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#EF4444',
    opacity: 0.5,
  },

  // Shield
  shieldBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  shieldIcon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EF4444',
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.65)',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  timerUnit: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: -2,
  },

  demoHint: {
    color: '#6366F1',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },

  // OTP input
  otpContainer: {
    width: '100%',
    marginBottom: 12,
  },
  otpInput: {
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 16,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    letterSpacing: 16,
  },

  // Attempts
  attemptsBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  attemptsText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Verify button
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
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

  // Details
  detailsBox: {
    backgroundColor: 'rgba(9, 13, 22, 0.65)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
  },
  detailsTitle: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailsText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },

  // Success state
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  successIcon: {
    fontSize: 44,
    color: '#10B981',
  },
  successText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Failed state
  failedCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  failedIcon: {
    fontSize: 44,
    color: '#EF4444',
  },
  failedText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  failedSub: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
});