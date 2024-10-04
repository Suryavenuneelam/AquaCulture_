import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaView, Button, View, Text, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import PredictionApp from './components/PredictionApp'; 
import OxygenMaintenanceApp from './components/OxygenMaintenanceApp'; 

const Stack = createStackNavigator();

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('./assets/aquaculture-background.jpg')} // Use an appropriate background image
        style={styles.backgroundImage}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome to Aquaculture Management System</Text>
        
        <View style={styles.buttonContainer}>
          <Button title="Water Quality Prediction" color="#00796b" onPress={() => navigation.navigate('PredictionApp')} />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button title="Oxygen Maintenance System" color="#00796b" onPress={() => navigation.navigate('OxygenMaintenanceApp')} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PredictionApp" component={PredictionApp} />
        <Stack.Screen name="OxygenMaintenanceApp" component={OxygenMaintenanceApp} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.7, 
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#000', 
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  buttonContainer: {
    marginBottom: 20,
    width: '80%',
  },
  button: {
    backgroundColor: '#00796b', 
    borderRadius: 5,
  },
});

export default App;
