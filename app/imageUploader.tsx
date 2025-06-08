// 📁 UploadImageScreen.tsx

import { supabase } from '@/lib/supabase'; // Make sure this uses v1 client setup
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Button, Image, View } from 'react-native';

export default function UploadImageScreen() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const pickAndUploadImage = async () => {
    // Step 1: Pick an image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const filePath = `business/${Date.now()}-${file.fileName || 'image.jpg'}`;

    // Step 2: Upload to Supabase Storage (v1)
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('Upload error:', error.message);
      Alert.alert('Upload failed', error.message);
      return;
    }

    // Step 3: Construct public URL manually (v1 style)
    const { publicURL } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    setImageUrl(publicURL);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Pick & Upload Image" onPress={pickAndUploadImage} />

      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 200, height: 200, marginTop: 20 }}
        />
      )}
    </View>
  );
}
