import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { CameraScreen } from './src/screens/CameraScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScanEditScreen } from './src/screens/ScanEditScreen';
import { ViewerScreen } from './src/screens/ViewerScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home"     component={HomeScreen} />
        <Stack.Screen name="Camera"   component={CameraScreen} />
        <Stack.Screen name="ScanEdit" component={ScanEditScreen as any} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Viewer"   component={ViewerScreen as any} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
