import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from "expo-router"; // 1. Import useRouter
import { useEffect } from "react";
import { PaystackProvider } from 'react-native-paystack-webview'; // Import PaystackProvider
import "./globals.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// It's good practice to store your keys in a central config or environment variables
// For this example, we'll define it here.
const PAYSTACK_PUBLIC_KEY = 'pk_live_66319d6ff0dbf7aabd99f429c5ddf287beb9c9b6';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ // Capture font error too
    
    "WinkySans-Regular": require("@/assets/fonts/WinkySans-Regular.ttf"),
    "WinkySans-Medium": require("@/assets/fonts/WinkySans-Medium.ttf")
  });
  const router = useRouter(); // 2. Get the router instance

  useEffect(() => {
    // Handle font loading errors if needed
    if (fontError) {
      console.error("Font loading error:", fontError);
      // Hide splash screen even on error to prevent getting stuck
      SplashScreen.hideAsync();
      // Optionally navigate to an error screen or just proceed
      // For now, we'll still try to navigate to sign-in
      router.replace('/sign-in');
    }

    // When fonts are loaded successfully
    if (fontsLoaded) {
      SplashScreen.hideAsync(); // Hide the splash screen
      // 3. Redirect to the sign-in page immediately after hiding splash
      router.replace('/sign-in');
    }
  }, [fontsLoaded, fontError, router]); // 4. Add dependencies

  // If fonts are still loading and there's no error, return null to keep showing splash screen.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Once fonts are loaded (or error occurred), render the Stack navigator.
  // The useEffect above will have already triggered the navigation.
  return (
    <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaystackProvider>
  );
}
