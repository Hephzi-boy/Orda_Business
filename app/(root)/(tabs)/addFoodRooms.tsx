// 📁 app/(root)/(tabs)/addFoodRooms.tsx

import OrdaLogo from '@/assets/images/OrdaLogo.png';
import Icons from '@/constants/Icons';
import { useSubscription } from '@/hooks/useSubscription'; // Import the subscription hook
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router'; // Added useRouter
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


// Define the structure of a Hotel object
interface Hotel {
  id: string;
  name: string;
  location?: string;
}

// Define the item types
type ItemType = 'food' | 'drink' | 'room';

// Helper function to extract file extension
const getFileExtension = (uri: string): string | null => {
  const match = uri.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1].toLowerCase() : null;
};

// Get screen dimensions for camera preview
const { width: screenWidth } = Dimensions.get('window');

const AddFoodRooms = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Store current user
  const [userHotels, setUserHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<ItemType>('food');
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(true);
  // userId state is now derived from currentUser

  // Image State
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Camera State & Refs
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const router = useRouter(); // For potential navigation to upgrade screen

  // Fetch User and then Hotels
  useEffect(() => {
    let isMounted = true;
    const fetchUserAndInitialData = async () => {
      setLoadingHotels(true); // Combined loading state for initial setup
      const user = supabase.auth.user();
      if (isMounted) {
        setCurrentUser(user);
        if (user) {
          // User is available, fetchUserHotels will be triggered by useFocusEffect or below
        } else {
          Alert.alert('Error', 'Could not find logged-in user.');
          setUserHotels([]);
          setLoadingHotels(false);
        }
      }
    };
    fetchUserAndInitialData();
    return () => { isMounted = false; };
  }, []);


  const fetchUserHotels = useCallback(async () => {
    if (!currentUser) {
      setUserHotels([]);
      setLoadingHotels(false);
      return;
    }
    console.log("Fetching CURRENT USER'S hotels (fetchUserHotels)...");
    setLoadingHotels(true);
    setUserHotels([]);
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('business_id', currentUser.id);

      if (error) {
        console.error("Error fetching user's hotels:", error.message);
        Alert.alert("Error", "Could not fetch your hotels.");
        setUserHotels([]);
      } else {
        console.log("Fetched user's hotels:", data);
        setUserHotels(data || []);
      }
    } catch (error: any) {
        console.error('Caught unexpected error fetching user hotels:', error);
        Alert.alert("Error", "An unexpected error occurred while fetching hotels.");
        setUserHotels([]);
    } finally {
        setLoadingHotels(false);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchUserHotels();
      } else {
        setUserHotels([]);
        setLoadingHotels(false);
      }
    }, [currentUser, fetchUserHotels])
  );

  // Subscription Hook
  const { plan, uploadLimit, loading: subscriptionLoading } = useSubscription(currentUser);


  // --- Image Picker & Camera Logic ---
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
    if (uploadingImage || isSubmittingItem || !selectedHotelId) {
        if (!selectedHotelId) Alert.alert("Select Hotel", "Please select a hotel first.");
        return;
    }
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;
    setUploadedImageUrl(null); setSelectedImage(null); setShowCamera(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true,
        aspect: [4, 3], quality: 0.7, base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || !asset.uri) throw new Error("Failed to get image data.");
      setSelectedImage(asset);
    } catch (error: any) {
      console.error("Image pick error:", error);
      Alert.alert("Image Error", error.message || "Could not process image.");
      setSelectedImage(null); setUploadedImageUrl(null);
    }
  };

  const openCamera = async () => {
    if (uploadingImage || isSubmittingItem || !selectedHotelId) {
        if (!selectedHotelId) Alert.alert("Select Hotel", "Please select a hotel first.");
        return;
    }
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;
    setUploadedImageUrl(null); setSelectedImage(null); setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || uploadingImage || isSubmittingItem) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo || !photo.base64 || !photo.uri) throw new Error("Failed to capture image data.");
      const capturedAsset: ImagePicker.ImagePickerAsset = {
        uri: photo.uri, base64: photo.base64, width: photo.width, height: photo.height,
        mimeType: `image/${getFileExtension(photo.uri) || 'jpeg'}`, assetId: null, type: 'image',
        fileName: photo.uri.split('/').pop() || `photo_${Date.now()}.jpg`,
      };
      setSelectedImage(capturedAsset);
      setShowCamera(false); setIsCameraReady(false);
    } catch (error: any) {
      console.error("Take picture error:", error);
      Alert.alert("Camera Error", error.message || "Could not take picture.");
      setShowCamera(false); setIsCameraReady(false);
    }
  };

  const uploadSelectedItemImage = async (): Promise<string | null> => {
    if (!selectedImage || !selectedImage.base64 || !selectedImage.uri || !selectedHotelId || !currentUser?.id) {
      Alert.alert("Upload Error", "Missing image data, hotel selection, or user info.");
      return null;
    }
    setUploadingImage(true); setUploadedImageUrl(null);
    const fileExt = getFileExtension(selectedImage.uri) || 'jpg';
    const filePath = `items/${selectedHotelId}/${type}/${Date.now()}.${fileExt}`;
    const contentType = selectedImage.mimeType ?? `image/${fileExt}`;
    try {
      const { error: uploadError } = await supabase.storage.from('uploads')
        .upload(filePath, decode(selectedImage.base64), { contentType: contentType, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
      if (!urlData?.publicURL) throw new Error("Failed to get public URL.");
      setUploadedImageUrl(urlData.publicURL);
      return urlData.publicURL;
    } catch (error: any) {
      console.error('❌ Image upload error:', error);
      Alert.alert('Upload Failed', error.message || JSON.stringify(error, null, 2));
      setUploadedImageUrl(null);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddItem = async () => {
    if (isSubmittingItem || loadingHotels || uploadingImage || !currentUser?.id || showCamera || subscriptionLoading) {
        if (!currentUser?.id) Alert.alert("Error", "User information not available.");
        if (showCamera) Alert.alert("Action Blocked", "Please close the camera view first.");
        if (subscriptionLoading) Alert.alert("Please wait", "Subscription details are loading.");
        return;
    }
    if (!selectedHotelId) { Alert.alert('Validation Error', 'Please select a hotel.'); return; }
    if (!name.trim()) { Alert.alert('Validation Error', `Please enter a name for the ${type}.`); return; }
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) { Alert.alert('Validation Error', `Please enter a valid positive price.`); return; }
    if (!selectedImage) { Alert.alert('Validation Error', 'Please select or take an image.'); return; }

    // --- Subscription Limit Check ---
    if (typeof uploadLimit === 'number' && currentUser?.id) {
      try {
        const userId = currentUser.id;
        const { count: foodCount, error: foodCountError } = await supabase
          .from('food').select('*', { count: 'exact', head: true }).eq('business_id', userId);
        const { count: drinkCount, error: drinkCountError } = await supabase
          .from('drinks').select('*', { count: 'exact', head: true }).eq('business_id', userId);
        const { count: roomCount, error: roomCountError } = await supabase
          .from('rooms').select('*', { count: 'exact', head: true }).eq('business_id', userId);

        if (foodCountError || drinkCountError || roomCountError) {
          let errorMessages = [];
          if (foodCountError) errorMessages.push(`Food count: ${foodCountError.message}`);
          if (drinkCountError) errorMessages.push(`Drink count: ${drinkCountError.message}`);
          if (roomCountError) errorMessages.push(`Room count: ${roomCountError.message}`);
          Alert.alert("Error", "Could not verify your current upload count:\n" + errorMessages.join('\n'));
          return;
        }
        const uploadsSoFar = (foodCount ?? 0) + (drinkCount ?? 0) + (roomCount ?? 0);

        if (uploadsSoFar >= uploadLimit) {
          Alert.alert(
            "Upload Limit Reached",
            `You have ${uploadsSoFar} items and your plan's upload limit is ${uploadLimit}. Please upgrade your plan to add more.`,
            [
              { text: "OK" },
              { text: "Upgrade Plan", onPress: () => router.push('/upgradePlanScreen') }
            ]
          );
          return;
        }
      } catch (e: any) {
        Alert.alert("Error", "An unexpected error occurred while checking upload limits: " + e.message);
        return;
      }
    }
    // --- End Subscription Limit Check ---

    setIsSubmittingItem(true);
    const imageUrl = await uploadSelectedItemImage();
    if (!imageUrl) {
        setIsSubmittingItem(false);
        return;
    }

    const baseItemData = {
      business_id: currentUser.id, name: name.trim(), price: priceValue,
      image_url: imageUrl, hotel_id: selectedHotelId,
    };
    let tableName = ''; let payload: any = {};
    try {
        switch (type) {
          case 'food': tableName = 'food'; payload = { ...baseItemData }; break;
          case 'drink': tableName = 'drinks'; payload = { ...baseItemData }; break;
          case 'room': tableName = 'rooms'; payload = { business_id: baseItemData.business_id, hotel_id: baseItemData.hotel_id, room_type: baseItemData.name, price_per_night: baseItemData.price, image_url: baseItemData.image_url }; break;
          default: throw new Error('Invalid item type');
        }
        console.log(`🚀 Payload for Adding ${type}:`, payload);
        const { data, error } = await supabase.from(tableName).insert([payload]).select();
        if (error) { console.log(`🔥 SUPABASE ERROR (${type}):`, error.message); throw error; }
        console.log(`✅ ${type} inserted successfully:`, data);
        Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
        setName(''); setPrice(''); setSelectedImage(null); setUploadedImageUrl(null);
    } catch (error: any) {
        console.error(`❌ SUPABASE/JS ERROR (${type || 'unknown'}):`, error.message || 'Unknown error');
        Alert.alert(`Error Adding ${type.charAt(0).toUpperCase() + type.slice(1)}`, error.message || JSON.stringify(error, null, 2));
    } finally {
      setIsSubmittingItem(false);
    }
  };

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
            <TouchableOpacity style={[styles.cameraButton, styles.closeButton]} onPress={() => { setShowCamera(false); setIsCameraReady(false); }} disabled={uploadingImage || isSubmittingItem}>
              <Text style={styles.cameraButtonText} className="font-winky-regular">Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cameraButton, styles.captureButton]} onPress={takePicture} disabled={!isCameraReady || uploadingImage || isSubmittingItem}>
              <View style={styles.captureInnerButton} />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-[#E4EBE5] flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <View className="w-full justify-start items-center px-4 py-6">

          <Image source={OrdaLogo} className="w-20 h-20 mb-6" resizeMode="contain" />
          <Text className="text-2xl font-semibold text-gray-800 mb-2 text-center font-winky-regular">
            Add Food, Drinks, or Rooms
          </Text>

          {/* Subscription Info Display */}
          {subscriptionLoading && <ActivityIndicator style={{ marginVertical: 5 }} color="#16a34a" />}
          {!subscriptionLoading && plan && (
            <View className="my-2 p-2 bg-green-50 border border-green-200 rounded-md w-full items-center">
              <Text className="text-sm text-green-700 font-winky-regular">Current Plan: {plan}</Text>
              {typeof uploadLimit === 'number' && (
                <Text className="text-sm text-green-700 font-winky-regular">
                  Upload Limit: {uploadLimit === 99999 ? 'Unlimited' : uploadLimit} items
                </Text>
              )}
            </View>
          )}
          {/* End Subscription Info Display */}


          <View className="w-full mb-6">
            <Text className="text-base text-gray-600 mb-3 font-medium font-winky-regular">Select Your Hotel / Restaurant</Text>
            {loadingHotels ? ( <ActivityIndicator size="small" color="#16a34a" className="my-2" /> )
             : !currentUser ? ( <Text className="text-center text-gray-500 my-2 font-winky-regular">Loading user info...</Text> )
             : userHotels.length === 0 ? ( <Text className="text-center text-gray-500 my-2 font-winky-regular">No hotels found. Create one first.</Text> )
             : ( userHotels.map((hotel) => (
                    <TouchableOpacity
                        key={hotel.id}
                        onPress={() => {
                            if (selectedHotelId !== hotel.id) { setSelectedImage(null); setUploadedImageUrl(null); }
                            setSelectedHotelId(hotel.id);
                        }}
                        className={`p-3 mb-2 rounded-lg border ${ selectedHotelId === hotel.id ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-300' }`}
                        disabled={isSubmittingItem || uploadingImage || subscriptionLoading}
                    >
                        <Text className={`text-center font-winky-regular ${ selectedHotelId === hotel.id ? 'text-green-700 font-semibold' : 'text-gray-700' }`}>
                            {hotel.name} {hotel.location && `- ${hotel.location}`}
                        </Text>
                    </TouchableOpacity>
                ))
            )}
          </View>

          <View className={`w-full mb-6 ${!selectedHotelId ? 'opacity-50' : ''}`}>
            <Text className="text-base text-gray-600 mb-3 font-medium font-winky-regular">Select Item Type</Text>
            <View className="flex-row justify-around">
              {(['food', 'drink', 'room'] as ItemType[]).map((itemType) => (
                <TouchableOpacity
                  key={itemType}
                  className={`py-2 px-5 rounded-full border ${type === itemType ? 'bg-green-600 border-green-700' : 'bg-gray-200 border-gray-300'}`}
                  onPress={() => setType(itemType)}
                  disabled={isSubmittingItem || loadingHotels || uploadingImage || !selectedHotelId || subscriptionLoading}
                >
                  <Text className={`font-medium capitalize font-winky-regular ${type === itemType ? 'text-white' : 'text-gray-700'}`}>
                    {itemType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className={`w-full mb-6 ${!selectedHotelId ? 'opacity-50' : ''}`}>
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">
              {type === 'room' ? 'Room Type / Name' : `${type.charAt(0).toUpperCase() + type.slice(1)} Name`}
            </Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder={`Enter ${type} name`}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isSubmittingItem && !loadingHotels && !uploadingImage && !!selectedHotelId && !subscriptionLoading}
            />
          </View>

          <View className={`w-full mb-6 ${!selectedHotelId ? 'opacity-50' : ''}`}>
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">
              {type === 'room' ? 'Price Per Night' : 'Price'} (in your currency)
            </Text>
            <TextInput
              className="w-full h-14 px-4 bg-gray-100 border border-gray-300 rounded-lg focus:border-green-500 font-winky-regular"
              placeholder={type === 'room' ? 'e.g., 150.00' : 'e.g., 15.50'}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              editable={!isSubmittingItem && !loadingHotels && !uploadingImage && !!selectedHotelId && !subscriptionLoading}
            />
          </View>

          <View className={`w-full mb-6 ${!selectedHotelId ? 'opacity-50' : ''}`}>
            <Text className="text-base text-gray-600 mb-2 font-winky-regular">Item Image</Text>
            <View className="flex-row justify-between items-stretch mb-3">
              <TouchableOpacity
                className={`flex-1 justify-center items-center rounded-lg border border-dashed p-4 ${selectedImage || uploadingImage ? 'border-gray-300 bg-gray-50' : 'border-blue-400 bg-blue-50'} ${uploadingImage || isSubmittingItem || !selectedHotelId || subscriptionLoading ? 'opacity-50' : ''} mr-2`}
                onPress={pickImage}
                disabled={uploadingImage || isSubmittingItem || !selectedHotelId || subscriptionLoading}
              >
                {uploadingImage ? ( <ActivityIndicator size="small" color="#16a34a" /> ) : (
                  <View className="items-center">
                    <Image source={Icons.gallery} className="w-6 h-6 mb-1" resizeMode="contain" />
                    <Text className={`text-sm text-center font-winky-regular ${selectedImage || uploadingImage ? 'text-gray-600' : 'text-blue-600'}`}>
                      {selectedImage ? 'Change Image' : 'Select from Library'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 justify-center items-center rounded-lg border border-dashed p-4 ${selectedImage || uploadingImage ? 'border-gray-300 bg-gray-50' : 'border-purple-400 bg-purple-50'} ${uploadingImage || isSubmittingItem || !selectedHotelId || subscriptionLoading ? 'opacity-50' : ''} ml-2`}
                onPress={openCamera}
                disabled={uploadingImage || isSubmittingItem || !selectedHotelId || subscriptionLoading}
              >
                {uploadingImage ? ( <ActivityIndicator size="small" color="#16a34a" /> ) : (
                  <View className="items-center">
                    <Image source={Icons.camera} className="w-6 h-6 mb-1" resizeMode="contain" />
                    <Text className={`text-sm text-center font-winky-regular ${selectedImage || uploadingImage ? 'text-gray-600' : 'text-purple-600'}`}>
                      {selectedImage ? 'Retake Photo' : 'Take Photo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {selectedImage && (
              <View className="mt-4 items-center">
                <Image source={{ uri: selectedImage.uri }} className="w-48 h-36 rounded-lg border border-gray-300" resizeMode="cover" />
                 {!uploadedImageUrl && !uploadingImage && isSubmittingItem && (
                     <Text className="text-red-500 text-center mt-2 font-winky-regular">
                         Image upload failed during submission. Please try again.
                     </Text>
                 )}
              </View>
            )}
          </View>

          <TouchableOpacity
            className={`w-full h-14 justify-center items-center rounded-lg ${isSubmittingItem || loadingHotels || uploadingImage || !selectedHotelId || !selectedImage || !currentUser?.id || subscriptionLoading ? 'bg-gray-400' : 'bg-green-600'}`}
            onPress={handleAddItem}
            disabled={isSubmittingItem || loadingHotels || uploadingImage || !selectedHotelId || !selectedImage || !currentUser?.id || subscriptionLoading}
          >
            {isSubmittingItem || uploadingImage || subscriptionLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-lg font-bold uppercase font-winky-regular">Add {type}</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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

export default AddFoodRooms;
