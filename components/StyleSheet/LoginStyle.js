import { StyleSheet } from 'react-native';
import { AppColors } from './Colors'; 

const loginScreenStyles = StyleSheet.create({
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    marginTop: 5,
    paddingHorizontal: 5,
  },
  rememberMeText: {
    marginLeft: 10,
    fontSize: 16,
    color: AppColors.textoPrincipal,
  },
});

export default loginScreenStyles;