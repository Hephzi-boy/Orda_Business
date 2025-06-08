import OrdaLogo from '@/assets/images/OrdaLogo.png'; // <-- ADDED: Import OrdaLogo
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // <-- MODIFIED: Added Image and SafeAreaView
import { Paystack } from 'react-native-paystack-webview';

interface Plan {
  name: string;
  price: number; // Price in kobo
  uploadLimit: number;
}

const plans: Plan[] = [
  { name: 'Bronze', price: 1000, uploadLimit: 6},
  { name: 'Gold', price: 5000, uploadLimit: 65 },
  { name: 'Platinum', price: 10000, uploadLimit: 99999 },
];

export default function UpgradePlanScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hotelProfile, setHotelProfile] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaystack, setShowPaystack] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingHotelProfile, setIsLoadingHotelProfile] = useState(false);
  const [hotelProfileError, setHotelProfileError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsLoadingUser(true);
    const user = supabase.auth.user(); // Supabase v1 syntax
    setCurrentUser(user);
    if (!user) {
      Alert.alert("Authentication Error", "You need to be logged in to upgrade your plan.");
      router.replace('/sign-in');
    }
    setIsLoadingUser(false);
  }, [router]);

  useEffect(() => {
    if (!currentUser) {
      setHotelProfile(null);
      setHotelProfileError(null);
      setIsLoadingHotelProfile(false);
      return;
    }

    const fetchHotelProfile = async () => {
      setIsLoadingHotelProfile(true);
      setHotelProfile(null);
      setHotelProfileError(null);
      try {
        const { data: fetchedHotelProfile, error: fetchError } = await supabase
          .from('hotels')
          .select('*')
          // Changed to 'business_id' to link hotels to the authenticated user
          .eq('business_id', currentUser.id)
          .single();

        if (fetchError) {
          console.error("Error fetching hotel profile:", fetchError.message);
          setHotelProfileError(fetchError.message);
        } else {
          setHotelProfile(fetchedHotelProfile);
          console.log("Fetched hotel profile:", fetchedHotelProfile);
        }
      } catch (e: any) {
        console.error("Unexpected error:", e.message);
        setHotelProfileError("Unexpected error fetching hotel profile.");
      } finally {
        setIsLoadingHotelProfile(false);
      }
    };

    fetchHotelProfile(); // ✅ Call the function
  }, [currentUser]);

  const handlePaymentSuccess = async () => {
    if (!hotelProfile || !selectedPlan) {
      Alert.alert("Error", "Hotel profile or plan not loaded.");
      return;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: selectedPlan.name,
        upload_limit: selectedPlan.uploadLimit,
      })
      .eq('business_id', hotelProfile.id); // ✅ Use the hotel ID as business_id

    if (error) {
      Alert.alert("Update Failed", error.message);
    } else {
      Alert.alert("Success", `Your plan has been upgraded to ${selectedPlan.name}!`);
    }
  };

  if (isLoadingUser || (currentUser && isLoadingHotelProfile)) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}> {/* <-- MODIFIED: Use SafeAreaView and container style */}
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10 }}>
          {isLoadingUser ? "Loading user..." : "Loading hotel details..."}
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentUser && !isLoadingUser) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}> {/* <-- MODIFIED: Use SafeAreaView and container style */}
        <Text style={styles.errorText}>Redirecting to login...</Text>
        <ActivityIndicator size="small" color="#007bff" />
      </SafeAreaView>
    );
  }

  if (hotelProfileError && currentUser) {
    console.warn("Hotel profile fetch error:", hotelProfileError);
    // Optionally, render an error message to the user here
  }

  return (
    <SafeAreaView style={styles.container}> {/* <-- MODIFIED: Use SafeAreaView */}
      <View style={styles.headerContainer}>
        <Image source={OrdaLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Choose Your Plan</Text>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.name}
            onPress={() => {
              if (!currentUser?.email) {
                Alert.alert("Email Missing", "Your email is not available. Cannot proceed with payment.");
                return;
              }
              setSelectedPlan(plan);
              setShowPaystack(true);
            }}
            style={styles.planButton}
          >
            <Text style={styles.planName}>{plan.name} Plan - ${plan.price / 100}</Text>
            <Text style={styles.planLimit}>
              Upload Limit: {plan.uploadLimit === 99999 ? 'Unlimited' : plan.uploadLimit}
            </Text>
          </TouchableOpacity>
        ))}

        {showPaystack && selectedPlan && currentUser?.email && (
          <Paystack
            paystackKey="pk_live_66319d6ff0dbf7aabd99f429c5ddf287beb9c9b6" // Consider moving to environment variables
            billingEmail={currentUser.email}
            billingName={currentUser.user_metadata?.full_name || currentUser.email}
            amount={selectedPlan.price.toString()}
            onSuccess={() => {
              setShowPaystack(false);
              handlePaymentSuccess();
            }}
            onCancel={() => {
              setShowPaystack(false);
              Alert.alert("Payment Cancelled", "Your payment process was cancelled.");
            }}
            autoStart={true}
            activityIndicatorColor="green"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#E4EBE5', // <-- MODIFIED: Background color
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: { // <-- ADDED: For logo
    alignItems: 'flex-start', // Align logo to the left
    marginBottom: 10, // Space below logo
  },
  logo: { // <-- ADDED: Logo styles
    width: 60, // Adjust size as needed
    height: 60, // Adjust size as needed
  },
  contentContainer: { // <-- ADDED: To wrap the main content below the logo
    flex: 1,
    alignItems: 'center', // Center plan buttons etc.
    paddingTop: 10, // Add some space below the logo
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    // textAlign: 'center', // Centering will be handled by contentContainer
    color: '#333',
  },
  planButton: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%', // Make plan buttons take full width of contentContainer
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  planLimit: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});
