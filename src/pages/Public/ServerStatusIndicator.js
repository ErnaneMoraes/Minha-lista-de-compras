import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { API_URL } from '../../api/Api';
import { AppColors } from '../../../components/StyleSheet/Colors';

const ServerStatusIndicator = () => {
  const [apiStatus, setApiStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [isLoadingAPI, setisLoadingAPI] = useState(false);

  const checkServerStatus = useCallback(async () => {
    setisLoadingAPI(true);
    try {
      const response = await fetch(`${API_URL}/status`);
      const data = await response.json();

      setApiStatus(data.api === true);
      setDbStatus(data.db === true);
    } catch (error) {
      console.error("Erro ao verificar o status do servidor:", error);
      setApiStatus(false);
      setDbStatus(false);
    } finally {
      setisLoadingAPI(false);
    }
  }, []);

  useEffect(() => {
  checkServerStatus();
}, [checkServerStatus]);

  const getStatusStyle = (status) => {
    if (status === null) {
      return styles.statusIndicatorPending;
    }
    return status ? styles.statusIndicatorOnline : styles.statusIndicatorOffline;
  };

  return (
    <View style={styles.container}>
      {isLoadingAPI ? (
        <ActivityIndicator size="large" color={AppColors.textoClaro || '#333'} />
      ) : (
        <>
          <View style={styles.statusItem}>
            <View style={[styles.indicatorDot, getStatusStyle(apiStatus)]} />
            <Text style={styles.statusText}>API</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.indicatorDot, getStatusStyle(dbStatus)]} />
            <Text style={styles.statusText}>Banco de Dados</Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    margin: 30,
    minHeight: 50,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  indicatorDot: {
    width: 15,
    height: 15,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 0,
    borderColor: AppColors.borderColor || '#ccc',
  },
  statusIndicatorOnline: {
    backgroundColor: AppColors.verdePrincipal || '#00FF00',
  },
  statusIndicatorOffline: {
    backgroundColor: AppColors.logoutRed || '#FF0000',
  },
  statusIndicatorPending: {
    backgroundColor: AppColors.disabledBackground || '#FFA500',
  },
  statusText: {
    fontSize: 19,
    color: AppColors.textoClaro || '#333'
  },
});

export default ServerStatusIndicator;