import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

const Button = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    backgroundColor: AppColors.principal,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: AppColors.disabledBackground,
  },
  buttonText: {
    color: AppColors.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: AppColors.logoutRed,
  },
});

export default Button;
