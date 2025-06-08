// c:\Users\Lenovo\Desktop\Orda_Business_App\app\changeUsername.tsx

import Images from '@/constants/Images';
import { useCreateUserProfile } from '@/hooks/useCreateUserProfile';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const ChangeUsernameScreen = () => {
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useCreateUserProfile();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setInitialLoading(true);
      try {
        const user = supabase.auth.user(); // ✅ v1 method
        if (!user) throw new Error('User not authenticated.');

        setCurrentUser(user);

        const profileTableName = 'profile';
        const { data: profileData, error: profileError } = await supabase
          .from(profileTableName)
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Could not fetch existing username:', profileError.message);
        } else if (profileData?.username) {
          setNewUsername(profileData.username);
          console.log('Pre-filled username:', profileData.username);
        }
      } catch (fetchErr: any) {
        console.error('Error fetching user/profile:', fetchErr.message);
        Alert.alert('Error', 'Could not load user data. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  const updateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Validation Error', 'Username cannot be empty.');
      return;
    }
    if (!currentUser?.id) {
      Alert.alert('Error', 'User session not found. Please try logging in again.');
      return;
    }

    setLoading(true);
    const trimmedUsername = newUsername.trim();
    const userId = currentUser.id;
    const profileTableName = 'profile';

    try {
      const { error } = await supabase
        .from(profileTableName)
        .update({ username: trimmedUsername })
        .eq('id', userId);

      if (error) {
        console.error('Error updating username:', error);
        const errorMessage = error?.message;
        if (
          typeof errorMessage === 'string' &&
          errorMessage.includes('duplicate key value violates unique constraint')
        ) {
          Alert.alert('Username Taken', 'This username is already taken. Please choose another.');
        } else {
          Alert.alert('Update Error', errorMessage || 'An unknown database error occurred.');
        }
      } else {
        Alert.alert('Success!', 'Username updated successfully!');
      }
    } catch (err: any) {
      console.error('Unexpected error during username update:', err);
      Alert.alert('Unexpected Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not load user data.</Text>
        <Text style={styles.errorText}>Please ensure you are logged in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {Images?.OrdaLogo ? (
          <Image source={Images.OrdaLogo} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Update Username:</Text>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="Enter new username"
          autoCapitalize="none"
          editable={!loading}
          placeholderTextColor="#aaa"
        />
        {loading ? (
          <ActivityIndicator style={styles.buttonSpacer} size="small" color="#28a745" />
        ) : (
          <Button
            title="Update Username"
            onPress={updateUsername}
            disabled={loading}
            color="#28a745"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E4EBE5',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E4EBE5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#ccc',
    borderRadius: 50,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 25,
    fontSize: 16,
    color: '#333',
  },
  buttonSpacer: {
    marginTop: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChangeUsernameScreen;
