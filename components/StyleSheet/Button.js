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
  buttonText: {
    color: AppColors.textoPrincipal,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Button;
