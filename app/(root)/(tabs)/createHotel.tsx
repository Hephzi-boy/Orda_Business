// 📁 app/(root)/(tabs)/createHotel.tsx

import OrdaLogo from '@/assets/images/OrdaLogo.png';
import Icons from '@/constants/Icons';
import { supabase } from '@/lib/supabase';
import { Picker } from '@react-native-picker/picker'; // --- ADDED ---
import { decode } from 'base64-arraybuffer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Helper function to extract file extension
const getFileExtension = (uri: string): string | null => {
  const match = uri.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1].toLowerCase() : null;
};

// Get screen dimensions for camera preview
const { width: screenWidth } = Dimensions.get('window');

const CreateHotel = () => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [businessType, setBusinessType] = useState('hotel'); // --- ADDED: State for business type ---
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Fetch the current user ID
  useEffect(() => {
    const fetchUser = async () => {
      setIsFetchingUser(true);
      try {
        const user = supabase.auth.user();
        if (user) {
          setUserId(user.id);
        } else {
          Alert.alert('Authentication Required', 'You must be logged in to create a business.'); // --- MODIFIED ---
        }
      } catch (error: any) {
        console.error('Error fetching user:', error);
        Alert.alert('Error', 'Could not retrieve user information.');
      } finally {
        setIsFetchingUser(false);
      }
    };
    fetchUser();
  }, [router]); // Keep router dependency if navigation might happen based on user state

  // --- Image Picker & Camera Logic (Keep existing logic) ---
  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions.');
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    if (cameraPermission?.granted) return true;
    const { status } = await requestCameraPermission();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (uploadingImage || loading || showCamera) return;
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;
    setUploadedImageUrl(null);
    setSelectedImage(null);
    setShowCamera(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
        aspect: [16, 9], quality: 0.7, base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || !asset.uri) throw new Error("Failed to get image data.");
      setSelectedImage(asset);
      await uploadImage(asset);
    } catch (error: any) {
      console.error("Image pick error:", error);
      Alert.alert("Image Error", error.message || "Could not process image.");
      setSelectedImage(null); setUploadedImageUrl(null);
    }
  };

  const openCamera = async () => {
    if (uploadingImage || loading) return;
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;
    setUploadedImageUrl(null);
    setSelectedImage(null);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || uploadingImage || loading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo || !photo.base64 || !photo.uri) throw new Error("Failed to capture image data.");
      const capturedAsset: ImagePicker.ImagePickerAsset = {
        uri: photo.uri, base64: photo.base64, width: photo.width, height: photo.height,
        mimeType: `image/${getFileExtension(photo.uri) || 'jpeg'}`, assetId: null, type: 'image',
        fileName: photo.uri.split('/').pop() || `photo_${Date.now()}.jpg`,
      };
      setSelectedImage(capturedAsset);
      setShowCamera(false);
      setIsCameraReady(false);
      await uploadImage(capturedAsset);
    } catch (error: any) {
      console.error("Take picture error:", error);
      Alert.alert("Camera Error", error.message || "Could not take picture.");
      setShowCamera(false); setIsCameraReady(false); setSelectedImage(null); setUploadedImageUrl(null);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64 || !asset.uri || !userId) {
      Alert.alert("Upload Error", "Missing image data or user ID.");
      setSelectedImage(null); return;
    }
    setUploadingImage(true); setUploadedImageUrl(null);
    const fileExt = getFileExtension(asset.uri) || 'jpg';
    // --- MODIFIED: Include businessType in path if desired, or keep generic ---
    const filePath = `businesses/${userId}/${businessType}/${Date.now()}.${fileExt}`;
    const contentType = asset.mimeType ?? `image/${fileExt}`;
    try {
      const { error: uploadError } = await supabase.storage.from('uploads')
        .upload(filePath, decode(asset.base64), { contentType: contentType, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
      if (!urlData?.publicURL) throw new Error("Failed to get public URL.");
      setUploadedImageUrl(urlData.publicURL);
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload image.');
      setSelectedImage(null); setUploadedImageUrl(null);
    } finally {
      setUploadingImage(false);
    }
  };
  // --- End Image Picker & Camera Logic ---

  const handleCreateHotel = async () => {
    // --- Validation ---
    if (!name.trim()) { Alert.alert('Validation Error', 'Please enter a business name.'); return; } // --- MODIFIED ---
    if (!location.trim()) { Alert.alert('Validation Error', 'Please enter the location.'); return; }
    if (!description.trim()) { Alert.alert('Validation Error', 'Please enter a description.'); return; }
    const priceValue = parseFloat(pricePerNight);
    // --- MODIFIED: Make price optional or adjust validation based on business type if needed ---
    // For now, keep price required, but you might want to change this.
    if (isNaN(priceValue) || priceValue <= 0) { Alert.alert('Validation Error', 'Please enter a valid positive price (e.g., average price or starting price).'); return; }
    if (!businessType) { Alert.alert('Validation Error', 'Please select a business type.'); return; } // --- ADDED ---
    if (showCamera) { Alert.alert('Action Blocked', 'Please close the camera view first.'); return; }
    if (uploadingImage) { Alert.alert('Validation Error', 'Please wait for image upload.'); return; }
    if (!uploadedImageUrl) { Alert.alert('Validation Error', 'Please select or take an image.'); return; }
    if (loading || isFetchingUser || !userId) { if (!userId && !isFetchingUser) { Alert.alert('Error', 'Could not verify user.'); } return; }

    setLoading(true);
    try {
      // --- MODIFIED: Add business_type to data ---
      const businessData = {
        name: name.trim(),
        description: description.trim(),
        price_per_night: priceValue, // Consider renaming this field in DB if it's not always per night
        image_url: uploadedImageUrl,
        business_id: userId,
        location: location.trim(),
        business_type: businessType, // --- ADDED ---
      };
      // --- MODIFIED: Use generic term 'business' ---
      const { data, error: insertError } = await supabase.from('hotels').insert([businessData]).select(); // Assuming 'hotels' table is used for all business types
      if (insertError) { console.error('Error creating business:', insertError.message); Alert.alert('Failed to Create', insertError.message); throw insertError; }
      console.log('Business created:', data);
      Alert.alert('Success', 'Business created successfully!');
      // Reset form
      setName(''); setLocation(''); setDescription(''); setPricePerNight(''); setBusinessType('hotel'); // Reset type
      setSelectedImage(null); setUploadedImageUrl(null);
      // Optional: router.back(); or router.push('/(root)/(tabs)/manageListing');
    } catch (error: any) {
      console.error('Unexpected error during creation:', error);
      if (error.message && !error.message.includes('Failed to Create')) { Alert.alert('Creation Failed', error.message || 'Could not create business.'); }
    } finally {
      setLoading(false);
    }
  };

  // --- Render Camera View (Keep existing logic) ---
  if (showCamera) {
    if (!cameraPermission) return <SafeAreaView style={styles.cameraContainer}><ActivityIndicator size="large" /></SafeAreaView>;
    if (!cameraPermission.granted) return (
      <SafeAreaView style={styles.cameraContainer}>
        <Text style={styles.cameraMessage} className="font-winky-regular">Camera access denied.</Text>
        <TouchableOpacity style={styles.cameraButton} onPress={() => setShowCamera(false)}>
          <Text style={styles.cameraButtonText} className="font-winky-regular">Close</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.cameraPreview} facing={'back'} onCameraReady={() => setIsCameraReady(true)}>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={[styles.cameraButton, styles.closeButton]} onPress={() => { setShowCamera(false); setIsCameraReady(false); }} disabled={uploadingImage || loading}>
              <Text style={styles.cameraButtonText} className="font-winky-regular">Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cameraButton, styles.captureButton]} onPress={takePicture} disabled={!isCameraReady || uploadingImage || loading}>
              <View style={styles.captureInnerButton} />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }
  // --- End Render Camera View ---

  // Show full screen loading only while initially fetching the user
  if (isFetchingUser) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#E4EBE5]">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-2 text-gray-600 font-winky-regular">Loading user data...</Text>
      </SafeAreaView>
    );
  }

  // --- Render Main Form ---
  return (
    <SafeAreaView className="bg-[#E4EBE5] flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="w-full justify-start items-center px-4 py-6">

          {/* Orda Logo */}
          <Image
            source={OrdaLogo}
            className="w-20 h-20 mb-6"
            resizeMode="contain"
          />

          {/* --- MODIFIED TEXT --- */}
          <Text className="text-2xl font-semibold text-gray-800 mb-8 text-center font-winky-regular">
            Create New Business Listing
          </Text>
          {/* --- END MODIFICATION --- */}

          {/* Business Name Input */}
          <View className="w-full mb-6">
            {/* --- MODIFIED TEXT --- */}
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Business Name</Text>
            {/* --- END MODIFICATION --- */}
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder="Enter the name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading && !!userId && !uploadingImage}
            />
          </View>

          {/* Location Input */}
          <View className="w-full mb-6">
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Location</Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder="e.g., City, State, Address"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
              editable={!loading && !!userId && !uploadingImage}
            />
          </View>

          {/* --- ADDED: Business Type Picker --- */}
          <View className="w-full mb-6">
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Business Type</Text>
            <View className="w-full h-14 px-1 bg-gray-100 border border-gray-300 rounded-lg justify-center">
              <Picker
                selectedValue={businessType}
                onValueChange={(itemValue) => setBusinessType(itemValue)}
                style={{ flex: 1 }} // Basic style, adjust as needed
                dropdownIconColor={Platform.OS !== 'ios' ? '#888' : undefined} // Optional: Style dropdown icon on Android
                enabled={!loading && !!userId && !uploadingImage}
                itemStyle={{ fontFamily: 'Winky-Regular' }} // Apply font if possible
              >
                <Picker.Item label="Hotel" value="hotel" />
                <Picker.Item label="Restaurant" value="restaurant" />
                <Picker.Item label="Bar" value="bar" />
                <Picker.Item label="Lounge" value="lounge" />
                <Picker.Item label="Service Apartment" value="service_apartment" />
                <Picker.Item label="Motel" value="motel" />
                <Picker.Item label="Night Club" value="night_club" />
                {/* Add other types as needed */}
              </Picker>
            </View>
            {/* Note: Styling the Picker itself heavily might require custom components */}
          </View>
          {/* --- END: Business Type Picker --- */}

          {/* Description Input */}
          <View className="w-full mb-6">
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Description</Text>
            <TextInput
              className="w-full h-24 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder="Describe your business (amenities, features, etc.)" // --- MODIFIED ---
              value={description}
              onChangeText={setDescription}
              autoCapitalize="sentences"
              multiline={true}
              numberOfLines={4}
              editable={!loading && !!userId && !uploadingImage}
              textAlignVertical="top"
            />
          </View>

          {/* Price Per Night Input */}
          <View className="w-full mb-6">
            {/* --- MODIFIED TEXT --- */}
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Average/Starting Price (e.g., 150.00)</Text>
            {/* --- END MODIFICATION --- */}
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder="Enter price indicator" // --- MODIFIED ---
              value={pricePerNight}
              onChangeText={setPricePerNight}
              keyboardType="numeric"
              editable={!loading && !!userId && !uploadingImage}
            />
          </View>

          {/* --- Image Picker Section (Keep existing logic, maybe update label) --- */}
          <View className="w-full mb-6">
            {/* --- MODIFIED TEXT --- */}
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Business Image</Text>
            {/* --- END MODIFICATION --- */}
            <View className="flex-row justify-between items-stretch mb-3">

              {/* Select Image Button */}
              <TouchableOpacity
                className={`flex-1 justify-center items-center rounded-lg border border-dashed p-4 ${selectedImage || uploadingImage ? 'border-gray-300 bg-gray-50' : 'border-blue-400 bg-blue-50'} ${uploadingImage || loading || !userId ? 'opacity-50' : ''} mr-2`}
                onPress={pickImage}
                disabled={uploadingImage || loading || !userId}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <View className="items-center">
                    <Image
                      source={Icons.gallery}
                      className="w-6 h-6 mb-1"
                      resizeMode="contain"
                    />
                    <Text className={`text-sm text-center font-winky-regular ${selectedImage || uploadingImage ? 'text-gray-600' : 'text-blue-600'}`}>
                      {selectedImage ? 'Change Image' : 'Select from Library'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Take Photo Button */}
              <TouchableOpacity
                className={`flex-1 justify-center items-center rounded-lg border border-dashed p-4 ${selectedImage || uploadingImage ? 'border-gray-300 bg-gray-50' : 'border-purple-400 bg-purple-50'} ${uploadingImage || loading || !userId ? 'opacity-50' : ''} ml-2`}
                onPress={openCamera}
                disabled={uploadingImage || loading || !userId}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <View className="items-center">
                    <Image
                      source={Icons.camera}
                      className="w-6 h-6 mb-1"
                      resizeMode="contain"
                    />
                    <Text className={`text-sm text-center font-winky-regular ${selectedImage || uploadingImage ? 'text-gray-600' : 'text-purple-600'}`}>
                      {selectedImage ? 'Retake Photo' : 'Take Photo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            {selectedImage && (
              <View className="mt-4 items-center">
                <Image
                  source={{ uri: selectedImage.uri }}
                  className="w-full h-48 rounded-lg border border-gray-300"
                  resizeMode="cover"
                />
                {uploadedImageUrl && !uploadingImage && (
                   <Text className="text-green-600 mt-1 text-sm font-winky-regular">✓ Image ready</Text>
                )}
                 {!uploadedImageUrl && !uploadingImage && loading && (
                     <Text className="text-red-500 text-center mt-2 font-winky-regular">
                         Image upload failed. Please try selecting/taking again.
                     </Text>
                 )}
              </View>
            )}
          </View>
          {/* --- End Image Picker Section --- */}

          {/* Create Business Button */}
          <TouchableOpacity
            className={`w-full h-14 justify-center items-center rounded-lg ${loading || uploadingImage || !userId || !uploadedImageUrl ? 'bg-gray-400' : 'bg-green-600'}`}
            onPress={handleCreateHotel} // Function name kept for simplicity, but it now creates a 'business'
            disabled={loading || uploadingImage || !userId || !uploadedImageUrl}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              // --- MODIFIED TEXT ---
              <Text className="text-white text-lg font-bold font-winky-regular">CREATE BUSINESS</Text>
              // --- END MODIFICATION ---
            )}
          </TouchableOpacity>

          {!userId && !isFetchingUser && (
            <Text className="text-red-500 text-center mt-4 font-winky-regular">
              Could not load user information. Please ensure you are logged in.
            </Text>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- StyleSheet for Camera (Keep existing styles) ---
const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  cameraPreview: { flex: 1, width: '100%' },
  cameraMessage: { color: 'white', fontSize: 18, marginBottom: 20 },
  cameraControls: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20 },
  cameraButton: { padding: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.7)', minWidth: 60, alignItems: 'center' },
  cameraButtonText: { color: 'black', fontSize: 14, fontWeight: 'bold' },
  closeButton: {},
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(0,0,0,0.2)' },
  captureInnerButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'red' },
});

export default CreateHotel;
