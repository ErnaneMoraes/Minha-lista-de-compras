  import React, { useEffect, useState, useCallback } from 'react';
  import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    Button,
    TouchableOpacity,
    Alert,
  } from 'react-native';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { FontAwesome6 } from '@expo/vector-icons';
  import { AppColors } from '../../../components/StyleSheet/Colors';
  import { API_URL } from '../../api/Api';
  import UserListStyle from '../../../components/StyleSheet/UserListStyle';
  import DeleteUserModal from '../../../components/modals/UserModals/DeleteUserModal';
  import EditUserModal from '../../../components/modals/UserModals/EditUserModal';

  const getNivelAcessoNome = (nivel) => {
    switch (nivel) {
      case 1: return 'Administrador';
      case 2: return 'Supervisor';
      case 3: return 'Vendedor';
      default: return `Nível ${nivel}`;
    }
  };

  const niveisAcessoOptionsConst = [
    { label: 'Vendedor', value: '3' },
    { label: 'Supervisor', value: '2' },
    { label: 'Administrador', value: '1' },
  ];

  export default function UserList({ navigation }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const fetchUsers = useCallback(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) {
          setError('Autenticação necessária. Por favor, faça login.');
          setIsLoading(false);
          return;
        }
        const response = await fetch(`${API_URL}/usuarios`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'x-access-token': userToken },
        });
        if (!response.ok) {
          let errorData = { message: `Erro ${response.status}` };
          try {
            const responseText = await response.text();
            if (responseText) { errorData = JSON.parse(responseText); }
            if (response.status === 401 || response.status === 403) {
              await AsyncStorage.removeItem('userToken');
              setError(errorData.message || 'Sessão inválida ou expirada. Faça login novamente.');
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            errorData.message = response.statusText || `Erro ${response.status} ao buscar usuários.`;
          }
          throw new Error(errorData.message);
        }
        const data = await response.json();
        setUsers(data);
      } catch (e) {
        console.error("Erro ao buscar usuários:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      const unsubscribe = navigation.addListener('focus', fetchUsers);
      fetchUsers();
      return unsubscribe;
    }, [fetchUsers, navigation]);

    const handleOpenEditModal = (user) => {
      setEditingUser(user);
      setIsEditModalVisible(true);
    };

    const handleCloseEditModal = () => {
      setIsEditModalVisible(false);
      setEditingUser(null);
    };

    const handleEditSuccess = () => {
      handleCloseEditModal();
      fetchUsers();
    };

    const openDeleteModal = (user) => {
      setUserToDelete({ id: user.ID_USUARIO_PK, nome: user.NOME });
      setIsDeleteModalVisible(true);
    };

    const closeDeleteModal = () => {
      setIsDeleteModalVisible(false);
      setUserToDelete(null);
    };

    const handleDeletionSuccess = () => {
      closeDeleteModal();
      fetchUsers();
    };

    const renderUserItem = ({ item }) => {
      const nomeNivelAcesso = getNivelAcessoNome(item.NIVEL_ACESSO);
      return (
        <View style={UserListStyle.itemContainer}>
          <View style={UserListStyle.userInfoContainer}>
            <Text style={UserListStyle.itemName}>{item.NOME}</Text>
            <Text style={UserListStyle.userIdText}>ID: {item.ID_USUARIO_PK}</Text>
            <Text style={UserListStyle.itemLogin}>Login: {item.LOGIN}</Text>
            <Text style={UserListStyle.itemLevel}>Nível de acesso: {nomeNivelAcesso}</Text>
          </View>
          <View style={UserListStyle.itemActionsContainer}>
            <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={UserListStyle.iconButton}>
              <FontAwesome6 name="edit" size={22} color={AppColors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openDeleteModal(item)} style={[UserListStyle.iconButton, { marginLeft: 12 }]}>
              <FontAwesome6 name="trash-can" size={22} color={AppColors.logoutRed} />
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    if (isLoading && !isEditModalVisible && !isDeleteModalVisible) {
      return (
        <View style={UserListStyle.centeredContainer}>
          <ActivityIndicator size="large" color={AppColors.principal} />
          <Text style={{ marginTop: 10 }}>Carregando usuários...</Text>
        </View>
      );
    }

    if (error && !isEditModalVisible && !isDeleteModalVisible) {
      return (
        <View style={UserListStyle.centeredContainer}>
          <Text style={UserListStyle.errorText}>Falha ao carregar usuários</Text>
          <Text style={UserListStyle.errorTextDetail}>{error}</Text>
          <View style={{ marginTop: 20, width: '80%' }}>
            <Button title="Tentar Novamente" onPress={fetchUsers} color={AppColors.principal} />
          </View>
          {(error.toLowerCase().includes('autenticação') || error.toLowerCase().includes('sessão') || error.toLowerCase().includes('token')) && (
            <View style={{ marginTop: 10, width: '80%' }}>
              <Button title="Fazer Login" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })} color={AppColors.verdePrincipal} />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={UserListStyle.listScreenContainer}>
        {users.length === 0 && !isLoading && !isEditModalVisible && !isDeleteModalVisible ? (
          <View style={UserListStyle.centeredContainer}>
            <Text style={UserListStyle.emptyText}>Nenhum usuário encontrado.</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.ID_USUARIO_PK.toString()}
            style={UserListStyle.list}
            contentContainerStyle={{ paddingBottom: 20 }}
            extraData={users}
          />
        )}

        {editingUser && (
          <EditUserModal
            visible={isEditModalVisible}
            userToEdit={editingUser}
            niveisAcessoOptions={niveisAcessoOptionsConst}
            onClose={handleCloseEditModal}
            onSaveSuccess={handleEditSuccess}
          />
        )}

        {userToDelete && (
          <DeleteUserModal
            visible={isDeleteModalVisible}
            onClose={closeDeleteModal}
            userIdToDelete={userToDelete.id}
            userNameToDelete={userToDelete.nome}
            onDeletionSuccess={handleDeletionSuccess}
          />
        )}
      </View>
    );
  }