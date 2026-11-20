import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: AppColors.principal,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: AppColors.textoPrincipal,
    marginBottom: 40,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: AppColors.textoClaro,
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: AppColors.inputBackground,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: AppColors.textoEscuro,
  },  
  logoutContainer: {
    width: '100%',
  },
});

export const customHeaderStyle = {
  backgroundColor: AppColors.primary, 
};

export default styles;