import { StyleSheet } from 'react-native';
import { AppColors } from './Colors';

    const ModalStyle = StyleSheet.create({
    modalCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        maxWidth: 460,
        maxHeight: '85%',
        backgroundColor: AppColors.inputBackground, 
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: AppColors.darkText,
    },
    modalText: {
        fontSize: 16,
        color: AppColors.textoEscuro,
        textAlign: 'center',
    },
    modalInputContainer: { 
        width: '100%',
        marginBottom: 15,
    },
    modalLabel: {
        fontSize: 16,
        color: AppColors.darkText,
        marginBottom: 5,
    },
    modalPickerWrapper: { 
        width: '100%',
        height: 50,
        backgroundColor: AppColors.inputBackground,
        borderWidth: 1,
        borderColor: AppColors.borderColor,
        borderRadius: 8,
        justifyContent: 'center',
    },
    modalPicker: {
        width: '100%',
        height: '130%',
        color: AppColors.textoEscuro,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 5,
    }
});

export default ModalStyle;