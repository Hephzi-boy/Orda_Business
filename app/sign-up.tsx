// 📁 app/sign-up.tsx

import OrdaLogo from '@/assets/images/OrdaLogo.png';
import { supabase } from '@/lib/supabase'; // Make sure this uses createClient from @supabase/supabase-js v1
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignUp = async () => {
    if (loading) return;

    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { user, session, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        Alert.alert('Sign Up Error', error.message);
        setLoading(false);
        return;
      }

      const userId = user?.id || session?.user?.id;
      const userEmail = user?.email || session?.user?.email;

      if (!userId || !userEmail) {
        Alert.alert('Sign Up Info', 'Account created. Please confirm via email.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('users').insert([
        {
          id: userId,
          email: userEmail,
          business: true,
        },
      ]);

      if (insertError) {
        console.error('Insert error:', insertError);
        Alert.alert('Setup Issue', 'Sign-up succeeded, but profile setup failed. Contact support.');
      } else {
        Alert.alert(
          'Sign Up Successful',
          session
            ? 'Your business account is ready. Please sign in.'
            : 'Please check your email to confirm your business account.'
        );
        router.replace('/sign-in');
      }

    } catch (err: any) {
      console.error('Unexpected sign-up error:', err);
      Alert.alert('Error', err.message || 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="w-full justify-center items-center px-4 my-6">
          <Image source={OrdaLogo} className="w-20 h-20 mb-10" resizeMode="contain" />
          <Text className="text-2xl font-semibold text-gray-800 mb-5 text-center">
            Create Your Orda Business Account
          </Text>

          <View className="w-full mb-4">
            <Text className="text-base text-gray-600 mb-2">Email</Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="w-full mb-4">
            <Text className="text-base text-gray-600 mb-2">Password</Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500"
              placeholder="Enter your password (min. 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className="w-full mb-6">
            <Text className="text-base text-gray-600 mb-2">Confirm Password</Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className={`w-full h-14 justify-center items-center rounded-lg ${loading ? 'bg-gray-400' : 'bg-green-600'}`}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-bold">CREATE BUSINESS ACCOUNT</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-7">
            <Text className="text-gray-600">Already have an account? </Text>
            <Link href="/sign-in" replace asChild>
              <TouchableOpacity>
                <Text className="text-green-600 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
