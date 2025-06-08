// 📁 app/sign-in.tsx

import { supabase } from '@/lib/supabase';
import { getCountryAndCurrency } from '@/utils/getCurrency';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import OrdaLogo from '@/assets/images/OrdaLogo.png';
const slideshowImages = [
  require('@/assets/images/bed.png'),
  require('@/assets/images/Chicken.png'),
  require('@/assets/images/female.png'),
  require('@/assets/images/room1.jpg'),
  require('@/assets/images/room2.jpg'),
];

const { width: screenWidth } = Dimensions.get('window');

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const flatListRef = useRef<FlatList | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (flatListRef.current) {
        const nextIndex = (activeIndex + 1) % slideshowImages.length;
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<any> }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleLogin = async () => {
    if (loading) return;

    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Sign in using Supabase v1
      const { user, error: signInError } = await supabase.auth.signIn({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        Alert.alert('Login Failed', signInError.message || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      if (!user) {
        Alert.alert('Login Failed', 'Could not retrieve user information.');
        setLoading(false);
        return;
      }

      // Step 2: Save country and currency
      try {
        const { country, currency } = getCountryAndCurrency();
        console.log(`Detected Country: ${country}, Currency: ${currency}`);

        const { error: profileError } = await supabase
          .from('profile')
          .upsert([
            {
              id: user.id,
              country,
              currency,
            },
          ], { onConflict: ['id'] });

        if (profileError) {
          console.error('Profile update/insert failed:', profileError.message);
        } else {
          console.log('Country and currency saved in profile successfully.');
        }
      } catch (currencyError: any) {
        console.error('Error during currency update:', currencyError.message);
      }

      // Step 3: Fetch user role from 'users' table
      const { data: userRoleProfile, error: profileError } = await supabase
        .from('users')
        .select('business')
        .eq('id', user.id)
        .single(); // v1: use single() instead of maybeSingle

      if (profileError) {
        console.error('Error fetching user role:', profileError.message);
        Alert.alert('Login Error', 'Could not retrieve user profile role.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!userRoleProfile) {
        Alert.alert('Login Issue', 'Your account profile role is incomplete.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!userRoleProfile.business) {
        Alert.alert('Access Denied', 'This application is for business users only.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      Alert.alert('Login Successful', 'Welcome back!');
      router.replace('/');

    } catch (error: any) {
      console.error('Unexpected error during login:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ height: screenWidth * 0.6 }}>
          <FlatList
            ref={flatListRef}
            data={slideshowImages}
            renderItem={({ item }) => (
              <Image source={item} style={{ width: screenWidth, height: '100%' }} resizeMode="cover" />
            )}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            initialScrollIndex={0}
          />
        </View>

        <View className="flex-1 justify-center items-center px-4 pb-8 pt-5">
          <Image source={OrdaLogo} className="w-20 h-20 mb-4" resizeMode="contain" />

          <Text className="text-2xl font-semibold text-gray-800 mb-2 text-center">
            Welcome to Orda
          </Text>
          <Text className="text-base text-gray-600 mb-8 text-center px-4">
            Reserve your home away from home, where every stay is a perfect escape
          </Text>

          <View className="w-full mb-4">
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="w-full mb-6">
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className={`w-full h-14 justify-center items-center rounded-lg ${loading ? 'bg-gray-400' : 'bg-green-600'}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-bold">SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-7">
            <Text className="text-gray-600">Don't have an account? </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity>
                <Text className="text-green-600 font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
