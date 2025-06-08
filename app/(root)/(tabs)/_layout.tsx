// c:\Users\Lenovo\Desktop\Orda_Business_App\app\(root)\(tabs)\_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';

// Import your custom icons constant and the new icon
import Icons from '@/constants/Icons'; // Adjust path if necessary

const statisticsSalesIcon = require('@/assets/icons/statisticsSales.png');

// Define colors
const TAB_BAR_BACKGROUND = '#16a34a';
const FOCUSED_ICON_BACKGROUND = '#DFEBDD';
const FOCUSED_TINT_COLOR = '#10803a';
const INACTIVE_TINT_COLOR = '#FFFFFF';

// Helper component for rendering icons using Image
const TabIcon = ({
  iconSource,
  color,
  focused,
}: {
  iconSource: ImageSourcePropType;
  color: string;
  focused: boolean;
}) => {
  return (
    <View
      style={[
        styles.tabIconContainer,
        focused ? styles.tabIconContainerFocused : null,
      ]}
    >
      <Image
        source={iconSource}
        resizeMode="contain"
        tintColor={color}
        style={styles.tabIconImage}
      />
    </View>
  );
};

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: FOCUSED_TINT_COLOR,
        tabBarInactiveTintColor: INACTIVE_TINT_COLOR,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 80 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.HomeOutline}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="createHotel"
        options={{
          title: 'Create Hotel',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.createHotel}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="addFoodRooms"
        options={{
          title: 'Add Items',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.addItems}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="viewOrders"
        options={{
          title: 'View Orders',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.viewOrders}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="manageListing"
        options={{
          title: 'Manage Listings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.manageListings}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="statisticsSales"
        options={{
          title: 'Stats & Sales',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.statisticsSales || statisticsSalesIcon}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.profile}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'transparent',
    transform: [{ translateY: 0 }],
    minHeight: 40,
  },
  tabIconContainerFocused: {
    backgroundColor: FOCUSED_ICON_BACKGROUND,
    transform: [{ translateY: -8 }],
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  tabIconImage: {
    width: 26,
    height: 26,
  },
});

export default TabsLayout;
