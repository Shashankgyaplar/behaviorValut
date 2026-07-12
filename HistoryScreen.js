import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, TextInput,
  ScrollView, SafeAreaView,
  Animated, Modal,
  Platform, StatusBar
} from 'react-native';

const ALL_TRANSACTIONS = [
  { id: 1, name: 'Swiggy', amount: -340, displayAmount: '-₹ 340', date: 'Today, 1:20 PM', type: 'debit', icon: 'S', iconColor: '#FF6B35', category: 'Food & Dining', txId: 'BV-7A3F01' },
  { id: 2, name: 'Salary Credit', amount: 45000, displayAmount: '+₹ 45,000', date: 'Yesterday', type: 'credit', icon: '$', iconColor: '#00E09E', category: 'Income', txId: 'BV-6B2E02' },
  { id: 3, name: 'Amazon', amount: -1299, displayAmount: '-₹ 1,299', date: 'Jul 7', type: 'debit', icon: 'A', iconColor: '#FFB020', category: 'Shopping', txId: 'BV-5C1D03' },
  { id: 4, name: 'Netflix', amount: -649, displayAmount: '-₹ 649', date: 'Jul 6', type: 'debit', icon: 'N', iconColor: '#E50914', category: 'Entertainment', txId: 'BV-4D0C04' },
  { id: 5, name: 'Freelance', amount: 12000, displayAmount: '+₹ 12,000', date: 'Jul 5', type: 'credit', icon: 'F', iconColor: '#6366F1', category: 'Income', txId: 'BV-3E9B05' },
  { id: 6, name: 'Uber', amount: -245, displayAmount: '-₹ 245', date: 'Jul 4', type: 'debit', icon: 'U', iconColor: '#000000', category: 'Transport', txId: 'BV-2F8A06' },
  { id: 7, name: 'Zomato', amount: -520, displayAmount: '-₹ 520', date: 'Jul 3', type: 'debit', icon: 'Z', iconColor: '#E23744', category: 'Food & Dining', txId: 'BV-1G7907' },
  { id: 8, name: 'Electricity Bill', amount: -1850, displayAmount: '-₹ 1,850', date: 'Jul 2', type: 'debit', icon: 'E', iconColor: '#F59E0B', category: 'Utilities', txId: 'BV-0H6808' },
  { id: 9, name: 'GPay Transfer', amount: 5000, displayAmount: '+₹ 5,000', date: 'Jul 1', type: 'credit', icon: 'G', iconColor: '#4285F4', category: 'Transfer', txId: 'BV-9I5709' },
  { id: 10, name: 'Flipkart', amount: -3499, displayAmount: '-₹ 3,499', date: 'Jun 30', type: 'debit', icon: 'F', iconColor: '#2874F0', category: 'Shopping', txId: 'BV-8J4610' },
  { id: 11, name: 'Spotify', amount: -119, displayAmount: '-₹ 119', date: 'Jun 28', type: 'debit', icon: 'S', iconColor: '#1DB954', category: 'Entertainment', txId: 'BV-7K3511' },
  { id: 12, name: 'Rent Received', amount: 15000, displayAmount: '+₹ 15,000', date: 'Jun 25', type: 'credit', icon: 'R', iconColor: '#10B981', category: 'Income', txId: 'BV-6L2412' },
  { id: 13, name: 'Myntra', amount: -2199, displayAmount: '-₹ 2,199', date: 'Jun 22', type: 'debit', icon: 'M', iconColor: '#FF3F6C', category: 'Shopping', txId: 'BV-5M1313' },
  { id: 14, name: 'Mobile Recharge', amount: -399, displayAmount: '-₹ 399', date: 'Jun 20', type: 'debit', icon: 'M', iconColor: '#7C3AED', category: 'Utilities', txId: 'BV-4N0214' },
  { id: 15, name: 'Dividend', amount: 2500, displayAmount: '+₹ 2,500', date: 'Jun 18', type: 'credit', icon: 'D', iconColor: '#059669', category: 'Investment', txId: 'BV-3O9115' },
  { id: 16, name: 'Dominos', amount: -450, displayAmount: '-₹ 450', date: 'Jun 15', type: 'debit', icon: 'D', iconColor: '#006491', category: 'Food & Dining', txId: 'BV-2P8016' },
];

export default function HistoryScreen({ onBack, handleKeyPress }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Filter & search
  const filteredTx = ALL_TRANSACTIONS.filter(tx => {
    if (filter === 'credit' && tx.type !== 'credit') return false;
    if (filter === 'debit' && tx.type !== 'debit') return false;
    if (search.trim() && !tx.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Monthly summary
  const totalIn = ALL_TRANSACTIONS.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalOut = ALL_TRANSACTIONS.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backText}>{'< Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{'Transaction History'}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Monthly Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{'Monthly Overview'}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryLabel}>{'Credit'}</Text>
                <Text style={styles.summaryIn}>{`+₹ ${totalIn.toLocaleString('en-IN')}`}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryLabel}>{'Debit'}</Text>
                <Text style={styles.summaryOut}>{`-₹ ${totalOut.toLocaleString('en-IN')}`}</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>{'⌕'}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
              onKeyPress={handleKeyPress}
              autoComplete="off"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Text style={styles.clearBtn}>{'✕'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All' },
              { key: 'credit', label: 'Credits' },
              { key: 'debit', label: 'Debits' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction List */}
          <Text style={styles.resultCount}>{`${filteredTx.length} transactions`}</Text>

          {filteredTx.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txCard}
              onPress={() => setSelectedTx(tx)}
              activeOpacity={0.7}
            >
              <View style={styles.txLeft}>
                <View style={[styles.txIcon, { backgroundColor: `${tx.iconColor}15` }]}>
                  <Text style={[styles.txIconText, { color: tx.iconColor }]}>{tx.icon}</Text>
                </View>
                <View>
                  <Text style={styles.txName}>{tx.name}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
                  {tx.displayAmount}
                </Text>
                <Text style={styles.txCategory}>{tx.category}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {filteredTx.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{'No transactions found'}</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={selectedTx !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedTx && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: `${selectedTx.iconColor}15` }]}>
                  <Text style={[styles.modalIconText, { color: selectedTx.iconColor }]}>{selectedTx.icon}</Text>
                </View>
                <Text style={styles.modalName}>{selectedTx.name}</Text>
                <Text style={[
                  styles.modalAmount,
                  selectedTx.type === 'credit' ? styles.txCredit : styles.txDebit
                ]}>
                  {selectedTx.displayAmount}
                </Text>

                <View style={styles.modalDivider} />

                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>{'Transaction ID'}</Text>
                  <Text style={styles.modalVal}>{selectedTx.txId}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>{'Date'}</Text>
                  <Text style={styles.modalVal}>{selectedTx.date}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>{'Category'}</Text>
                  <Text style={styles.modalVal}>{selectedTx.category}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>{'Type'}</Text>
                  <Text style={styles.modalVal}>{selectedTx.type === 'credit' ? 'Credit' : 'Debit'}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>{'Status'}</Text>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>{'Completed'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setSelectedTx(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>{'Close'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: { padding: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryTitle: { fontSize: 15, color: '#FFFFFF', fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryBlock: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  summaryIn: { fontSize: 18, color: '#10B981', fontWeight: '800' },
  summaryOut: { fontSize: 18, color: '#EF4444', fontWeight: '800' },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  searchIcon: { color: '#64748B', fontSize: 18, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearBtn: { color: '#94A3B8', fontSize: 16, padding: 4 },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  filterText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#6366F1' },

  resultCount: { color: '#64748B', fontSize: 12, fontWeight: '500', marginBottom: 12 },

  // Transaction Card
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
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: { fontSize: 16, fontWeight: '800' },
  txName: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  txDate: { fontSize: 11, color: '#64748B', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txCategory: { fontSize: 10, color: '#64748B', marginTop: 2 },
  txCredit: { color: '#10B981' },
  txDebit: { color: '#EF4444' },

  // Empty
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { color: '#64748B', fontSize: 14, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalIconText: { fontSize: 22, fontWeight: '800' },
  modalName: { fontSize: 18, color: '#FFFFFF', fontWeight: '800', marginBottom: 4 },
  modalAmount: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalKey: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  modalVal: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  completedText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  modalClose: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  modalCloseText: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
});
