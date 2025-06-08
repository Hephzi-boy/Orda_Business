import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Order {
  id: string;
  hotel_id: string;
  business_id: string;
  item_id: string;
  item_type: 'food' | 'drink' | 'room' | string; // Allow string for flexibility
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'successful'; // Added 'successful'
  quantity?: number;
  user_id?: string;
  created_at: string;
  item_name?: string;
  total_price?: number;
  customer_name?: string;
  room_number?: string;
}

const ViewOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const orderChannelRef = useRef<any>(null);

  const fetchUserId = useCallback(() => { // Made synchronous as supabase.auth.user() is sync
    setLoading(true);
    const user = supabase.auth.user(); // V1 method: synchronous

    if (!user) {
      Alert.alert('Error', 'User not authenticated.'); // More specific message for v1
      setUserId(null);
      setOrders([]);
      setLoading(false); // Ensure loading stops
      return null;
    }
    // setLoading(false) will be handled by fetchInitialOrders or if this function returns null early
    setUserId(user.id);
    return user.id;
  }, []);

  const fetchInitialOrders = useCallback(async (currentUserId: string | null) => {
    if (!currentUserId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data: hotelsData, error: hotelsError } = await supabase
      .from('hotels')
      .select('id')
      .eq('business_id', currentUserId);

    if (hotelsError) {
      Alert.alert('Error', 'Could not fetch hotels.');
      setOrders([]);
      setLoading(false);
      return;
    }

    const hotelIds = hotelsData.map(h => h.id);

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      Alert.alert('Error', 'Could not fetch orders.');
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders(ordersData || []);
    setLoading(false);
  }, []);

  const setupSubscription = useCallback((currentUserId: string | null) => {
    if (orderChannelRef.current) {
      orderChannelRef.current.unsubscribe(); // V1: Unsubscribe directly from the channel
      orderChannelRef.current = null;
    }

    if (!currentUserId) return;

    const channel = supabase
      .channel('orders-listen')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Order;
          if (newOrder && newOrder.business_id === currentUserId) {
            setOrders(prev => {
              if (prev.find(order => order.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          }
        }
      )
      .subscribe();

    orderChannelRef.current = channel;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const initialize = async () => {
        const id = fetchUserId(); // Call the now synchronous function
        if (isActive && id) {
          await fetchInitialOrders(id);
          setupSubscription(id);
        }
      };
      initialize();

      return () => {
        isActive = false;
        if (orderChannelRef.current) {
          orderChannelRef.current.unsubscribe(); // V1: Unsubscribe directly from the channel
          orderChannelRef.current = null;
        }
      };
    }, [fetchUserId, fetchInitialOrders, setupSubscription])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const id = fetchUserId(); // Call the now synchronous function
    if (id) {
      await fetchInitialOrders(id);
    }
    setRefreshing(false);
  };

  const confirmOrderPayment = async (orderId: string) => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID is required');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      'Are you sure you want to mark this order as payment successful?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // ✅ Step 1: Verify if order exists
              const { data: orders, error: fetchError } = await supabase
                .from('orders')
                .select('id') // just check for ID
                .eq('id', orderId)
                .limit(1);

              if (fetchError) {
                Alert.alert('Fetch Error', fetchError.message);
                return;
              }

              if (!orders || orders.length === 0) {
                Alert.alert('Order Not Found', 'No order found with this ID');
                return;
              }

              // ✅ Step 2: Update the order
              const { data: updatedOrders, error: updateError } = await supabase
                .from('orders')
                .update({ status: 'successful' })
                .eq('id', orderId)
                .select(); // returns an array

              if (updateError) {
                Alert.alert('Update Error', updateError.message);
                return;
              }

              if (!updatedOrders || updatedOrders.length === 0) {
                Alert.alert('Update Failed', 'No order was updated. Check the order ID.');
                return;
              }

              // ✅ Step 3: Success!
              Alert.alert('Success', 'Order payment marked as successful!');
              setOrders(prevOrders =>
                prevOrders.map(o => (o.id === orderId ? { ...o, status: 'successful' } : o))
              );
            } catch (err: any) {
              Alert.alert('Unexpected Error', err.message || 'Something went wrong');
            }
          },
        },
      ]
    );
  };


  const handleOrderPress = (order: Order) => {
    const alertButtons: any[] = [{ text: 'OK', style: 'cancel' }];
    if (order.status === 'pending') { // Only show confirm payment if status is pending
      alertButtons.unshift({ text: 'Confirm Payment', onPress: () => confirmOrderPayment(order.id) });
    }
    Alert.alert(
      `Order Details (#${order.id.substring(0, 6)}...)`,
      `Status: ${order.status}\nType: ${order.item_type}\nItem ID: ${order.item_id}\nQuantity: ${order.quantity}\nTotal: ₦${order.total_price}`,
      alertButtons
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity onPress={() => handleOrderPress(item)} className="bg-white p-4 mb-3 rounded-lg shadow border border-gray-200">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-lg font-semibold text-gray-800">Order #{item.id.substring(0, 6)}...</Text>
        <Text className="text-sm capitalize text-gray-600">{item.status}</Text>
      </View>
      <Text className="text-gray-600">Type: {item.item_type}</Text>
      <Text className="text-gray-600">Item ID: {item.item_id}</Text>
      {item.quantity && <Text className="text-gray-600">Qty: {item.quantity}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#E4EBE5]">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text className="text-center text-gray-500">No orders found.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default ViewOrders;
