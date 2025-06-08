// 📁 app/(root)/(tabs)/manageListing.tsx

import OrdaLogo from '@/assets/images/OrdaLogo.png'; // <-- Import the OrdaLogo
import { supabase } from '@/lib/supabase'; // Ensure correct path
import { useFocusEffect } from 'expo-router'; // To refetch when screen is focused
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image, // <-- Import Image
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// --- Define Interfaces ---
interface Hotel {
  id: string;
  name: string;
  location?: string;
  image_url?: string;
  business_id: string; // Added business_id for delete check
}

interface Food {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  hotel_id: string;
}

interface Drink {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  hotel_id: string;
}

interface Room {
  id: string;
  room_type: string;
  price_per_night: number;
  image_url?: string;
  hotel_id: string;
}
// --- End Interfaces ---

// Define Map types
type FoodMap = Record<string, Food[]>;
type DrinkMap = Record<string, Drink[]>;
type RoomMap = Record<string, Room[]>;

export default function ManageListingScreen() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [foodMap, setFoodMap] = useState<FoodMap>({});
  const [drinkMap, setDrinkMap] = useState<DrinkMap>({});
  const [roomMap, setRoomMap] = useState<RoomMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingHotelId, setDeletingHotelId] = useState<string | null>(null); // State for delete loading

  // --- Fetch User ID ---
  useEffect(() => {
    const fetchUserId = () => { // Removed async as supabase.auth.user() is sync
      try {
        const user = supabase.auth.user()
        if (user) {
          setUserId(user.id);
        } else {
          setError("Could not find logged-in user.");
          setUserId(null);
          setLoading(false);
          setHotels([]);
          setFoodMap({});
          setDrinkMap({});
          setRoomMap({});
        }
      } catch (err: any) {
        console.error('❌ Error fetching user ID:', err);
        setError('Failed to get user information.');
        setUserId(null);
        setLoading(false);
        setHotels([]);
        setFoodMap({});
        setDrinkMap({});
        setRoomMap({});
      }
    };
    fetchUserId();
  }, []);

  // --- Fetch Listings Function ---
  const fetchListings = useCallback(async (isRefreshing = false) => {
    if (!userId) {
      if (!isRefreshing) setLoading(false);
      setHotels([]);
      setFoodMap({});
      setDrinkMap({});
      setRoomMap({});
      return;
    }

    if (!isRefreshing) setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch the IDs of hotels owned by the user
      const { data: hotelIdsData, error: hotelIdsError } = await supabase
        .from('hotels')
        .select('id')
        .eq('business_id', userId); // Ensure this matches your column name

      if (hotelIdsError) throw hotelIdsError;

      const userHotelIds = hotelIdsData?.map(h => h.id) || [];

      if (userHotelIds.length === 0) {
        setHotels([]);
        setFoodMap({});
        setDrinkMap({});
        setRoomMap({});
        return;
      }

      // Step 2: Fetch all hotels and items concurrently
      const [hotelResult, foodResult, drinkResult, roomResult] = await Promise.all([
        supabase.from('hotels').select('*').in('id', userHotelIds),
        supabase.from('food').select('*').in('hotel_id', userHotelIds),
        supabase.from('drinks').select('*').in('hotel_id', userHotelIds),
        supabase.from('rooms').select('*').in('hotel_id', userHotelIds),
      ]);

      // Check for errors
      let fetchErrorMessages: string[] = [];
      if (hotelResult.error) fetchErrorMessages.push(`Hotels: ${hotelResult.error.message}`);
      if (foodResult.error) fetchErrorMessages.push(`Food: ${foodResult.error.message}`);
      if (drinkResult.error) fetchErrorMessages.push(`Drinks: ${drinkResult.error.message}`);
      if (roomResult.error) fetchErrorMessages.push(`Rooms: ${roomResult.error.message}`);

      if (fetchErrorMessages.length > 0) {
        setError(`Failed to fetch listings:\n${fetchErrorMessages.join('\n')}`);
        setHotels(hotelResult.data || []);
        setFoodMap({});
        setDrinkMap({});
        setRoomMap({});
        return;
      }

      // Process data into Maps
      const fetchedHotels = hotelResult.data || [];
      const fetchedFood = foodResult.data || [];
      const fetchedDrinks = drinkResult.data || [];
      const fetchedRooms = roomResult.data || [];

      const newFoodMap: FoodMap = {};
      const newDrinkMap: DrinkMap = {};
      const newRoomMap: RoomMap = {};

      fetchedFood.forEach(item => {
        if (!newFoodMap[item.hotel_id]) newFoodMap[item.hotel_id] = [];
        newFoodMap[item.hotel_id].push(item);
      });
      fetchedDrinks.forEach(item => {
        if (!newDrinkMap[item.hotel_id]) newDrinkMap[item.hotel_id] = [];
        newDrinkMap[item.hotel_id].push(item);
      });
      fetchedRooms.forEach(item => {
        if (!newRoomMap[item.hotel_id]) newRoomMap[item.hotel_id] = [];
        newRoomMap[item.hotel_id].push(item);
      });

      // Update State
      setHotels(fetchedHotels);
      setFoodMap(newFoodMap);
      setDrinkMap(newDrinkMap);
      setRoomMap(newRoomMap);

    } catch (err: any) {
      console.error('❌ Error fetching or processing listings:', err);
      setError(err.message || 'An unexpected error occurred.');
      setHotels([]);
      setFoodMap({});
      setDrinkMap({});
      setRoomMap({});
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [userId]);

  // --- UseFocusEffect ---
  useFocusEffect(
    useCallback(() => {
      console.log("ManageListingScreen focused. Fetching listings...");
      if (userId) {
        fetchListings();
      } else if (!loading && !error) {
          console.log("ManageListingScreen focused, but no userId yet and not loading.");
      }
    }, [userId, fetchListings])
  );

  // --- Pull-to-Refresh Handler ---
  const onRefresh = useCallback(() => {
    console.log("Refreshing listings...");
    setRefreshing(true);
    fetchListings(true);
  }, [fetchListings]);

  // --- NEW: Delete Confirmation ---
  const handleDeleteConfirmation = (hotelId: string, hotelName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete the hotel "${hotelName}" and ALL its associated food, drinks, and rooms? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Deletion cancelled"),
        },
        {
          text: "DELETE",
          onPress: () => handleDeleteHotel(hotelId), // Call the actual delete function
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // --- NEW: Delete Hotel Logic ---
  const handleDeleteHotel = async (hotelId: string) => {
    console.log(`Attempting to delete hotel: ${hotelId}`);
    setDeletingHotelId(hotelId); // Show loading indicator on the specific hotel

    try {
      // --- IMPORTANT: Delete Dependent Items FIRST ---
      const [foodDeleteResult, drinkDeleteResult, roomDeleteResult] = await Promise.all([
        supabase.from('food').delete().eq('hotel_id', hotelId),
        supabase.from('drinks').delete().eq('hotel_id', hotelId),
        supabase.from('rooms').delete().eq('hotel_id', hotelId),
      ]);

      // Check for errors during item deletion
      const itemErrors = [
          foodDeleteResult.error,
          drinkDeleteResult.error,
          roomDeleteResult.error
      ].filter(Boolean);

      if (itemErrors.length > 0) {
          const errorMessages = itemErrors.map(e => e?.message || 'Unknown item deletion error').join('\n');
          throw new Error(`Failed to delete associated items:\n${errorMessages}`);
      }
      console.log(`Associated items deleted for hotel: ${hotelId}`);

      // --- Delete the Hotel Itself ---
      // Ensure RLS policy allows deleting hotels where business_id matches auth.uid()
      const { error: hotelDeleteError } = await supabase
        .from('hotels')
        .delete()
        .eq('id', hotelId)
        .eq('business_id', userId); // Crucial: Ensure user owns the hotel

      if (hotelDeleteError) {
        if (hotelDeleteError.code === '42501') { // Example: RLS violation code
             throw new Error("Permission denied. You might not own this hotel or lack delete permissions.");
        }
        throw hotelDeleteError;
      }

      console.log(`Hotel deleted successfully: ${hotelId}`);

      // --- Optional: Delete Associated Images from Storage ---
      // (Add logic here if needed - requires fetching paths before deletion)

      Alert.alert("Success", "Hotel and associated items deleted successfully.");

      // --- Refresh the List Locally ---
      setHotels(prev => prev.filter(h => h.id !== hotelId));
      setFoodMap(prev => { delete prev[hotelId]; return {...prev}; });
      setDrinkMap(prev => { delete prev[hotelId]; return {...prev}; });
      setRoomMap(prev => { delete prev[hotelId]; return {...prev}; });
      // Optionally trigger a full refetch: fetchListings();

    } catch (error: any) {
      console.error('❌ Error deleting hotel:', error);
      Alert.alert("Deletion Failed", error.message || "Could not delete the hotel.");
    } finally {
      setDeletingHotelId(null); // Stop loading indicator
    }
  };

  // --- Render Helper for Individual Items ---
  const renderListedItem = (item: Food | Drink | Room) => {
    let title = '';
    let priceInfo = '';
    let imageUrl = item.image_url;

    if ('price' in item) { // Food or Drink
      title = item.name;
      priceInfo = `₦${item.price.toFixed(2)}`;
    } else if ('room_type' in item) { // Room
      title = item.room_type;
      priceInfo = `₦${item.price_per_night.toFixed(2)} / night`;
    }

    return (
      <View key={item.id} style={styles.subItemContainer}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.subItemImage} resizeMode="cover" />
        )}
        <View style={styles.subItemTextContainer}>
          <Text style={styles.subItemTitle}>{title}</Text>
          <Text style={styles.subItemSubtitle}>{priceInfo}</Text>
        </View>
        {/* Add Edit/Delete buttons for items later if needed */}
      </View>
    );
  };

  // --- Main Render ---
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading listings...</Text>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Error:</Text>
        <Text style={styles.errorTextDetail}>{error}</Text>
        <TouchableOpacity onPress={() => fetchListings()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />
        }
      >
        {/* --- MODIFIED: Added Logo and changed title --- */}
        <View style={styles.headerContainer}>
            <Image
                source={OrdaLogo}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.pageTitle}>Lists</Text>
        </View>
        {/* --- END MODIFICATION --- */}

        {hotels.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hotels found.</Text>
                <Text style={styles.emptyText}>Create one from the 'Create Hotel' tab!</Text>
            </View>
        )}

        {hotels.map((hotel) => (
          <View key={hotel.id} style={styles.hotelSection}>
            {/* Hotel Header */}
            <View style={styles.hotelHeader}>
                {hotel.image_url && (
                    <Image source={{ uri: hotel.image_url }} style={styles.hotelHeaderImage} resizeMode="cover" />
                )}
                <View style={styles.hotelHeaderTextContainer}>
                    <Text style={styles.hotelName}>{hotel.name}</Text>
                    {hotel.location && <Text style={styles.hotelLocation}>{hotel.location}</Text>}
                </View>
                {/* --- NEW: Delete Button --- */}
                <TouchableOpacity
                  onPress={() => handleDeleteConfirmation(hotel.id, hotel.name)}
                  style={styles.deleteButton}
                  disabled={deletingHotelId === hotel.id} // Disable while deleting this specific hotel
                >
                  {deletingHotelId === hotel.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
                {/* --- END Delete Button --- */}
            </View>

            {/* Food Items */}
            {(foodMap[hotel.id]?.length ?? 0) > 0 && (
              <>
                <Text style={styles.itemTypeTitle}>🍔 Foods</Text>
                {foodMap[hotel.id].map(renderListedItem)}
              </>
            )}

            {/* Drink Items */}
            {(drinkMap[hotel.id]?.length ?? 0) > 0 && (
              <>
                <Text style={styles.itemTypeTitle}>🍹 Drinks</Text>
                {drinkMap[hotel.id].map(renderListedItem)}
              </>
            )}

            {/* Room Items */}
            {(roomMap[hotel.id]?.length ?? 0) > 0 && (
              <>
                <Text style={styles.itemTypeTitle}>🛏️ Rooms</Text>
                {roomMap[hotel.id].map(renderListedItem)}
              </>
            )}

            {/* No items message */}
            {(foodMap[hotel.id]?.length ?? 0) === 0 &&
             (drinkMap[hotel.id]?.length ?? 0) === 0 &&
             (roomMap[hotel.id]?.length ?? 0) === 0 && (
                <Text style={styles.noItemsText}>No items listed for this hotel yet.</Text>
            )}

          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4EBE5', // <-- MODIFIED: Changed background color
  },
  scrollViewContent: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E4EBE5', // <-- MODIFIED: Changed background color
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
      fontSize: 18,
      color: '#dc3545',
      fontWeight: 'bold',
      textAlign: 'center',
  },
  errorTextDetail: {
      fontSize: 14,
      color: '#dc3545',
      textAlign: 'center',
      marginTop: 5,
      marginBottom: 20,
  },
  retryButton: {
      backgroundColor: '#16a34a',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
  },
  retryButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
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
  pageTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#343a40',
      textAlign: 'center',
      // Removed marginBottom as it's now on headerContainer
  },
  // --- END MODIFICATION ---
  hotelSection: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 25,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  hotelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  hotelHeaderImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 10, // Adjusted margin
      backgroundColor: '#e9ecef',
  },
  hotelHeaderTextContainer: {
      flex: 1, // Allow text to take available space
      marginRight: 10, // Add space before the delete button
  },
  hotelName: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#343a40',
  },
  hotelLocation: {
      fontSize: 14,
      color: '#6c757d',
  },
  // --- NEW: Delete Button Styles ---
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dc3545', // Red color for delete
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60, // Ensure minimum width
    height: 35, // Match height roughly
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // --- End Delete Button Styles ---
  itemTypeTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#495057',
    marginTop: 10,
    marginBottom: 8,
  },
  subItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginLeft: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  subItemImage: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#e9ecef',
  },
  subItemTextContainer: {
    flex: 1,
  },
  subItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#495057',
  },
  subItemSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  noItemsText: {
      fontSize: 14,
      color: '#6c757d',
      textAlign: 'center',
      marginTop: 15,
      fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 5,
  },
});
