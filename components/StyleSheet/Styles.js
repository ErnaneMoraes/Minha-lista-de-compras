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
});

export default styles;
