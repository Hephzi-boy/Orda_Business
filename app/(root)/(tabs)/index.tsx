// c:\Users\Lenovo\Desktop\Orda_Business\app\(root)\(tabs)\index.tsx
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface RecentActivityItem {
  id: string;
  type: 'order' | 'new_listing';
  timestamp: Date;
  details: string;
  item_type: string;
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | string;
}

const MAX_RECENT_ACTIVITY = 5;

// --- UI Components ---

const BrandedWelcomeHeader = () => {
  const opacity = useSharedValue(0); // Start with opacity 0

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }), // Fade in over 1 second
        withDelay(23000, withTiming(0, { duration: 1000 })) // Stay visible for 23s, then fade out over 1s
        // Total cycle time for one appearance and disappearance: 1s (in) + 23s (visible) + 1s (out) = 25s
        // It will then immediately start the next cycle (fade in again).
      ),
      -1, // Repeat indefinitely
      false // Do not reverse on repeat
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.brandedHeader, animatedStyle]}>
      <Text style={styles.brandedWelcomeText}>Welcome to Orda Business !!!</Text>
      <Text style={styles.brandedSubHeaderText}>
        Empower your operations, streamline management, and connect with more customers. Orda Business provides the tools you need to thrive in today's competitive market. Let's grow together.
      </Text>
    </Animated.View>
  );
};

const UserWelcomeHeader = ({ username }: { username: string }) => (
  <View style={styles.header}>
    <Text style={styles.welcomeText}>Welcome, {username} 👋</Text>
  </View>
);


const ActivityHeader = () => (
  <Text style={styles.activityTitle}>Recent Activity</Text>
);

const ActivityItem = ({ item }: { item: RecentActivityItem }) => (
  <View style={styles.activityCard}>
    <Text style={styles.activityText}>{item.details}</Text>
    <Text style={styles.timestampText}>{new Date(item.timestamp).toLocaleString()}</Text>
  </View>
);

const ActivityEmpty = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>No recent activity.</Text>
  </View>
);

const ActivityError = ({ message }: { message: string }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

const ActivityLoading = () => (
  <ActivityIndicator size="large" color="#666" style={styles.loading} />
);

const FullScreenLoader = () => (
  <SafeAreaView style={[styles.safeArea, styles.fullScreenLoaderContainer]}>
    <ActivityIndicator size="large" color="#16a34a" />
  </SafeAreaView>
);

const CenteredMessage = ({ text }: { text: string }) => (
  <SafeAreaView style={[styles.safeArea, styles.centeredMessageContainer]}>
    <Text style={styles.centeredMessageText}>{text}</Text>
  </SafeAreaView>
);

const HomeScreen = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ username?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = useCallback(async (): Promise<string | null> => {
    setLoadingUser(true);
    setUserProfile(null);
    setCurrentUser(null);

    try {
      const user = supabase.auth.user(); // ✅ v1 method
      if (user) {
        setCurrentUser(user);
        const { data: profileData, error: profileError } = await supabase
          .from('profile')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          setUserProfile({ username: user.email?.split('@')[0] || 'User' });
        } else {
          setUserProfile(profileData || { username: user.email?.split('@')[0] || 'User' });
        }
        return user.id;
      } else {
        return null;
      }
    } catch (error: any) {
      return null;
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const fetchActivityData = useCallback(async (userIdForActivity: string | null, isRefreshing = false) => {
    if (!isRefreshing) setLoadingActivity(true);
    setErrorActivity(null);

    if (!userIdForActivity) {
      setRecentActivity([]);
      setLoadingActivity(false);
      if (isRefreshing) setRefreshing(false);
      return;
    }

    const activityLimit = MAX_RECENT_ACTIVITY;

    try {
      const [ordersResult, foodResult, drinksResult, roomsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, created_at, item_type, item_name, quantity, status')
          .eq('business_id', userIdForActivity)
          .order('created_at', { ascending: false })
          .limit(activityLimit),
        supabase
          .from('food')
          .select('id, created_at, name')
          .eq('business_id', userIdForActivity)
          .order('created_at', { ascending: false })
          .limit(activityLimit),
        supabase
          .from('drinks')
          .select('id, created_at, name')
          .eq('business_id', userIdForActivity)
          .order('created_at', { ascending: false })
          .limit(activityLimit),
        supabase
          .from('rooms')
          .select('id, created_at, room_type')
          .eq('business_id', userIdForActivity)
          .order('created_at', { ascending: false })
          .limit(activityLimit),
      ]);

      let combinedActivities: RecentActivityItem[] = [];
      let fetchedOrderCount = 0;

      if (ordersResult.error) {
        console.error("Error fetching orders:", ordersResult.error.message);
      } else {
        fetchedOrderCount = ordersResult.data?.length ?? 0;
        combinedActivities = combinedActivities.concat(
          (ordersResult.data || []).map(order => ({
            id: order.id,
            type: 'order',
            timestamp: new Date(order.created_at),
            details: `Order: ${order.quantity || 1}x ${order.item_name || 'item'}`,
            item_type: order.item_type || 'order',
            status: order.status || 'unknown',
          }))
        );
      }

      if (foodResult.error) {
        console.error("Error fetching food:", foodResult.error.message);
      } else {
        combinedActivities = combinedActivities.concat(
          (foodResult.data || []).map(food => ({
            id: food.id,
            type: 'new_listing',
            timestamp: new Date(food.created_at),
            details: `New Food: ${food.name}`,
            item_type: 'food',
          }))
        );
      }

      if (drinksResult.error) {
        console.error("Error fetching drinks:", drinksResult.error.message);
      } else {
        combinedActivities = combinedActivities.concat(
          (drinksResult.data || []).map(drink => ({
            id: drink.id,
            type: 'new_listing',
            timestamp: new Date(drink.created_at),
            details: `New Drink: ${drink.name}`,
            item_type: 'drink',
          }))
        );
      }

      if (roomsResult.error) {
        console.error("Error fetching rooms:", roomsResult.error.message);
      } else {
        combinedActivities = combinedActivities.concat(
          (roomsResult.data || []).map(room => ({
            id: room.id,
            type: 'new_listing',
            timestamp: new Date(room.created_at),
            details: `New Room: ${room.room_type}`,
            item_type: 'room',
          }))
        );
      }

      combinedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const finalActivities = combinedActivities.slice(0, activityLimit);
      setRecentActivity(finalActivities);

    } catch (error: any) {
      setErrorActivity("Error loading activity.");
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const userId = await fetchUserData();
      // fetchActivityData will be called with userId (or null)
      // and will handle its own loading state.
      // setLoadingActivity(true) is called at the start of fetchActivityData
      fetchActivityData(userId, false);
    };
    init();
  }, [fetchUserData, fetchActivityData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const userIdToRefresh = currentUser?.id || (await fetchUserData());
    if (userIdToRefresh) {
      await fetchActivityData(userIdToRefresh, true);
    } else {
      setRecentActivity([]); // Clear activity if no user
      setRefreshing(false); // Ensure refreshing stops
    }
  }, [currentUser, fetchUserData, fetchActivityData]);

  if (loadingUser) {
    return <FullScreenLoader />;
  }

  if (!currentUser) {
    return <CenteredMessage text="No user logged in. Please sign in." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={recentActivity}
        renderItem={({ item }) => <ActivityItem item={item} />}
        keyExtractor={(item, index) => `${item.id}-${item.type}-${index}-${item.timestamp.toISOString()}`}
        ListHeaderComponent={
          <>
            <UserWelcomeHeader username={userProfile?.username || 'User'} />
            <BrandedWelcomeHeader />
            <ActivityHeader />
            {/* --- Added Upgrade Button --- */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/upgradePlanScreen')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Subscription Plan</Text>
            </TouchableOpacity>
            {/* --- End Added Upgrade Button --- */}
          </>
        }
        ListEmptyComponent={
          loadingActivity ? (
            <ActivityLoading />
          ) : errorActivity ? (
            <ActivityError message={errorActivity} />
          ) : (
            <ActivityEmpty />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#16a34a', '#10803a']} // Android colors
            tintColor={'#16a34a'} // iOS color
          />
        }
        contentContainerStyle={styles.listContentContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5', // Light background for the whole screen
  },
  fullScreenLoaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredMessageText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  brandedHeader: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#4B6B48',
    alignItems: 'center', // Center content horizontally
    borderRadius: 30, // Added to make it pill-shaped
    marginBottom: 0, // No margin if it's directly above the next header
  },
  brandedWelcomeText: {
    fontSize: 22, // Slightly smaller than the main welcome
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'WinkySans-Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  brandedSubHeaderText: {
    fontSize: 14,
    color: '#E0E0E0', // Slightly dimmer white for contrast
    fontFamily: 'WinkySans-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#16a34a', // Changed background color here
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35, // Added space below this header
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // Changed text color to white for better contrast
    flex: 1, // Allow text to take available space
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 15,
  },
  profileImagePlaceholder: { // Optional placeholder style
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0', // A light grey placeholder
    marginLeft: 15,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    color: '#34495E',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  activityText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    marginBottom: 6,
  },
  timestampText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 150,
  },
  emptyText: {
    color: '#95A5A6',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 150,
    marginHorizontal: 20,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    textAlign: 'center',
  },
  loading: {
    marginTop: 40,
    paddingVertical: 20,
  },
  // --- Styles for Upgrade Button ---
  upgradeButton: {
    backgroundColor: '#28a745', // A distinct green
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 20, // Space above the button
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
