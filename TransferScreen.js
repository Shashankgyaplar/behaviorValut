import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, TextInput,
  ScrollView, SafeAreaView,
  Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';

export default function TransferScreen({ onBack, onSendMoney, handleKeyPress }) {
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [isNewBeneficiary, setIsNewBeneficiary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const playSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleSend = async () => {
    if (!beneficiary || !amount || isProcessing) return;
    setIsProcessing(true);

    const allowed = await onSendMoney({
      beneficiary,
      amount: parseFloat(amount),
      isNewBeneficiary,
    });

    if (allowed) {
      setIsProcessing(false);
      playSuccessAnimation();
      setTimeout(() => {
        onBack();
      }, 3000);
    }
    // If not allowed, App.js triggers OTP — this component unmounts
  };

  const canSend = beneficiary.trim().length > 0 && amount.trim().length > 0 && parseFloat(amount) > 0;

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Animated.View style={[
            styles.successCard,
            { transform: [{ scale: successScale }], opacity: successOpacity }
          ]}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>{'✓'}</Text>
            </View>
            <Text style={styles.successTitle}>{'Transfer Successful'}</Text>
            <Text style={styles.successAmount}>{`₹ ${parseFloat(amount).toLocaleString('en-IN')}`}</Text>
            <Text style={styles.successTo}>{`to ${beneficiary}`}</Text>
            <View style={styles.successDivider} />
            <Text style={styles.successTxId}>{`TXN-${Date.now().toString(36).toUpperCase()}`}</Text>
            <Text style={styles.successNote}>{'Behavioral identity verified'}</Text>
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
              <Text style={styles.headerTitle}>{'Send Money'}</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Beneficiary Input */}
            <View style={styles.card}>
              <View style={styles.cardGlow} />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{'BENEFICIARY NAME'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter recipient name"
                  placeholderTextColor="#64748B"
                  value={beneficiary}
                  onChangeText={setBeneficiary}
                  onKeyPress={handleKeyPress}
                  autoComplete="off"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{'AMOUNT'}</Text>
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
              <View style={styles.pillRow}>
                {[500, 1000, 2000, 5000].map((val) => (
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

              {/* New Beneficiary Toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsNewBeneficiary(prev => !prev)}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleBox, isNewBeneficiary && styles.toggleBoxActive]}>
                  {isNewBeneficiary && <Text style={styles.toggleCheck}>{'✓'}</Text>}
                </View>
                <Text style={styles.toggleLabel}>{'New beneficiary (first-time transfer)'}</Text>
              </TouchableOpacity>
            </View>

            {/* Summary Card */}
            {canSend && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{'Transfer Summary'}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{'To'}</Text>
                  <Text style={styles.summaryVal}>{beneficiary}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{'Amount'}</Text>
                  <Text style={styles.summaryValHighlight}>{`₹ ${parseFloat(amount).toLocaleString('en-IN')}`}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{'Type'}</Text>
                  <Text style={styles.summaryVal}>{isNewBeneficiary ? 'New Beneficiary' : 'Existing Beneficiary'}</Text>
                </View>
                {isNewBeneficiary && (
                  <View style={styles.newBenWarning}>
                    <Text style={styles.newBenWarningText}>{'New beneficiary — additional behavioral verification will apply'}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendBtn, (!canSend || isProcessing) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSend || isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>{'Send Money'}</Text>
                  <Text style={styles.sendBtnArrow}>{'→'}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>{'Protected by continuous behavioral verification'}</Text>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090D16' },
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
    backgroundColor: '#6366F1',
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
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  pillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  pillText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#6366F1' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  toggleCheck: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  toggleLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryKey: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  summaryVal: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  summaryValHighlight: { color: '#10B981', fontSize: 15, fontWeight: '800' },
  newBenWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  newBenWarningText: { color: '#F59E0B', fontSize: 11, fontWeight: '500' },

  // Send Button
  sendBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(99, 102, 241, 0.25)' },
  sendBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sendBtnArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

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
  successIcon: { color: '#10B981', fontSize: 32, fontWeight: '800' },
  successTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  successAmount: { color: '#10B981', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  successTo: { color: '#94A3B8', fontSize: 14, fontWeight: '500', marginBottom: 16 },
  successDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  successTxId: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  successNote: { color: '#10B981', fontSize: 11, fontWeight: '500' },
});
