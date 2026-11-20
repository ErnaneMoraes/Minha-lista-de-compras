 import { StyleSheet } from 'react-native';
 import { AppColors } from './Colors';
 
 const Button = StyleSheet.create({ 
  button: {
    width: '100%',
    height: 50,
    backgroundColor: AppColors.verdePrincipal,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  buttonErnane: {
    backgroundColor: AppColors.principal,
  },
  buttonDisabled: {
    backgroundColor: AppColors.disabledBackground,
  },
  buttonText: {
    color: AppColors.textoPrincipal,
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: AppColors.logoutRed,
  }
  });

export default Button;