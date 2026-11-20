import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import globalButton, { Button } from '../../StyleSheet/Button';
import { AppColors } from '../../StyleSheet/Colors';


const CancelButton = ({ onPress, title = "Cancelar", style, textStyle, disabled }) => {
  const baseButtonStyle = [
    globalButton.button,
    { backgroundColor: AppColors.principal }, 
  ];

  const baseTextStyle = globalButton.buttonText;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[baseButtonStyle, style]}
      disabled={disabled}
    >
      <Text style={[baseTextStyle, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default CancelButton;