import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

const AddUserFormStyle = StyleSheet.create({
  formBlockContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    color: AppColors.darkText,
    marginBottom: 8,
  },
  pickerWrapper: {
    width: '100%',
    height: 50,
    backgroundColor: AppColors.inputBackground,
    borderWidth: 1,
    borderColor: AppColors.borderColor,
    borderRadius: 8,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '130%',
    color: AppColors.textoEscuro,
  },
});

export default AddUserFormStyle;