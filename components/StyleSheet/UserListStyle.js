import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

const UserListStyle = StyleSheet.create({
  listScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppColors.inputBackground,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.darkText,
  },
  userIdText: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 4,
  },
  itemLogin: {
    fontSize: 14,
    color: AppColors.textoEscuro,
    marginTop: 4,
  },
  itemLevel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  itemActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  errorText: {
    color: AppColors.logoutRed,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorTextDetail: {
    color: AppColors.darkText,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  emptyText: {
    fontSize: 16,
    color: AppColors.textoEscuro,
  },
});

export default UserListStyle;