// app/(root)/(tabs)/StatisticsSales.tsx
import OrdaLogo from '@/assets/images/OrdaLogo.png'; // <-- Import the OrdaLogo
import { supabase } from '@/lib/supabase'; // Ensure this path is correct
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- Types ---
interface Order {
    id: string;
    hotel_id: string;
    business_id: string;
    item_id: string;
    item_type: 'food' | 'drink' | 'room' | string; // Allow string for flexibility
    quantity: number;
    created_at: string;
    // Add item_name if it's directly in orders, otherwise we fetch it
}

interface ItemInfo {
    id: string;
    name: string;
    type: 'food' | 'drink' | 'room';
}

interface MostSoldInfo {
    name: string | null;
    count: number;
}

// --- Component ---
export default function StatisticsSalesScreen() {
    const [userId, setUserId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [itemLookup, setItemLookup] = useState<Record<string, string>>({}); // Map item_id to name
    const [mostSoldProductInfo, setMostSoldProductInfo] = useState<MostSoldInfo>({ name: null, count: 0 });
    const [salesToday, setSalesToday] = useState(0);
    const [salesWeek, setSalesWeek] = useState(0);
    const [salesMonth, setSalesMonth] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // --- Fetch User ID ---
    const fetchUserId = useCallback(() => { // Made synchronous
        try {
            const user = supabase.auth.user(); // V1 method: synchronous
            if (user) {
                setUserId(user.id);
                return user.id;
            } else {
                setError("Could not find logged-in user.");
                setUserId(null);
                // No explicit error to throw for "no user" with supabase.auth.user()
                // The function will return null as intended.
                return null;
            }
        } catch (err: any) {
            console.error('❌ Error fetching user ID:', err);
            setError(err.message || 'Failed to get user information.');
            setUserId(null);
            return null;
        }
    }, []); // Dependencies remain the same

    // --- Fetch Stats Data ---
    const fetchStatsData = useCallback(async (currentUserId: string | null, isRefresh = false) => {
        if (!currentUserId) {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
            setOrders([]);
            setError("User not available.");
            return;
        }

        if (!isRefresh) setLoading(true);
        setError(null);
        setOrders([]); // Clear previous orders
        setItemLookup({}); // Clear previous lookup

        try {
            // 1. Fetch Hotel IDs for the user
            const { data: hotelsData, error: hotelsError } = await supabase
                .from('hotels')
                .select('id')
                .eq('business_id', currentUserId);

            if (hotelsError) throw new Error(`Failed to fetch hotel IDs: ${hotelsError.message}`);
            const hotelIds = hotelsData?.map(hotel => hotel.id) || [];

            if (hotelIds.length === 0) {
                console.log("No hotels found for this user.");
                // Set sales to 0, no need to fetch orders/items
                setSalesToday(0);
                setSalesWeek(0);
                setSalesMonth(0);
                setMostSoldProductInfo({ name: null, count: 0 });
                setLoading(false);
                if (isRefresh) setRefreshing(false);
                return;
            }
            console.log("Fetching data for hotel IDs:", hotelIds);

            // 2. Fetch Orders and Items concurrently
            const [ordersResult, foodResult, drinksResult, roomsResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('id, item_id, item_type, quantity, created_at') // Select necessary fields
                    .in('hotel_id', hotelIds)
                    .order('created_at', { ascending: false }), // Fetch all for calculation, sort later if needed
                supabase.from('food').select('id, name').in('hotel_id', hotelIds),
                supabase.from('drinks').select('id, name').in('hotel_id', hotelIds),
                supabase.from('rooms').select('id, room_type').in('hotel_id', hotelIds), // Use room_type as name
            ]);

            // Check for critical errors
            if (ordersResult.error) throw new Error(`Failed to fetch orders: ${ordersResult.error.message}`);
            // Log non-critical item fetch errors but continue
            if (foodResult.error) console.warn("Error fetching food items:", foodResult.error.message);
            if (drinksResult.error) console.warn("Error fetching drink items:", drinksResult.error.message);
            if (roomsResult.error) console.warn("Error fetching room items:", roomsResult.error.message);

            const fetchedOrders = ordersResult.data || [];
            setOrders(fetchedOrders);

            // 3. Create Item Name Lookup Map
            const newItemLookup: Record<string, string> = {};
            (foodResult.data || []).forEach(item => { newItemLookup[item.id] = item.name; });
            (drinksResult.data || []).forEach(item => { newItemLookup[item.id] = item.name; });
            (roomsResult.data || []).forEach(item => { newItemLookup[item.id] = item.room_type; });
            setItemLookup(newItemLookup);

            // 4. Perform Calculations
            calculateSales(fetchedOrders);
            findMostSoldProduct(fetchedOrders, newItemLookup);

        } catch (err: any) {
            console.error('❌ Error fetching statistics data:', err);
            setError(err.message || 'Could not load statistics.');
            // Reset stats on error
            setSalesToday(0);
            setSalesWeek(0);
            setSalesMonth(0);
            setMostSoldProductInfo({ name: null, count: 0 });
        } finally {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
        }
    }, []); // Dependencies: calculateSales, findMostSoldProduct (implicitly used)

    // --- Calculations ---
    const calculateSales = (currentOrders: Order[]) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0); // Start of the day
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Adjust for week start (e.g., Monday)

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0); // Start of the day

        let todaySalesCount = 0;
        let weekSalesCount = 0;
        let monthSalesCount = 0;

        currentOrders.forEach((order) => {
            try {
                const orderDate = new Date(order.created_at);
                const orderDateStr = order.created_at.split('T')[0]; // More reliable date comparison

                // Check if quantity is valid
                const quantity = typeof order.quantity === 'number' && !isNaN(order.quantity) ? order.quantity : 0;

                if (orderDateStr === todayStr) {
                    todaySalesCount += quantity;
                }

                if (orderDate >= startOfWeek) {
                    weekSalesCount += quantity;
                }

                if (orderDate >= startOfMonth) {
                    monthSalesCount += quantity;
                }
            } catch (dateError) {
                console.error(`Error processing date for order ${order.id}:`, order.created_at, dateError);
            }
        });

        setSalesToday(todaySalesCount);
        setSalesWeek(weekSalesCount);
        setSalesMonth(monthSalesCount);
    };

    const findMostSoldProduct = (currentOrders: Order[], currentItemLookup: Record<string, string>) => {
        const countMap: { [itemId: string]: number } = {};

        currentOrders.forEach((order) => {
            if (order.item_id) {
                const quantity = typeof order.quantity === 'number' && !isNaN(order.quantity) ? order.quantity : 0;
                countMap[order.item_id] = (countMap[order.item_id] || 0) + quantity;
            }
        });

        if (Object.keys(countMap).length === 0) {
            setMostSoldProductInfo({ name: null, count: 0 });
            return;
        }

        // Find the entry (itemId, count) with the highest count
        const mostSoldEntry = Object.entries(countMap).reduce(
            (max, entry) => (entry[1] > max[1] ? entry : max),
            ['', 0] // Initial value: [itemId, count]
        );

        const mostSoldItemId = mostSoldEntry[0];
        const mostSoldCount = mostSoldEntry[1];
        const mostSoldName = currentItemLookup[mostSoldItemId] || 'Unknown Item'; // Get name from lookup

        setMostSoldProductInfo({ name: mostSoldName, count: mostSoldCount });
    };

    // --- Effects ---
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            console.log("Stats screen focused");

            const initialize = async () => {
                const fetchedUserId = fetchUserId(); // Call the now synchronous function
                if (isActive && fetchedUserId) {
                    await fetchStatsData(fetchedUserId);
                } else if (isActive) {
                    // Handle case where user fetch failed but component is active
                    setLoading(false);
                    setRefreshing(false);
                }
            };

            initialize();

            return () => {
                isActive = false;
                console.log("Stats screen blurred");
            };
        }, [fetchUserId, fetchStatsData]) // Add dependencies
    );

    // --- Pull-to-Refresh Handler ---
    const onRefresh = useCallback(async () => {
        console.log("Refreshing stats...");
        setRefreshing(true);
        // Re-fetch user ID in case it changed (though unlikely in tabs)
        const fetchedUserId = fetchUserId(); // Call the now synchronous function
        await fetchStatsData(fetchedUserId, true); // Pass true for refreshing
        // setRefreshing(false) is handled in fetchStatsData's finally block
    }, [fetchUserId, fetchStatsData]);

    // --- Render Logic ---
    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#16a34a" />
                    <Text style={styles.loadingText}>Loading statistics...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <TouchableOpacity onPress={() => fetchStatsData(userId)} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <>
                <View style={styles.card}>
                    <Text style={styles.label}>Sales Today:</Text>
                    <Text style={styles.value}>{salesToday}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Sales This Week:</Text>
                    <Text style={styles.value}>{salesWeek}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Sales This Month:</Text>
                    <Text style={styles.value}>{salesMonth}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Most Sold Item:</Text>
                    <Text style={styles.value}>
                        {mostSoldProductInfo.name ? `${mostSoldProductInfo.name} (${mostSoldProductInfo.count})` : 'N/A'}
                    </Text>
                </View>

                {/* Placeholder for Inventory Section */}
                <View style={[styles.card, styles.placeholderCard]}>
                    <Text style={styles.label}>Inventory Status:</Text>
                    <Text style={styles.placeholderText}>
                        (Inventory, Restock, Max Level data coming soon...)
                    </Text>
                </View>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />
                }
            >
                {/* --- MODIFIED: Added OrdaLogo and removed emoji --- */}
                <View style={styles.headerContainer}>
                    <Image
                        source={OrdaLogo}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.header}>Statistics & Sales</Text>
                </View>
                {/* --- END MODIFICATION --- */}

                {renderContent()}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#E4EBE5', // Match app background
    },
    scrollContainer: {
        padding: 20,
        flexGrow: 1, // Ensure content can scroll if needed
    },
    // --- MODIFIED: Added headerContainer and logo styles ---
    headerContainer: {
        alignItems: 'center', // Center items horizontally
        marginBottom: 25,
    },
    logo: {
        width: 80, // Adjust size as needed
        height: 80, // Adjust size as needed
        marginBottom: 10, // Space between logo and text
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        // Removed marginBottom as it's now on headerContainer
    },
    // --- END MODIFICATION ---
    card: {
        backgroundColor: '#FFFFFF', // White cards
        padding: 18,
        borderRadius: 12,
        marginBottom: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.5,
        elevation: 3,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555', // Dark grey label
        marginBottom: 5,
    },
    value: {
        fontSize: 22,
        fontWeight: '700',
        color: '#16a34a', // Use app's green color for values
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    errorText: {
        color: '#dc3545', // Red for errors
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#16a34a',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    placeholderCard: {
        backgroundColor: '#f0f8ff', // Light blue background for placeholder
        borderWidth: 1,
        borderColor: '#add8e6',
    },
    placeholderText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 5,
    },
});
