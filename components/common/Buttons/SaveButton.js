import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import globalButton from '../../StyleSheet/Button';
import { AppColors } from '../../StyleSheet/Colors';

const SaveButton = ({ onPress, title = "Salvar", style, textStyle, disabled }) => {
  const baseButtonStyle = [
    globalButton.button,
    { backgroundColor: AppColors.success || AppColors.verdePrincipal },
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

export default SaveButton;