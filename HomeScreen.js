import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, ScrollView,
  SafeAreaView, Animated,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';

const calculateDuressScore = (variance, contextFactors) => {
  let score = 0;
  if (variance > 1.2) score += 0.40;
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) score += 0.15;
  if (contextFactors?.isNewBeneficiary) score += 0.20;
  if (contextFactors?.isLargeAmount) score += 0.25;
  console.log('Duress gating score:', score.toFixed(2));
  return score;
};

const getDisplayName = (userId) => {
  const lower = String(userId).toLowerCase();
  if (lower === 'shashank' || lower === '190204') return 'Shashank';
  if (lower === 'shashwath' || lower === '4405') return 'Shashwath';
  if (lower === 'vincent' || lower === '120305') return 'Vincent';
  if (lower === 'shashanks' || lower === '070604') return 'Shashanks';
  if (lower === 'dhyan' || lower === '221104') return 'Dhyan';
  if (lower === 'dishan' || lower === '91104') return 'Dishan';
  if (lower === 'vijay' || lower === '120706') return 'Vijay';
  if (lower === 'pavan' || lower === '190106') return 'Pavan';
  if (lower === 'shetty' || lower === '201004') return 'Shetty';
  if (lower === 'boss' || lower === '290804') return 'Boss';
  
  return userId.charAt(0).toUpperCase() + userId.slice(1);
};

export default function HomeScreen({
  onLogout,
  onDuress,
  onAnomaly,
  lastScore,
  accessibilityMode,
  onToggleAccessibility,
  currentUserId = 'anonymous'
}) {
  const [accelVariance, setAccelVariance] = useState(0);
  const [duressWarning, setDuressWarning] = useState(false);
  const [duressScore, setDuressScore] = useState(0);
  const [balance] = useState('₹ 1,24,500.00');
  const [transactions] = useState([
    { id: 1, name: 'Swiggy', amount: '-₹ 340', date: 'Today, 1:20 PM', type: 'debit', icon: 'S', iconColor: '#FF6B35' },
    { id: 2, name: 'Salary Credit', amount: '+₹ 45,000', date: 'Yesterday', type: 'credit', icon: '$', iconColor: '#00E09E' },
    { id: 3, name: 'Amazon', amount: '-₹ 1,299', date: 'May 7', type: 'debit', icon: 'A', iconColor: '#FFB020' },
    { id: 4, name: 'Netflix', amount: '-₹ 649', date: 'May 6', type: 'debit', icon: 'N', iconColor: '#E50914' },
    { id: 5, name: 'Freelance', amount: '+₹ 12,000', date: 'May 5', type: 'credit', icon: 'F', iconColor: '#6366F1' },
  ]);

  const duressCount = useRef(0);
  const accelSub = useRef(null);
  const duressTimeout = useRef(null);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Accelerometer.setUpdateInterval(500);
    accelSub.current = Accelerometer.addListener(data => {
      const dx = data.x - lastAccel.current.x;
      const dy = data.y - lastAccel.current.y;
      const dz = data.z - lastAccel.current.z;

      lastAccel.current = { x: data.x, y: data.y, z: data.z };

      const dynamicJerk = Math.sqrt(dx * dx + dy * dy + dz * dz);
      setAccelVariance(parseFloat(dynamicJerk.toFixed(3)));

      if (dynamicJerk > 1.2) {
        duressCount.current += 1;
        if (duressCount.current >= 3) {
          const gatingScore = calculateDuressScore(dynamicJerk, {
            isNewBeneficiary: false,
            isLargeAmount: false,
          });
          setDuressScore(gatingScore);
          if (gatingScore >= 0.4) {
            setDuressWarning(true);
            onDuress && onDuress(dynamicJerk);
            // Auto-dismiss after 8 seconds
            clearTimeout(duressTimeout.current);
            duressTimeout.current = setTimeout(() => setDuressWarning(false), 8000);
          }
          duressCount.current = 0;
        }
      } else {
        duressCount.current = Math.max(0, duressCount.current - 1);
      }
    });

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      accelSub.current?.remove();
      clearTimeout(duressTimeout.current);
    };
  }, []);

  const handleTransfer = () => {
    onAnomaly && onAnomaly('transfer');
  };

  const getTrustColor = () => {
    if (lastScore === null) return '#6366F1';
    if (lastScore < 0.3) return '#10B981';
    if (lastScore < 0.8) return '#F59E0B';
    return '#EF4444';
  };

  const getTrustText = () => {
    if (lastScore === null) return 'Analyzing behavior...';
    if (lastScore < 0.3) return 'Identity verified — all clear';
    if (lastScore < 0.8) return 'Slight deviation — monitoring';
    return 'High risk — verification required';
  };

  const getTrustPercentage = () => {
    if (lastScore === null) return 0;
    return Math.round((1 - lastScore) * 100);
  };

  const isDuressActive = accelVariance > 1.2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeIn,
          transform: [{ translateY: slideUp }],
        }}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{
                (() => {
                  const h = new Date().getHours();
                  if (h < 12) return 'Good morning';
                  if (h < 17) return 'Good afternoon';
                  return 'Good evening';
                })()
              }</Text>
              <Text style={styles.userName}>{'Welcome Back, ' + getDisplayName(currentUserId)}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>{'Logout'}</Text>
            </TouchableOpacity>
          </View>

          {/* DuressSense Bar */}
          <View style={[
            styles.senseBar,
            isDuressActive ? styles.senseBarAlert : styles.senseBarNormal
          ]}>
            <View style={styles.senseLeft}>
              <Animated.View style={[
                styles.senseDot,
                {
                  backgroundColor: isDuressActive ? '#EF4444' : '#10B981',
                  transform: [{ scale: isDuressActive ? pulseAnim : 1 }],
                }
              ]} />
              <Text style={[
                styles.senseLabel,
                { color: isDuressActive ? '#FCA5A5' : '#6EE7B7' }
              ]}>
                {isDuressActive ? 'DuressSense: Alert' : 'DuressSense: Active'}
              </Text>
            </View>
            <View style={[
              styles.senseValueBox,
              { backgroundColor: isDuressActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)' }
            ]}>
              <Text style={[
                styles.senseValue,
                { color: isDuressActive ? '#EF4444' : '#10B981' }
              ]}>{accelVariance}</Text>
            </View>
          </View>

          {/* Duress Warning */}
          {duressWarning && (
            <View style={styles.duressAlert}>
              <View style={styles.duressAlertHeader}>
                <View style={styles.duressAlertDot} />
                <Text style={styles.duressAlertText}>{'SILENT ALERT ACTIVATED'}</Text>
              </View>
              <Text style={styles.duressAlertSub}>
                {`Threat score: ${(duressScore * 100).toFixed(0)}% — Fraud team notified. Transaction held in escrow.`}
              </Text>
            </View>
          )}

          {/* Trust Score Card */}
          <View style={styles.trustCard}>
            <View style={styles.trustTop}>
              <View>
                <Text style={styles.trustLabel}>{'Session Trust'}</Text>
                <Text style={styles.trustSub}>{getTrustText()}</Text>
              </View>
              <View style={[styles.trustScoreCircle, { borderColor: getTrustColor() }]}>
                <Text style={[styles.trustValue, { color: getTrustColor() }]}>
                  {lastScore !== null ? `${getTrustPercentage()}%` : '--'}
                </Text>
              </View>
            </View>
            <View style={styles.trustBarBg}>
              <Animated.View style={{
                ...styles.trustBarFill,
                width: lastScore !== null
                  ? `${getTrustPercentage()}%`
                  : '0%',
                backgroundColor: getTrustColor(),
              }} />
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <Text style={styles.balanceLabel}>{'Total Balance'}</Text>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.accountNum}>{'BehaviorVault •••• 4521'}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleTransfer} activeOpacity={0.7}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIconText}>{'↑'}</Text>
                </View>
                <Text style={styles.actionLabel}>{'Transfer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIconText}>{'↓'}</Text>
                </View>
                <Text style={styles.actionLabel}>{'Deposit'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIconText}>{'☰'}</Text>
                </View>
                <Text style={styles.actionLabel}>{'History'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Row */}
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Animated.View style={[
                styles.statusDotGreen,
                { transform: [{ scale: pulseAnim }] }
              ]} />
              <Text style={styles.statusText}>{'BehaviorEngine Active'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.accessBtn,
                accessibilityMode && styles.accessBtnActive
              ]}
              onPress={onToggleAccessibility}
              activeOpacity={0.7}
            >
              <Text style={styles.accessLabel}>{'A11Y'}</Text>
              <Text style={[
                styles.accessText,
                accessibilityMode && styles.accessTextActive
              ]}>
                {accessibilityMode ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions */}
          <View style={styles.txHeader}>
            <Text style={styles.sectionTitle}>{'Recent Transactions'}</Text>
            <Text style={styles.seeAll}>{'See all'}</Text>
          </View>

          {transactions.map((tx, index) => (
            <Animated.View key={tx.id} style={[
              styles.txCard,
              { opacity: fadeIn }
            ]}>
              <View style={styles.txLeft}>
                <View style={[
                  styles.txIcon,
                  { backgroundColor: `${tx.iconColor}15` }
                ]}>
                  <Text style={[styles.txIconText, { color: tx.iconColor }]}>{tx.icon}</Text>
                </View>
                <View>
                  <Text style={styles.txName}>{tx.name}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
              </View>
              <Text style={[
                styles.txAmount,
                tx.type === 'credit' ? styles.txAmountCredit : styles.txAmountDebit
              ]}>
                {tx.amount}
              </Text>
            </Animated.View>
          ))}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D16' },
  container: { flex: 1 },
  content: { padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  // DuressSense Bar
  senseBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  senseBarNormal: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  senseBarAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  senseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  senseLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  senseValueBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  senseValue: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Duress Alert
  duressAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  duressAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  duressAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  duressAlertText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  duressAlertSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },

  // Trust Score
  trustCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  trustTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trustLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  trustSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  trustScoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.65)',
  },
  trustValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  trustBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Balance Card
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: '#064E3B',
    position: 'relative',
  },
  balanceGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  accountNum: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  actionIconText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  actionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  accessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    gap: 4,
  },
  accessBtnActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  accessLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  accessText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  accessTextActive: {
    color: '#10B981',
  },

  // Transactions
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
  txCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  txName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountCredit: { color: '#10B981' },
  txAmountDebit: { color: '#EF4444' },
});