import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, TextInput,
  ScrollView, SafeAreaView,
  Animated, KeyboardAvoidingView, Platform,
  StatusBar,
} from 'react-native';

export default function DepositScreen({ onBack, handleKeyPress }) {
  const [amount, setAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0.3)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRequest = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setShowSuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(() => onBack(), 3000);
  };

  const MOCK_UPI = 'behaviorvault@upi';

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Animated.View style={[
            styles.successCard,
            { transform: [{ scale: successScale }], opacity: successOpacity }
          ]}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>{'↓'}</Text>
            </View>
            <Text style={styles.successTitle}>{'Request Sent'}</Text>
            <Text style={styles.successAmount}>{`₹ ${parseFloat(amount).toLocaleString('en-IN')}`}</Text>
            <Text style={styles.successSub}>{'Payment request shared via UPI'}</Text>
            <View style={styles.successDivider} />
            <Text style={styles.successUpi}>{MOCK_UPI}</Text>
            <Text style={styles.successNote}>{'You will be notified when the payment arrives'}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
                <Text style={styles.backText}>{'< Back'}</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{'Deposit'}</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* UPI Card */}
            <View style={styles.upiCard}>
              <View style={styles.upiGlow} />
              <Text style={styles.upiLabel}>{'Your UPI ID'}</Text>
              <Text style={styles.upiId}>{MOCK_UPI}</Text>
              <Text style={styles.upiHint}>{'Share this ID to receive payments'}</Text>
            </View>

            {/* Amount Input */}
            <View style={styles.card}>
              <View style={styles.cardGlow} />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{'REQUEST AMOUNT'}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currencyPrefix}>{'₹'}</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    value={amount}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                    onKeyPress={handleKeyPress}
                    keyboardType="numeric"
                    autoComplete="off"
                  />
                </View>
              </View>

              {/* Quick Amount Pills */}
              <Text style={styles.quickLabel}>{'QUICK SELECT'}</Text>
              <View style={styles.pillRow}>
                {[500, 1000, 5000, 10000].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.pill, amount === String(val) && styles.pillActive]}
                    onPress={() => setAmount(String(val))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, amount === String(val) && styles.pillTextActive]}>
                      {`₹${val.toLocaleString('en-IN')}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Card */}
            {amount && parseFloat(amount) > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>{'Request Amount'}</Text>
                  <Text style={styles.infoVal}>{`₹ ${parseFloat(amount).toLocaleString('en-IN')}`}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>{'Receive via'}</Text>
                  <Text style={styles.infoValUpi}>{'UPI'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>{'Status'}</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{'Pending'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Request Button */}
            <TouchableOpacity
              style={[styles.requestBtn, (!amount || parseFloat(amount) <= 0) && styles.requestBtnDisabled]}
              onPress={handleRequest}
              disabled={!amount || parseFloat(amount) <= 0}
              activeOpacity={0.8}
            >
              <Text style={styles.requestBtnText}>{'Request Money'}</Text>
              <Text style={styles.requestBtnArrow}>{'↓'}</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>{'Behavioral monitoring active on this screen'}</Text>

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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  // UPI Card
  upiCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#064E3B',
    position: 'relative',
  },
  upiGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  upiLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: 8 },
  upiId: { fontSize: 22, color: '#FFFFFF', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  upiHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  // Card
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
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

  // Input
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingLeft: 16,
  },
  currencyPrefix: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  // Pills
  quickLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  pillText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#10B981' },

  // Info Card
  infoCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoKey: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  infoVal: { color: '#10B981', fontSize: 15, fontWeight: '800' },
  infoValUpi: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  pendingText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },

  // Request Button
  requestBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requestBtnDisabled: { backgroundColor: 'rgba(16, 185, 129, 0.25)' },
  requestBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  requestBtnArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  hint: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    width: '100%',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  successIcon: { color: '#10B981', fontSize: 28, fontWeight: '800' },
  successTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  successAmount: { color: '#10B981', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  successSub: { color: '#94A3B8', fontSize: 13, fontWeight: '500', marginBottom: 16 },
  successDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  successUpi: { color: '#6366F1', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  successNote: { color: '#64748B', fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
