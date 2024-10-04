import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, Text, View, FlatList, TouchableOpacity, Alert, PermissionsAndroid, Modal } from 'react-native';
import axios from 'axios';
import BluetoothSerial from 'react-native-bluetooth-serial-next';
import { StyleSheet, TextInput } from 'react-native';

const FloatingLabelInput = ({ label, value, onChangeText }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, value ? styles.filled : null, isFocused || value ? styles.focused : null]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="numeric"
      />
      <Text style={[styles.label, isFocused || value ? styles.labelFocused : null]}>{label}</Text>
    </View>
  );
};

const PredictionApp = () => {
  const [pH, setPh] = useState('');
  const [CO3, setCO3] = useState('');
  const [salinity, setSalinity] = useState('');
  const [HCO3, setHCO3] = useState('');
  const [alkalinity, setAlkalinity] = useState('');
  const [hardness, setHardness] = useState('');
  const [caMgRatio, setCaMgRatio] = useState('');
  const [dissolvedOxygen, setDissolvedOxygen] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [disconnectedDevice, setDisconnectedDevice] = useState(null);

  useEffect(() => {
    requestBluetoothPermissions();
  }, []);

  const requestBluetoothPermissions = async () => {
    try {
      const grantedScan = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const grantedConnect = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);

      if (grantedScan === PermissionsAndroid.RESULTS.GRANTED && grantedConnect === PermissionsAndroid.RESULTS.GRANTED) {
        enableBluetoothAndDiscoverDevices();
      } else {
        Alert.alert('Permission Denied', 'Bluetooth permissions are required to use this feature.');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const enableBluetoothAndDiscoverDevices = async () => {
    await BluetoothSerial.enable();
    discoverDevices();
  };

  const discoverDevices = async () => {
    const availableDevices = await BluetoothSerial.list();
    setDevices(availableDevices);
    setModalVisible(true);
  };

  const connectToDevice = async (device) => {
    await BluetoothSerial.connect(device.id);
    setSelectedDevice(device);
    setConnected(true);
    setModalVisible(false);

    BluetoothSerial.withDelimiter('\n').then(() => {
      BluetoothSerial.on('read', (data) => {
        const [receivedTDS, receivedHardness, receivedSalinity, receivedPh] = data.data.split(',');
        console.log('Received Data:', receivedTDS, receivedHardness, receivedSalinity, receivedPh);

        if (receivedTDS && receivedHardness && receivedSalinity && receivedPh) {
          setCO3(receivedTDS.trim());
          setHardness(receivedHardness.trim());
          setSalinity(receivedSalinity.trim());
          setPh(receivedPh.trim());
        } else {
          console.error('Incomplete data received:', data);
        }
      });
    });
  };

  const disconnectFromDevice = async () => {
    await BluetoothSerial.disconnect();
    setDisconnectedDevice(selectedDevice.name);
    setConnected(false);
    setSelectedDevice(null);
  };

  const submitData = async () => {
    // Ensure all inputs are parsed to numbers
    const payload = {
      pH: parseFloat(pH),
      CO3: parseFloat(CO3),
      Salinity: parseFloat(salinity),
      HCO3: parseFloat(HCO3),
      Alkalinity: parseFloat(alkalinity),
      Hardness: parseFloat(hardness),
      'Ca:Mg Ratio': parseFloat(caMgRatio),
      'Dissolved Oxygen': parseFloat(dissolvedOxygen),
    };

    // Log the payload to ensure all data is correctly formatted
    console.log('Payload to API:', payload);

    try {
      const response = await axios.post('https://tricky-pants-melt.loca.lt/predict', payload);
      setPrediction(String(response.data.prediction));
    } catch (error) {
      Alert.alert('Prediction Error', error.message);
    }
  };

  const renderPredictionMessage = () => {
    if (prediction === '1') {
      return <Text style={styles.predictionTextSuccess}>Optimal Water Quality for Aquaculture.</Text>;
    } else if (prediction === '0') {
      return <Text style={styles.predictionTextError}>Not Optimal Water Quality for Aquaculture.</Text>;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Enter Water Quality Data</Text>
      
      {!connected ? (
        <>
          <Button title="Connect to Bluetooth" color="#00796b" onPress={discoverDevices} />
          {disconnectedDevice && <Text style={styles.disconnectedText}>Disconnected from: {disconnectedDevice}</Text>}
        </>
      ) : (
        <>
          <Button title={`Disconnect ${selectedDevice.name}`} color="#d32f2f" onPress={disconnectFromDevice} />
          <Text style={styles.connectedText}>Connected to: {selectedDevice.name}</Text>
        </>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderText}>Select a Bluetooth Device</Text>
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => connectToDevice(item)}>
                  <View style={styles.deviceItem}>
                    <Text style={styles.deviceText}>{item.name || 'Unknown Device'} ({item.id})</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

      <FloatingLabelInput label="pH" value={pH} onChangeText={setPh} />
      <FloatingLabelInput label="CO3" value={CO3} onChangeText={setCO3} />
      <FloatingLabelInput label="Salinity" value={salinity} onChangeText={setSalinity} />
      <FloatingLabelInput label="HCO3" value={HCO3} onChangeText={setHCO3} />
      <FloatingLabelInput label="Alkalinity" value={alkalinity} onChangeText={setAlkalinity} />
      <FloatingLabelInput label="Hardness" value={hardness} onChangeText={setHardness} />
      <FloatingLabelInput label="Ca:Mg Ratio" value={caMgRatio} onChangeText={setCaMgRatio} />
      <FloatingLabelInput label="Dissolved Oxygen" value={dissolvedOxygen} onChangeText={setDissolvedOxygen} />
      
      <Button title="Submit Data" color="#00796b" onPress={submitData} />
      {renderPredictionMessage()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f1f8e9',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  disconnectedText: {
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  connectedText: {
    textAlign: 'center',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    margin: 20,
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  deviceText: {
    fontSize: 16,
  },
  predictionTextSuccess: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  predictionTextError: {
    textAlign: 'center',
    fontSize: 16,
    color: '#f44336',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginVertical: 10,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#aaa',
    paddingVertical: 5,
    fontSize: 16,
  },
  focused: {
    borderBottomColor: '#00796b',
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 10,
    fontSize: 16,
    color: '#aaa',
    transition: '0.2s',
  },
  labelFocused: {
    top: -10,
    fontSize: 12,
    color: '#00796b',
  },
  filled: {
    borderBottomColor: '#00796b',
  },
});

export default PredictionApp;
