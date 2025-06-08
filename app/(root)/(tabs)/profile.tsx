// 📁 app/(root)/(tabs)/profile.tsx

import Icons from '@/constants/Icons';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// import Images from '@/constants/Images'; // Uncomment if needed
import { useCreateUserProfile } from '@/hooks/useCreateUserProfile'; // <-- Import the hook

import { User } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

// Helper function to extract file extension
const getFileExtension = (uri: string): string | null => {
  const match = uri.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1].toLowerCase() : null;
};

// Rename component to match file name for Expo Router tab
const Profile = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<{ username?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // --- Call the hook to ensure profile exists ---
  useCreateUserProfile(); // <-- Call the hook here
  // ---

  // --- Fetch User and Profile Data ---
  const fetchUserData = useCallback(async () => { // Keep async for profile fetch
    console.log("fetchUserData triggered. Current loading state:", loadingUser);
    // setLoadingUser(true) should be called at the beginning of the data fetching process
    // if it's not already true from the initial state or a previous call.
    // However, useFocusEffect will call this, and initial state is true.
    // For subsequent calls (e.g., manual refresh if added), ensure it's set.
    // if (!loadingUser) setLoadingUser(true); // This might be redundant depending on usage.

    try {
      console.log("Attempting to fetch auth user...");
      const currentUser = supabase.auth.user(); // V1: Get user synchronously

      // No separate userError for supabase.auth.user() in v1 for "no user" case
      if (!currentUser) {
        console.log("No user session found during fetch.");
        setUser(null);
        setProfileImageUrl(null);
        setProfileData(null);
        setLoadingUser(false); // Ensure loading stops if no user
        return; // Exit early if no user
      }
      console.log("Auth user fetched:", currentUser.id);
      setUser(currentUser);
      setProfileImageUrl(currentUser.user_metadata?.avatar_url || null);

      const profileTableName = 'profile'; // <-- Ensure this matches your hook/db
      console.log(`Fetching username from table: '${profileTableName}' for user ID: ${currentUser.id}`);

      const { data: fetchedProfile, error: profileError } = await supabase
        .from(profileTableName)
        .select('username')
        .eq('id', currentUser.id)
        .maybeSingle();

      console.log("Profile fetch result:", { fetchedProfile, profileError });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile username:", profileError.message);
        setProfileData({ username: currentUser.email?.split('@')[0] || 'User' }); // Fallback
      } else if (fetchedProfile) {
        console.log("Successfully fetched profile data:", fetchedProfile);
        setProfileData(fetchedProfile); // Store fetched profile data
      } else {
        console.log("No profile row found for user, using fallback.");
        // If useCreateUserProfile ran successfully before this, fetchedProfile should ideally not be null
        // But keep fallback just in case of timing issues or errors in the hook
        setProfileData({ username: currentUser.email?.split('@')[0] || 'User' });
      }

    } catch (error: any) {
      console.error("Error fetching user/profile:", error.message);
      Alert.alert("Error", "Could not fetch user profile.");
      setUser(null);
      setProfileImageUrl(null);
      setProfileData(null);
    } finally {
      console.log("fetchUserData finished, setting loadingUser to false.");
      setLoadingUser(false);
    }
  }, []); // Dependencies are correct

  // --- UseFocusEffect to refetch when screen is focused ---
  useFocusEffect(
    useCallback(() => {
      console.log("Profile screen focused, calling fetchUserData...");
      setLoadingUser(true); // Explicitly set loading to true when focus effect runs
      fetchUserData();
    }, [fetchUserData])
  );

  // --- Pick Image ---
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload a profile picture.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64 && user) {
      uploadImage(result.assets[0]);
    } else if (!result.canceled) {
      console.error("Image picker result missing assets or base64 data.");
      Alert.alert("Error", "Could not get image data to upload.");
    }
  };

  // --- Upload Image ---
  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user || !asset.base64 || !asset.uri) return;
    setUploading(true);
    const fileExt = getFileExtension(asset.uri);
    const fileName = `${user.id}.${fileExt || 'jpg'}`;
    const filePath = `avatars/${fileName}`;
    try {
      const decodedBase64 = decode(asset.base64);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decodedBase64, { contentType: asset.mimeType ?? `image/${fileExt || 'jpeg'}`, upsert: true });

      if (uploadError) throw uploadError;

      const timestamp = `t=${new Date().getTime()}`;
      // V1: Direct publicURL
      const { publicURL, error: urlError } = supabase.storage.from('avatars').getPublicUrl(filePath); 

      if (urlError) throw new Error(`Could not get public URL: ${urlError.message}`);
      if (!publicURL) throw new Error("Could not get public URL (URL is null).");
      const publicUrlWithTimestamp = `${publicURL}?${timestamp}`;
      // V1: supabase.auth.update()
      const { error: updateError } = await supabase.auth.update({ data: { avatar_url: publicUrlWithTimestamp } }); 
      if (updateError) throw updateError;
      setProfileImageUrl(publicUrlWithTimestamp);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  // --- Remove Image ---
  const removeImage = async () => {
    if (!user || !profileImageUrl) return;
    let filePath = null;
    try {
      const url = new URL(profileImageUrl);
      const pathSegments = url.pathname.split('/');
      // Find the 'avatars' segment and take everything after it
      const bucketIndex = pathSegments.findIndex(segment => segment === 'avatars');
      if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
        filePath = pathSegments.slice(bucketIndex + 1).join('/');
      } else {
        throw new Error("Could not extract file path from URL. Ensure 'avatars' is in the path.");
      }
    } catch (e) {
      console.error("Error parsing profile image URL:", e);
      Alert.alert("Error", "Could not determine the file path for removal.");
      return;
    }

    setRemoving(true);
    try {
      const { error: removeError } = await supabase.storage.from('avatars').remove([filePath]);
      if (removeError) console.warn("Error removing image from storage:", removeError.message); // Log but continue
      // V1: supabase.auth.update()
      const { error: updateError } = await supabase.auth.update({ data: { avatar_url: null } }); 
      if (updateError) throw updateError;
      setProfileImageUrl(null);
      Alert.alert("Success", "Profile picture removed.");
    } catch (error: any) {
      console.error("Error removing image:", error);
      Alert.alert("Removal Error", error.message || "Failed to remove profile picture.");
    } finally {
      setRemoving(false);
    }
  };

  // --- Other Handlers ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Logout Error', error.message);
    else {
      setUser(null);
      setProfileData(null);
      setProfileImageUrl(null);
      router.replace('/sign-in');
    }
  };


  // --- Render ---
  // Corrected loading and user states for rendering
  if (loadingUser) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, styles.centeredView]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  if (!user) { // This check comes after loadingUser is false
    return (
      <SafeAreaView style={[styles.container, styles.centeredView]}>
        <Text style={styles.errorInfoText}>User not found.</Text>
        <Text style={styles.errorInfoText}>Please log in to view your profile.</Text>
        {/* Optionally, add a button to navigate to sign-in */}
        {/* <TouchableOpacity onPress={() => router.replace('/sign-in')} style={styles.signInButton}><Text style={styles.buttonText}>Sign In</Text></TouchableOpacity> */}
      </SafeAreaView>
    );
  }

  const displayName = profileData?.username || user?.email?.split('@')[0] || 'User Profile';
  console.log("Displaying username:", displayName, "(from profileData:", profileData?.username, ")");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Image Area */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={pickImage} disabled={uploading || removing}>
            {/* Image/Placeholder/Loading logic */}
            {uploading ? (
              <View style={styles.imagePlaceholder}><ActivityIndicator size="large" color="#007bff" /></View>
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.profileImage} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePlaceholder, styles.defaultPlaceholder]}>
                {Icons?.profile ? <Image source={Icons.profile} style={styles.defaultPlaceholderIcon} resizeMode="contain" /> : <Text>?</Text>}
              </View>
            )}
          </TouchableOpacity>
          {/* Remove Button/Indicator */}
          {profileImageUrl && !removing && !uploading && (
            <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
          {removing && (
            <ActivityIndicator size="small" color="#dc3545" style={styles.removeIndicator} />
          )}
        </View>

        {/* User Name Display */}
        {/* loadingUser check is already handled above, so if we reach here, user is loaded */}
        <Text style={styles.userNameText}>{displayName}</Text>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
           {/* Change Personal Information Button */}
           <TouchableOpacity style={styles.button} onPress={() => router.push('/changeUsername' as any)}>
             <Text style={styles.buttonText}>Change Personal Information</Text>
           </TouchableOpacity>

           {/* Edit Bank Details Button - Now passes business_id (which is user.id) */}
           <TouchableOpacity
             style={styles.button}
             onPress={() => {
               // user.id is used as business_id for the bank details screen
               if (user?.id) {
                 router.push({
                   pathname: '/editBankDetails', // Navigate to the top-level editBankDetails screen
                   params: { business_id: user.id }, // Pass business_id as a query parameter
                 });
               } else {
                 Alert.alert("Error", "Business ID not available. Cannot edit bank details.");
                 console.error("User ID (required as business_id) is missing.");
               }
             }}
           >
             <Text style={styles.buttonText}>Edit Bank Details</Text>
           </TouchableOpacity>

           {/* Change Password Button */}
           <TouchableOpacity style={styles.button} onPress={() => router.push('/change-password' as any)}>
             <Text style={styles.buttonText}>Change Password</Text>
           </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButtonContainer} onPress={handleLogout}>
         {Icons?.LogOutButton ? <Image source={Icons.LogOutButton} style={styles.logoutIcon} resizeMode="contain" /> : <Text style={styles.buttonText}>LOGOUT</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B5B3B3', justifyContent: 'space-between' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', padding: 20 }, // Kept for potential direct use
  centeredView: { // Added for centering content when user is not found or during loading
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 30 },
  profileImageContainer: { alignItems: 'center', marginBottom: 15, position: 'relative' },
  imagePlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  defaultPlaceholder: { backgroundColor: '#f0f0f0' },
  defaultPlaceholderIcon: { width: 80, height: 80, tintColor: '#a0a0a0' },
  profileImage: { width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#eee' },
  removeButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(220, 53, 69, 0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  removeButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  removeIndicator: { position: 'absolute', bottom: 5, right: 5 },
  // userNameLoading: { height: 27, marginTop: 15, marginBottom: 40 }, // No longer needed due to early return
  userNameText: { fontSize: 18, fontWeight: '600', color: '#444', marginTop: 15, marginBottom: 40, textAlign: 'center', minHeight: 27 },
  buttonGroup: { width: '100%', alignItems: 'center' },
  button: { backgroundColor: '#E0EDE1', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, marginBottom: 20, width: '90%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 1.5, elevation: 2 },
  buttonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  logoutButtonContainer: { alignSelf: 'center', padding: 10, paddingBottom: 30 },
  logoutIcon: { width: 280, height: 90 },
  loadingText: { // Added style for loading text
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorInfoText: { // Added style for error/info text
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  // signInButton: { // Optional style for a sign-in button
  //   marginTop: 20,
  //   backgroundColor: '#007bff',
  //   paddingVertical: 10,
  //   paddingHorizontal: 20,
  //   borderRadius: 5,
  // },
});

export default Profile;
