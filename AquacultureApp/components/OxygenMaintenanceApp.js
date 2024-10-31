import React, { useState, useEffect } from 'react';
import { SafeAreaView, TextInput, Button, Text, View, StyleSheet, Alert, PermissionsAndroid, Modal, FlatList, TouchableOpacity } from 'react-native';
import axios from 'axios';
import BluetoothSerial from 'react-native-bluetooth-serial-next';
import { Vibration } from 'react-native';


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

const OxygenMaintenanceApp = () => {
//   const [targetOxygenLevel, setTargetOxygenLevel] = useState('');
  const [currentOxygenLevel, setCurrentOxygenLevel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [oxygenPumpStatus, setOxygenPumpStatus] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [disconnectedDevice, setDisconnectedDevice] = useState(null);
  const oxygenThreshold = 7; // Minimum dissolved oxygen level
  const criticalThreshold = 4; // Dangerously low oxygen level

  useEffect(() => {
    requestBluetoothPermissions();
  }, []);

  useEffect(() => {
    if (currentOxygenLevel !== '') {
      checkOxygenLevel(parseFloat(currentOxygenLevel));
    }
  }, [currentOxygenLevel]);

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
        if (receivedOxygen) {
          setCurrentOxygenLevel(receivedOxygen.trim());
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

  const checkOxygenLevel = (oxygenLevel) => {
    if (oxygenLevel < criticalThreshold) {
      triggerAlarm('Oxygen level dangerously low! Immediate action required.');
      activateOxygenPump();
    } else if (oxygenLevel < oxygenThreshold) {
      setStatusMessage('Oxygen level low. Pump is regulating oxygen.');
      activateOxygenPump();
    } else {
      setStatusMessage('Oxygen levels are stable.');
      deactivateOxygenPump();
    }
  };

  const activateOxygenPump = () => {
    setOxygenPumpStatus(true);
    console.log('Oxygen Pump Activated for Aeration');
    setStatusMessage('Oxygen Pump is ON for aeration.');
  };

  const deactivateOxygenPump = () => {
    setOxygenPumpStatus(false);
    console.log('Oxygen Pump Deactivated');
    setStatusMessage('Oxygen Pump is OFF.');
  };

  const triggerAlarm = (message) => {
    if (!alarmTriggered) {
      setAlarmTriggered(true);
      Alert.alert('Alarm', message);
      setStatusMessage(message);
      Vibration.vibrate(); 
    }
  };

  const resetAlarm = () => {
    setAlarmTriggered(false);
    setStatusMessage('Alarm reset.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Oxygen Maintenance</Text>

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

      {/* <FloatingLabelInput label="Target Oxygen Level" value={targetOxygenLevel} onChangeText={setTargetOxygenLevel} /> */}
      <FloatingLabelInput label="Current Oxygen Level" value={currentOxygenLevel} onChangeText={setCurrentOxygenLevel} />
      
      <Text style={styles.statusText}>{statusMessage}</Text>

      <Button title="Check Oxygen Level" color="#00796b" onPress={() => checkOxygenLevel(parseFloat(currentOxygenLevel))} />

      {alarmTriggered && (
  <View style={{ marginTop: 20 }}>
    <Button title="Reset Alarm" color="#d32f2f" onPress={resetAlarm} />
  </View>
)}
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
  },
  deviceText: {
    color: '#00796b',
  },
  inputContainer: {
    marginVertical: 10,
    position: 'relative',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#00796b',
    paddingLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filled: {
    color: '#00796b',
  },
  focused: {
    borderColor: '#00796b',
  },
  label: {
    position: 'absolute',
    left: 10,
    top: 15,
    fontSize: 16,
    color: '#aaa',
    transition: 'all 0.2s',
  },
  labelFocused: {
    top: 0,
    left: 10,
    fontSize: 12,
    color: '#00796b',
  },
  statusText: {
    textAlign: 'center',
    color: '#d32f2f',
    fontWeight: 'bold',
    marginBottom:10
  },
});

export default OxygenMaintenanceApp;
