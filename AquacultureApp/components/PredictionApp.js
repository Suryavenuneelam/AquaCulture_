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
  const [CO3, setCO3] = useState('10'); // Hardcoded value
  const [salinity, setSalinity] = useState('');
  const [HCO3, setHCO3] = useState('120'); // Hardcoded value
  const [alkalinity, setAlkalinity] = useState('120'); // Hardcoded value
  const [hardness, setHardness] = useState('');
  const [caMgRatio, setCaMgRatio] = useState('0.30'); // Hardcoded value
  const [dissolvedOxygen, setDissolvedOxygen] = useState('');
  const [TDS, setTDS] = useState('');
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
        const [receivedTDS, receivedHardness, receivedSalinity, receivedOxygen, receivedPh] = data.data.split(',');
        if (receivedPh && receivedOxygen && receivedTDS && receivedHardness && receivedSalinity) {
          setPh(receivedPh.trim());
          setDissolvedOxygen(receivedOxygen.trim());
          setTDS(receivedTDS.trim());
          setHardness(receivedHardness.trim());
          setSalinity(receivedSalinity.trim());
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

    try {
      const response = await axios.post('https://chubby-clocks-own.loca.lt/predict', payload);
      setPrediction(String(response.data.prediction));
    } catch (error) {
      Alert.alert('Prediction Error', 'Failed to get prediction from server.');
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
      <FloatingLabelInput label="TDS" value={TDS} onChangeText={setTDS} />
      
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
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  modalHeaderText: {
    color: 'black',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deviceItem: {
    padding: 10,
    backgroundColor: '#ddd',
    marginVertical: 5,
    borderRadius: 5,
  },
  deviceText: {
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 5,
    fontSize: 16,
  },
  filled: {
    color: '#00796b',
  },
  focused: {
    borderBottomColor: '#00796b',
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 5,
    fontSize: 16,
    color: '#aaa',
  },
  labelFocused: {
    top: -20,
    fontSize: 12,
    color: '#00796b',
  },
  predictionTextSuccess: {
    textAlign: 'center',
    color: '#388e3c',
    fontWeight: 'bold',
    marginTop: 20,
  },
  predictionTextError: {
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default PredictionApp;
