import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: AppColors.background,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textoEscuro,
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    color: AppColors.textMuted,
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: AppColors.inputBackground,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    borderRadius: 10,
    paddingHorizontal: 14,
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
