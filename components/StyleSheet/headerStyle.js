import { AppColors } from './Colors'; 

export const appHeaderStyle = {
  backgroundColor: AppColors.principal,
};

export const appHeaderTintColor = AppColors.textoPrincipal;

export const appHeaderTitleStyle = {
  fontWeight: 'bold',
  fontSize: 20,
};

export const defaultHeaderConfig = {
  headerStyle: appHeaderStyle,
  headerTintColor: appHeaderTintColor,
  headerTitleStyle: appHeaderTitleStyle,
};